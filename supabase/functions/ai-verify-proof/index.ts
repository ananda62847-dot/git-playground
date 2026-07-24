// AI proof verification — compares before/after photos using Gemini multimodal.
// Flags suspicious or unrelated proofs as needs_review in ai_decisions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { problem_update_id } = await req.json();
    if (!problem_update_id) return new Response(JSON.stringify({ error: "problem_update_id required" }), { status: 400, headers: corsHeaders });

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: upd } = await sb.from("problem_updates").select("*, problem:problems(title,description,category)").eq("id", problem_update_id).maybeSingle();
    if (!upd?.before_url || !upd?.after_url) {
      return new Response(JSON.stringify({ skipped: true, reason: "missing before/after" }), { headers: corsHeaders });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ skipped: true, reason: "no API key" }), { headers: corsHeaders });

    const prompt = `You are inspecting proof photos for a citizen grievance.
ISSUE: ${upd.problem?.title}
CATEGORY: ${upd.problem?.category}
Compare BEFORE and AFTER images. Use tool 'verify_proof' to return:
- looks_resolved (bool)
- same_location (bool)
- confidence (0-100)
- concerns (string, short)`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: upd.before_url } },
          { type: "image_url", image_url: { url: upd.after_url } },
        ] }],
        tools: [{ type: "function", function: {
          name: "verify_proof",
          parameters: { type: "object", properties: {
            looks_resolved: { type: "boolean" }, same_location: { type: "boolean" },
            confidence: { type: "number" }, concerns: { type: "string" },
          }, required: ["looks_resolved","same_location","confidence","concerns"] },
        }}],
        tool_choice: { type: "function", function: { name: "verify_proof" } },
      }),
    });
    if (!res.ok) return new Response(JSON.stringify({ error: "ai failed", status: res.status }), { status: 500, headers: corsHeaders });

    const data = await res.json();
    const args = JSON.parse(data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}");

    const status = (args.looks_resolved && args.same_location && args.confidence >= 70) ? "auto_applied" : "needs_review";
    await sb.from("ai_decisions").insert({
      agent_type: "verify_proof", entity_type: "problem", entity_id: upd.problem_id, action: "proof_verified",
      reason: args.concerns || (args.looks_resolved ? "Proof looks valid" : "Proof needs human review"),
      status, confidence: Math.round(args.confidence ?? 0),
      metadata: { problem_update_id, ...args },
      applied_at: status === "auto_applied" ? new Date().toISOString() : null,
    });

    return new Response(JSON.stringify({ status, ...args }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message }), { status: 500, headers: corsHeaders });
  }
});
