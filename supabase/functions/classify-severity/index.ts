// Lovable AI severity classification for new problem reports.
// Public function (verify_jwt = false). Uses LOVABLE_API_KEY (preconfigured).
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

interface Body { title: string; description: string; department?: string; urgency?: string; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { title, description, department, urgency }: Body = await req.json();
    if (!title || !description) {
      return new Response(JSON.stringify({ error: "title & description required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You classify Tamil/English public grievances. Return STRICT JSON only with keys: severity (low|normal|high|critical), sentiment (anger|frustration|trust|urgency|hope|satisfaction|neutral), is_emergency (boolean), suggested_department (string or null), reason (one short sentence)." },
          { role: "user", content: `Title: ${title}\nDescription: ${description}\nReported department: ${department || 'unknown'}\nUser urgency: ${urgency || 'medium'}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: "ai_failed", detail: t }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const j = await r.json();
    let parsed: any = {};
    try { parsed = JSON.parse(j?.choices?.[0]?.message?.content || "{}"); } catch { parsed = {}; }
    return new Response(JSON.stringify(parsed),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
