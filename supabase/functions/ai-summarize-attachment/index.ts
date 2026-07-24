import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// per-user rate limit (in-memory; resets on cold start)
const rl = new Map<string, { c: number; t: number }>();
const LIMIT = 20;
const WINDOW = 60_000;
function rateLimited(uid: string) {
  const now = Date.now();
  const v = rl.get(uid);
  if (!v || now - v.t > WINDOW) { rl.set(uid, { c: 1, t: now }); return false; }
  v.c++; return v.c > LIMIT;
}

const ALLOWED_MIME = /^(image\/(png|jpe?g|webp|gif)|application\/pdf|audio\/(mpeg|wav|webm|mp4|ogg))$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);
    if (rateLimited(user.id)) return json({ error: "Rate limit exceeded. Try again in a minute." }, 429);

    const body = await req.json().catch(() => ({}));
    const file_url = String(body?.file_url || "").trim();
    const mime = String(body?.mime || "").trim();
    const context = String(body?.context || "").slice(0, 1500);

    if (!/^https:\/\/.+/i.test(file_url)) return json({ error: "Invalid file_url" }, 400);
    if (mime && !ALLOWED_MIME.test(mime)) return json({ error: "Unsupported mime" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    const isImage = mime.startsWith("image/") || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(file_url);
    const isPdf = mime === "application/pdf" || /\.pdf(\?|$)/i.test(file_url);

    const userContent: any[] = [
      { type: "text", text:
        `You are reviewing an attachment a TVK cadre received for an AI inbox task.\n` +
        `Task context: ${context || "(none)"}\n\n` +
        `Summarize the attachment in ≤60 words, list 2–4 key points, suggest one short action the cadre should take, ` +
        `and give a confidence 0–1. Respond ONLY as compact JSON: {"summary":"...","key_points":["..."],"suggested_action":"...","confidence":0.0}` },
    ];
    if (isImage) userContent.push({ type: "image_url", image_url: { url: file_url } });
    else if (isPdf) userContent.push({ type: "file", file: { filename: "attachment.pdf", file_data: file_url } });
    else userContent.push({ type: "text", text: `Attachment URL (no inline preview): ${file_url}` });

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: userContent }],
        response_format: { type: "json_object" },
      }),
    });
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return json({ error: `AI error: ${aiRes.status}`, detail: txt.slice(0, 300) }, 502);
    }
    const data = await aiRes.json();
    let parsed: any = {};
    try { parsed = JSON.parse(data?.choices?.[0]?.message?.content || "{}"); } catch { /* */ }

    return json({
      summary: String(parsed.summary || "Could not summarize.").slice(0, 600),
      key_points: Array.isArray(parsed.key_points) ? parsed.key_points.slice(0, 6).map(String) : [],
      suggested_action: String(parsed.suggested_action || "").slice(0, 240),
      confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
