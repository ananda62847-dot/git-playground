// AI auto-drafts a completed_works row from a resolved problem.
// Pulls problem + latest update with before/after photos, asks Gemini to polish title/description,
// inserts a draft row (published=false) for admin review.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { problem_id, ticket_no } = await req.json().catch(() => ({}));
    if (!problem_id && !ticket_no) {
      return new Response(JSON.stringify({ error: "problem_id or ticket_no required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Look up the problem
    let q = supabase.from("problems").select("*");
    q = problem_id ? q.eq("id", problem_id) : q.eq("ticket_no", ticket_no);
    const { data: problem, error: pErr } = await q.maybeSingle();
    if (pErr || !problem) {
      return new Response(JSON.stringify({ error: pErr?.message || "problem not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify it's actually completed
    const RESOLVED = ["resolved", "completed", "citizen_confirmed"];
    if (!RESOLVED.includes(problem.status)) {
      return new Response(JSON.stringify({ error: `Problem status is "${problem.status}" — must be resolved/completed first` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pull before/after media
    const { data: updates } = await supabase.from("problem_updates")
      .select("*").eq("problem_id", problem.id).order("created_at", { ascending: false });
    const afterUpd = updates?.find((u) => u.after_url);
    const beforeUpd = updates?.find((u) => u.before_url);

    // Original report photos
    const { data: media } = await supabase.from("problem_media")
      .select("*").eq("problem_id", problem.id);
    const reportImg = media?.find((m) => m.media_type === "image" && !m.is_after_proof);

    const before_image_url = beforeUpd?.before_url || reportImg?.url || null;
    const after_image_url = afterUpd?.after_url || null;
    const cover_image_url = after_image_url || before_image_url;

    // Ask AI to polish title + description for a public-facing completed-work card
    let title = problem.title;
    let description = problem.description;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY) {
      const ctx = {
        original_title: problem.title,
        original_description: problem.description,
        category: problem.category,
        department: problem.department,
        location: [problem.area, problem.constituency, problem.city].filter(Boolean).join(", "),
        reported_at: problem.created_at,
        resolved_at: problem.resolved_at,
        has_before: !!before_image_url,
        has_after: !!after_image_url,
      };
      const system = `Rewrite a Tamil Nadu citizen grievance into a polished, public-facing COMPLETED-WORK announcement.
Tone: confident, factual, civic, not boastful. Mention the location and what was fixed.
Use tool 'completed_work' to return JSON with: title (max 80 chars), description (3-5 sentences, plain text, no markdown).`;
      try {
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: system },
              { role: "user", content: JSON.stringify(ctx) },
            ],
            tools: [{
              type: "function",
              function: {
                name: "completed_work",
                description: "Return polished announcement",
                parameters: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                  },
                  required: ["title", "description"],
                  additionalProperties: false,
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "completed_work" } },
          }),
        });
        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const args = aiData?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
          if (args) {
            const parsed = JSON.parse(args);
            if (parsed.title) title = String(parsed.title).slice(0, 120);
            if (parsed.description) description = String(parsed.description);
          }
        }
      } catch (e) {
        console.error("ai polish failed", e);
      }
    }

    const insertRow = {
      title,
      description,
      cover_image_url,
      before_image_url,
      after_image_url,
      gallery_urls: [
        ...(reportImg?.url && reportImg.url !== before_image_url ? [reportImg.url] : []),
        ...(media || []).filter((m: any) => m.media_type === "image" && m.url !== before_image_url && m.url !== after_image_url).map((m: any) => m.url),
      ].slice(0, 8),
      category: problem.category,
      department: problem.department,
      city: problem.city,
      constituency: problem.constituency,
      area: problem.area,
      completed_on: problem.resolved_at ? new Date(problem.resolved_at).toISOString().slice(0, 10) : null,
      reviews: [],
      highlight: false,
      published: false, // DRAFT — admin reviews then publishes
    };

    const { data: inserted, error: insErr } = await supabase
      .from("completed_works").insert(insertRow).select("*").maybeSingle();
    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ work: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
