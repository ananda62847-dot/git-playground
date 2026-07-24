// Escalation Intelligence: detects SLA breaches, creates `escalations` rows,
// notifies the right constituency admins, and logs `ai_decisions` audit trail.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const SLA_HOURS: Record<string, number> = {
  critical: 24, emergency: 12, high: 72, medium: 168, low: 336,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await safeJson(req);
    const targetedId: string | undefined = body.problem_id;

    let probsQ = supabase
      .from('problems')
      .select('id, ticket_no, title, urgency, status, created_at, constituency, department')
      .not('status', 'in', '(resolved,completed,citizen_confirmed,rejected)')
      .limit(500);
    if (targetedId) probsQ = probsQ.eq('id', targetedId);

    const { data: problems, error } = await probsQ;
    if (error) throw error;

    let flagged = 0, skipped = 0;
    const now = Date.now();
    const results: any[] = [];

    for (const p of problems ?? []) {
      const urgency = (p.urgency || 'medium').toLowerCase();
      const sla = SLA_HOURS[urgency] ?? 168;
      const ageHours = (now - new Date(p.created_at).getTime()) / 3600_000;
      const breachBy = ageHours - sla;
      // For targeted runs, escalate regardless; for sweeps, only if breached.
      if (!targetedId && breachBy < 0) { skipped++; continue; }

      // Skip if an open escalation already exists.
      const { data: existing } = await supabase
        .from('escalations').select('id').eq('problem_id', p.id).eq('status', 'open').limit(1);
      if (existing && existing.length) { skipped++; continue; }

      const confidence = Math.min(99, 60 + Math.round((Math.max(0, breachBy) / sla) * 40));
      const toLevel = breachBy > sla ? 'district' : 'constituency';
      const reasonText = body.reason
        ? body.reason
        : `${p.ticket_no} (${urgency}) is ${Math.round(Math.max(0, breachBy))}h past SLA of ${sla}h. Escalating to ${toLevel} level.`;

      // 1. Create the canonical escalation row (will trigger handle_escalation_opened()).
      const { data: esc, error: escErr } = await supabase.from('escalations').insert({
        problem_id: p.id,
        to_level: toLevel,
        reason: reasonText,
        status: 'open',
        raised_by: null,
        raised_by_cadre_id: null,
      }).select('id').maybeSingle();
      if (escErr) {
        console.error('escalation insert failed', escErr);
        continue;
      }

      // 2. Audit trail.
      await supabase.from('ai_decisions').insert({
        agent_type: 'escalation',
        entity_type: 'problem',
        entity_id: p.id,
        action: 'flag_escalation',
        reason: reasonText,
        confidence,
        status: 'auto_applied',
        applied_at: new Date().toISOString(),
        score_breakdown: {
          urgency_weight: urgency === 'critical' || urgency === 'emergency' ? 40 : urgency === 'high' ? 30 : 20,
          breach_severity: Math.min(40, Math.round((Math.max(0, breachBy) / sla) * 40)),
          age_factor: Math.min(20, Math.round(ageHours / 12)),
        },
        metadata: {
          recommended_to_level: toLevel,
          age_hours: Math.round(ageHours),
          sla_hours: sla,
          breach_hours: Math.round(breachBy),
          constituency: p.constituency,
          department: p.department,
          escalation_id: esc?.id,
        },
      });

      // 3. Fan-out notifications to constituency admins + super admins.
      await supabase.functions.invoke('notify-escalation', {
        body: {
          problem_id: p.id,
          escalation_id: esc?.id,
          reason: reasonText,
          source: 'ai',
          severity: urgency === 'critical' || urgency === 'emergency' ? 'critical' : 'high',
        },
      }).catch((e) => console.error('notify-escalation invoke failed', e));

      flagged++;
      results.push({ problem_id: p.id, escalation_id: esc?.id, breach_hours: Math.round(breachBy) });
    }

    return new Response(
      JSON.stringify({ flagged, skipped, scanned: problems?.length ?? 0, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[ai-escalation]', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function safeJson(req: Request) {
  try { return await req.json(); } catch { return {}; }
}
