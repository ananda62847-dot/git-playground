// AI evidence scorer — rates a single uploaded image on relevance/clarity/authenticity (0-10).
// Append-only history: every call inserts a new row in public.evidence_scores.
// Pass { force: true } or { run_reason: 'manual_rerun' | 'context_changed' } to log a re-run.
// Without `force`, the latest row (if <24h old) is returned cached.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limit (per instance): 30 calls / 60s per user
const RL = new Map<string, number[]>();
function rateLimited(key: string, max = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (RL.get(key) || []).filter(t => now - t < windowMs);
  if (arr.length >= max) { RL.set(key, arr); return true; }
  arr.push(now); RL.set(key, arr); return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    // ---- Auth required ----
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const sbu = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: claims, error: authErr } = await sbu.auth.getClaims(auth.slice(7));
    if (authErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const triggered_by_user_id: string = claims.claims.sub as string;

    if (rateLimited(`ai-score:${triggered_by_user_id}`)) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const file_url: string = body.file_url;
    const mime_type: string = (body.mime_type ?? "").toString();
    const entity_type: string = body.entity_type ?? "problem";
    const entity_id: string | null = body.entity_id ?? null;
    const context_text: string = (body.context_text ?? "").toString().slice(0, 2000);
    const uploaded_by_cadre_id: string | null = body.uploaded_by_cadre_id ?? null;
    const force: boolean = !!body.force;
    const run_reason: string = body.run_reason ?? (force ? "manual_rerun" : "initial");

    if (!file_url || typeof file_url !== "string" || !/^https?:\/\//.test(file_url)) {
      return new Response(JSON.stringify({ error: "valid file_url required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const urlLower = file_url.toLowerCase().split("?")[0];
    const isPdf = mime_type === "application/pdf" || /\.pdf$/.test(urlLower);
    const isVideo = mime_type.startsWith("video/") || /\.(mp4|webm|mov|m4v)$/.test(urlLower);
    const isImage = !isPdf && !isVideo;

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (!force) {
      const { data: latest } = await sb.from("evidence_scores")
        .select("*").eq("file_url", file_url)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (latest && (Date.now() - new Date(latest.created_at).getTime()) < 24 * 3600_000) {
        return new Response(JSON.stringify({ cached: true, score: latest }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "no API key" }), { status: 500, headers: corsHeaders });
    }

    const prompt = `You are an evidence verifier for a citizen-grievance platform.
CONTEXT: ${context_text || "(no context provided)"}
The file below (${isPdf ? "a PDF document" : isVideo ? "a short video clip" : "an image"}) was uploaded as proof. Use tool 'score_evidence' to rate it on a 0-10 scale.
- relevance: does it match the described issue?
- clarity: is the content sharp, readable / well-lit / audible?
- authenticity: does it look like a real on-site capture (no obvious reuse/edit)?
- overall_score: weighted summary (0-10, one decimal).
- context_summary: one sentence describing what's visible / documented.
- remarks: one short actionable note for the reviewer.`;

    // Build the multimodal content block. Images and videos are passed by URL (Gemini fetches).
    // PDFs are fetched and inlined as a data-URL file block so the model can read the text.
    let userContent: any[] = [{ type: "text", text: prompt }];
    try {
      if (isPdf) {
        const pdfRes = await fetch(file_url);
        if (pdfRes.ok) {
          const buf = new Uint8Array(await pdfRes.arrayBuffer());
          let bin = "";
          for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
          const b64 = btoa(bin);
          const filename = decodeURIComponent(file_url.split("/").pop() || "evidence.pdf");
          userContent.push({ type: "file", file: { filename, file_data: `data:application/pdf;base64,${b64}` } });
        } else {
          userContent.push({ type: "text", text: `PDF URL (could not fetch, score by filename only): ${file_url}` });
        }
      } else {
        userContent.push({ type: "image_url", image_url: { url: file_url } });
      }
    } catch (_e) {
      userContent.push({ type: "image_url", image_url: { url: file_url } });
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: isPdf ? "openai/gpt-5.5" : "google/gemini-2.5-flash",
        messages: [{ role: "user", content: userContent }],
        tools: [{
          type: "function",
          function: {
            name: "score_evidence",
            parameters: {
              type: "object",
              properties: {
                relevance: { type: "number" },
                clarity: { type: "number" },
                authenticity: { type: "number" },
                overall_score: { type: "number" },
                context_summary: { type: "string" },
                remarks: { type: "string" },
              },
              required: ["relevance", "clarity", "authenticity", "overall_score", "context_summary", "remarks"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "score_evidence" } },
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return new Response(JSON.stringify({ error: "ai failed", status: res.status, body: txt }), {
        status: 500, headers: corsHeaders,
      });
    }
    const data = await res.json();
    const args = JSON.parse(data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}");

    const row = {
      file_url,
      entity_type,
      entity_id,
      relevance: Number(args.relevance ?? 0),
      clarity: Number(args.clarity ?? 0),
      authenticity: Number(args.authenticity ?? 0),
      overall_score: Number(args.overall_score ?? 0),
      context: String(args.context_summary ?? ""),
      remarks: String(args.remarks ?? ""),
      model: isPdf ? "openai/gpt-5.5" : "google/gemini-2.5-flash",
      uploaded_by_cadre_id,
      run_reason,
      triggered_by_user_id,
    };
    const { data: inserted, error } = await sb.from("evidence_scores").insert(row).select().maybeSingle();
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ cached: false, score: inserted ?? row }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message }), { status: 500, headers: corsHeaders });
  }
});
