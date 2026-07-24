// AI action-plan generator: takes a problem/welfare/corruption row,
// returns 3-5 concrete steps + responsible department. Caches result on the row.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TABLES = {
  problem: "problems",
  welfare: "welfare_issues",
  corruption: "corruption_reports",
} as const;

type Kind = keyof typeof TABLES;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const kind = body.kind as Kind;
    const id = body.id as string;
    const force = !!body.force;
    if (!kind || !TABLES[kind] || !id) {
      return new Response(JSON.stringify({ error: "kind and id are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const table = TABLES[kind];
    const { data: row, error: rowErr } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
    if (rowErr || !row) {
      return new Response(JSON.stringify({ error: rowErr?.message || "not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return cached plan if fresh and not forced
    if (!force && row.ai_action_plan) {
      return new Response(JSON.stringify({ plan: row.ai_action_plan, cached: true, at: row.ai_action_plan_at }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ctx = kind === "problem" ? {
      title: row.title, description: row.description, category: row.category,
      department: row.department, location: [row.area, row.constituency, row.city].filter(Boolean).join(", "),
      urgency: row.urgency,
    } : kind === "welfare" ? {
      title: row.title, description: row.description, scheme: row.scheme_type, subcategory: row.subcategory,
      department: row.department, location: [row.area, row.constituency, row.city].filter(Boolean).join(", "),
      urgency: row.urgency, months_pending: row.months_pending,
    } : {
      description: row.description, department: row.department, type: row.incident_type,
      location: [row.office_location, row.area, row.constituency, row.city].filter(Boolean).join(", "),
      amount: row.amount_demanded,
    };

    const system = `You are an experienced public-grievance officer in Tamil Nadu, India.
Given a citizen report, produce a concrete, prioritised ACTION PLAN for the assigned cadre/officer.
Format strictly as markdown:
**Responsible:** <department or office>
**Estimated time:** <hours or days>
**Steps:**
1. <action> — <who> — <expected outcome>
2. ...
(3 to 5 steps total. Be specific to the issue, not generic. Mention exact dept contacts/forms when relevant.)`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Report type: ${kind}\n${JSON.stringify(ctx, null, 2)}` },
        ],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      return new Response(JSON.stringify({ error: `AI error ${aiRes.status}: ${t}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const plan = aiData?.choices?.[0]?.message?.content?.trim();
    if (!plan) {
      return new Response(JSON.stringify({ error: "Empty AI response" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from(table).update({ ai_action_plan: plan, ai_action_plan_at: new Date().toISOString() }).eq("id", id);

    return new Response(JSON.stringify({ plan, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
