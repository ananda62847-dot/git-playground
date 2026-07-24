// Translate cached blueprint title/summary and task titles/objectives to Tamil.
// Input: { blueprint_id }. Idempotent: only fills missing *_ta fields.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = "google/gemini-2.5-flash";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { blueprint_id } = await req.json().catch(() => ({}));
    if (!blueprint_id) return json({ error: "blueprint_id required" }, 400);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: bp, error: bErr } = await sb
      .from("resolution_blueprints")
      .select("id, title, title_ta, case_summary, case_summary_ta")
      .eq("id", blueprint_id).maybeSingle();
    if (bErr || !bp) return json({ error: bErr?.message || "not found" }, 404);

    const { data: tasks, error: tErr } = await sb
      .from("blueprint_tasks")
      .select("id, title, title_ta, objective, objective_ta, contact_point, contact_point_ta, evidence_required, evidence_required_ta, success_criteria, success_criteria_ta")
      .eq("blueprint_id", blueprint_id);
    if (tErr) return json({ error: tErr.message }, 500);

    // Build items needing translation
    const items: { key: string; text: string }[] = [];
    if (bp.title && !bp.title_ta) items.push({ key: "bp_title", text: bp.title });
    if (bp.case_summary && !bp.case_summary_ta) items.push({ key: "bp_summary", text: bp.case_summary });
    (tasks || []).forEach((t: any) => {
      if (t.title && !t.title_ta) items.push({ key: `t_title_${t.id}`, text: t.title });
      if (t.objective && !t.objective_ta) items.push({ key: `t_obj_${t.id}`, text: t.objective });
      if (t.contact_point && !t.contact_point_ta) items.push({ key: `t_ct_${t.id}`, text: t.contact_point });
      const evEn: string[] = t.evidence_required || [];
      const evTa: string[] = t.evidence_required_ta || [];
      evEn.forEach((s, i) => { if (s && !evTa[i]) items.push({ key: `t_ev_${t.id}__${i}`, text: s }); });
      const scEn: string[] = t.success_criteria || [];
      const scTa: string[] = t.success_criteria_ta || [];
      scEn.forEach((s, i) => { if (s && !scTa[i]) items.push({ key: `t_sc_${t.id}__${i}`, text: s }); });
    });

    if (items.length === 0) return json({ ok: true, translated: 0, cached: true });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    const system = `You are a professional English→Tamil translator for civic/government workflow content in Tamil Nadu.
Translate each provided string into natural, formal Tamil (தமிழ்). Keep proper nouns, department names, and English acronyms as-is when there is no common Tamil equivalent. Preserve meaning and tone; do NOT add commentary.
Return STRICT JSON only: { "translations": { "<key>": "<tamil string>", ... } } — one entry per input key.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify({ items }) },
        ],
      }),
    });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return json({ error: `AI error ${aiRes.status}: ${t}` }, 502);
    }
    const aiData = await aiRes.json();
    const raw = aiData?.choices?.[0]?.message?.content;
    let parsed: any;
    try { parsed = typeof raw === "string" ? JSON.parse(raw) : raw; }
    catch { return json({ error: "AI returned invalid JSON" }, 502); }
    const tr: Record<string, string> = parsed?.translations || {};

    // Persist bp fields
    const bpPatch: Record<string, any> = {};
    if (tr.bp_title) bpPatch.title_ta = tr.bp_title;
    if (tr.bp_summary) bpPatch.case_summary_ta = tr.bp_summary;
    if (Object.keys(bpPatch).length) {
      await sb.from("resolution_blueprints").update(bpPatch).eq("id", blueprint_id);
    }

    // Persist tasks — group scalar + array translations per task id
    const byTask = new Map<string, Record<string, any>>();
    const patchFor = (id: string) => {
      if (!byTask.has(id)) byTask.set(id, {});
      return byTask.get(id)!;
    };
    // Seed patch objects with existing array values so we can update slots
    const taskById = new Map<string, any>((tasks || []).map((t: any) => [t.id, t]));

    for (const [k, v] of Object.entries(tr)) {
      let m: RegExpMatchArray | null;
      if ((m = k.match(/^t_title_(.+)$/))) { patchFor(m[1]).title_ta = v; }
      else if ((m = k.match(/^t_obj_(.+)$/))) { patchFor(m[1]).objective_ta = v; }
      else if ((m = k.match(/^t_ct_(.+)$/))) { patchFor(m[1]).contact_point_ta = v; }
      else if ((m = k.match(/^t_ev_(.+)__(\d+)$/))) {
        const id = m[1]; const idx = Number(m[2]);
        const p = patchFor(id);
        const base: string[] = p.evidence_required_ta || [...(taskById.get(id)?.evidence_required_ta || [])];
        while (base.length <= idx) base.push('');
        base[idx] = v;
        p.evidence_required_ta = base;
      } else if ((m = k.match(/^t_sc_(.+)__(\d+)$/))) {
        const id = m[1]; const idx = Number(m[2]);
        const p = patchFor(id);
        const base: string[] = p.success_criteria_ta || [...(taskById.get(id)?.success_criteria_ta || [])];
        while (base.length <= idx) base.push('');
        base[idx] = v;
        p.success_criteria_ta = base;
      }
    }
    for (const [id, patch] of byTask.entries()) {
      await sb.from("blueprint_tasks").update(patch).eq("id", id);
    }


    return json({ ok: true, translated: items.length });
  } catch (e: any) {
    return json({ error: e?.message || String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}