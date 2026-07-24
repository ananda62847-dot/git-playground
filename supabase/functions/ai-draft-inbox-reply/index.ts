import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const rl = new Map<string, { c: number; t: number }>();
const LIMIT = 30; const WINDOW = 60_000;
function rateLimited(uid: string) {
  const now = Date.now();
  const v = rl.get(uid);
  if (!v || now - v.t > WINDOW) { rl.set(uid, { c: 1, t: now }); return false; }
  v.c++; return v.c > LIMIT;
}

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
    if (rateLimited(user.id)) return json({ error: "Rate limited. Try again in a minute." }, 429);

    const body = await req.json().catch(() => ({}));
    const task_id = String(body?.task_id || "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(task_id)) return json({ error: "Invalid task_id" }, 400);

    // Authoritative fetch (respects RLS via user JWT)
    const { data: task, error: tErr } = await supa
      .from("cadre_ai_tasks").select("*").eq("id", task_id).single();
    if (tErr || !task) return json({ error: "Task not found" }, 404);

    const attachments: { name?: string; summary?: string; key_points?: string[] }[] =
      Array.isArray(body?.attachment_summaries) ? body.attachment_summaries.slice(0, 5) : [];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    const lang = task?.metadata?.language === "ta" ? "Tamil" : "English";
    const sys = `You draft concise replies for a TVK cadre responding to AI-generated tasks in their inbox.
Write 3 variants in ${lang}, each 1–3 sentences, plain text, no markdown.
Tones: 1) "acknowledge" (short, confirms receipt & ETA), 2) "action_plan" (specific next step the cadre will take), 3) "need_info" (asks one focused clarifying question).
Be respectful, professional, on-the-ground. Reflect the task urgency and any attachment findings.
Respond ONLY as compact JSON: {"acknowledge":"...","action_plan":"...","need_info":"..."}`;

    const ctx = {
      task: {
        action: task.action, priority: task.priority,
        message: String(task.ai_message || "").slice(0, 800),
        due_at: task.due_at,
        rationale: String(task.metadata?.rationale || task.metadata?.reason || "").slice(0, 400),
      },
      attachments: attachments.map(a => ({
        name: a.name, summary: a.summary?.slice(0, 240), key_points: (a.key_points || []).slice(0, 4),
      })),
    };

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `Context JSON:\n${JSON.stringify(ctx)}` },
        ],
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
      acknowledge: String(parsed.acknowledge || "").slice(0, 600),
      action_plan: String(parsed.action_plan || "").slice(0, 600),
      need_info: String(parsed.need_info || "").slice(0, 600),
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
