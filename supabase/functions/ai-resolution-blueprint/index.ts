// Smart Resolution Workflow generator (Problem | Welfare | Corruption).
// Input: { problem_id | welfare_id | corruption_id, force? }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = "google/gemini-2.5-flash";

type Kind = "problem" | "welfare" | "corruption";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { problem_id, welfare_id, corruption_id, force } = body || {};
    let kind: Kind | null = null; let entityId: string | null = null;
    if (problem_id) { kind = "problem"; entityId = problem_id; }
    else if (welfare_id) { kind = "welfare"; entityId = welfare_id; }
    else if (corruption_id) { kind = "corruption"; entityId = corruption_id; }
    if (!kind || !entityId) return json({ error: "problem_id | welfare_id | corruption_id required" }, 400);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const tableMap = { problem: "problems", welfare: "welfare_issues", corruption: "corruption_reports" } as const;
    const fkMap = { problem: "problem_id", welfare: "welfare_id", corruption: "corruption_id" } as const;
    const fkCol = fkMap[kind];

    const { data: entity, error: pErr } = await sb.from(tableMap[kind]).select("*").eq("id", entityId).maybeSingle();
    if (pErr || !entity) return json({ error: pErr?.message || "not found" }, 404);

    if (!force) {
      const { data: existing } = await sb
        .from("resolution_blueprints").select("id").eq(fkCol, entityId).eq("is_active", true).maybeSingle();
      if (existing) return json({ blueprint_id: existing.id, cached: true });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    const system = `You are an experienced public-grievance operations officer in Tamil Nadu, India.
Given a citizen report, produce a STRUCTURED RESOLUTION BLUEPRINT — a dependent task workflow that any newly-joined cadre can follow without guesswork.

CRITICAL — contact accuracy. For each task, populate the "contact_point" field with a SPECIFIC office/role who must be contacted, tailored to the area:
  • Determine urban vs rural from the location (Coimbatore Corporation zones = urban; villages, panchayats, block units = rural; town panchayat / municipality = semi-urban).
  • Urban (Corporation) example: "Zonal Officer – Coimbatore Corporation, <Zone/Ward>; Ward Councillor <Ward no.>"
  • Rural (Panchayat) example: "Village Panchayat President (Ooraatchi Thalaivar), <Panchayat name>; Block Development Officer (BDO), <Block>"
  • Line/dept staff should be named by their real title: JE (Junior Engineer, TNEB), Sanitary Inspector (Health), Section Officer (PWD), VAO (Village Administrative Officer), Tahsildar, RDO, DEO, etc.
  • Do NOT invent named persons. Give the role + jurisdiction only.
  • Do NOT collapse to "Contact department". Every task must have an actionable, precise contact_point (or an empty string only if truly not applicable).

Return STRICT JSON ONLY (no markdown), matching:
{
  "title": string,
  "case_summary": string,
  "responsible_department": string,
  "estimated_days": number,
  "area_type": "urban" | "rural" | "semi_urban" | "unknown",
  "tasks": [
    {
      "title": string, "objective": string, "owner_role": string,
      "contact_point": string,
      "priority": "low"|"medium"|"high"|"critical",
      "due_in_hours": number,
      "depends_on_seq": [number],
      "evidence_required": [string],
      "success_criteria": [string]
    }
  ]
}
Produce 4-8 concrete tasks specific to this issue. Always end with a "Citizen Verification" task owned by the Field Cadre.`;

    const ctx: Record<string, any> = { kind };
    if (kind === "problem") {
      ctx.title = entity.title; ctx.description = entity.description;
      ctx.category = entity.category; ctx.department = entity.department;
      ctx.urgency = entity.urgency;
      ctx.location = [entity.area, entity.constituency, entity.city].filter(Boolean).join(", ");
    } else if (kind === "welfare") {
      ctx.title = entity.title; ctx.description = entity.description;
      ctx.scheme_type = entity.scheme_type; ctx.subcategory = entity.subcategory;
      ctx.scheme_name = entity.scheme_name; ctx.department = entity.department;
      ctx.application_id = entity.application_id; ctx.months_pending = entity.months_pending;
      ctx.urgency = entity.urgency;
      ctx.location = [entity.area, entity.constituency, entity.city].filter(Boolean).join(", ");
    } else {
      ctx.description = entity.description; ctx.department = entity.department;
      ctx.incident_type = entity.incident_type; ctx.office = entity.office_location;
      ctx.location = [entity.area, entity.constituency, entity.city].filter(Boolean).join(", ");
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(ctx) },
        ],
      }),
    });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return json({ error: `AI error ${aiRes.status}: ${t}` }, 502);
    }
    const aiData = await aiRes.json();
    const raw = aiData?.choices?.[0]?.message?.content;
    if (!raw) return json({ error: "Empty AI response" }, 502);
    let plan: any;
    try { plan = typeof raw === "string" ? JSON.parse(raw) : raw; }
    catch { return json({ error: "AI returned invalid JSON" }, 502); }
    if (!plan?.tasks?.length) return json({ error: "No tasks in plan" }, 502);

    const { data: prev } = await sb
      .from("resolution_blueprints").select("version")
      .eq(fkCol, entityId).order("version", { ascending: false }).limit(1).maybeSingle();
    const nextVersion = (prev?.version ?? 0) + 1;
    if (prev) await sb.from("resolution_blueprints").update({ is_active: false }).eq(fkCol, entityId);

    const bpInsert: Record<string, any> = {
      version: nextVersion,
      title: plan.title?.slice(0, 200) || (entity.title || "Resolution Blueprint"),
      case_summary: plan.case_summary || null,
      responsible_department: plan.responsible_department || entity.department || null,
      estimated_days: Math.max(0, Math.min(60, Number(plan.estimated_days) || 7)),
      area_type: typeof plan.area_type === "string" ? plan.area_type : null,
      generated_by: "ai", model: MODEL, is_active: true,
    };
    bpInsert[fkCol] = entityId;

    const { data: bp, error: bpErr } = await sb
      .from("resolution_blueprints").insert(bpInsert).select("id").single();
    if (bpErr || !bp) return json({ error: bpErr?.message || "insert failed" }, 500);

    const now = Date.now();
    const seqToId = new Map<number, string>();
    const rows = plan.tasks.map((t: any, i: number) => {
      const row: Record<string, any> = {
        blueprint_id: bp.id,
        seq: i + 1,
        title: String(t.title).slice(0, 300),
        objective: t.objective ?? null,
        owner_role: t.owner_role ?? null,
        contact_point: typeof t.contact_point === "string" ? t.contact_point.slice(0, 400) : null,
        priority: (["low", "medium", "high", "critical"].includes(t.priority) ? t.priority : "medium"),
        due_in_hours: Math.max(0, Math.min(720, Number(t.due_in_hours) || 24)),
        due_at: new Date(now + Math.max(1, Number(t.due_in_hours) || 24) * 3600_000).toISOString(),
        depends_on: [],
        evidence_required: Array.isArray(t.evidence_required) ? t.evidence_required.slice(0, 12) : [],
        success_criteria: Array.isArray(t.success_criteria) ? t.success_criteria.slice(0, 12) : [],
        status: "pending",
      };
      row[fkCol] = entityId;
      return row;
    });

    const { data: inserted, error: tErr } = await sb.from("blueprint_tasks").insert(rows).select("id, seq");
    if (tErr) return json({ error: tErr.message }, 500);
    inserted?.forEach((r: any) => seqToId.set(r.seq, r.id));

    for (let i = 0; i < plan.tasks.length; i++) {
      const seq = i + 1;
      const deps = (plan.tasks[i].depends_on_seq || [])
        .map((s: number) => seqToId.get(Number(s))).filter((x: any): x is string => !!x);
      if (deps.length) {
        const id = seqToId.get(seq);
        if (id) await sb.from("blueprint_tasks").update({ depends_on: deps }).eq("id", id);
      }
    }

    const auditRow: Record<string, any> = {
      blueprint_id: bp.id, action: nextVersion === 1 ? "generated" : "regenerated",
      actor_label: "Makkal Connect AI",
      reason: `Blueprint v${nextVersion} generated with ${plan.tasks.length} tasks`,
    };
    auditRow[fkCol] = entityId;
    await sb.from("blueprint_audit_log").insert(auditRow);

    return json({ blueprint_id: bp.id, version: nextVersion, tasks: plan.tasks.length });
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
