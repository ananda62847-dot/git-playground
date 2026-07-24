// Predictive Delay Agent — looks at active assignments and predicts which
// problems are at risk of breaching SLA in the next 24h.
// Risk score 0-100 based on: time-left-to-SLA, cadre workload, tier, urgency.
// Auto-applied (logged), with admin push at risk >= 70.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const SLA_HOURS: Record<string, number> = { critical: 24, high: 72, medium: 168, low: 336 };
const TIER_BOOST: Record<string, number> = { diamond: 0, platinum: 5, gold: 10, silver: 20, bronze: 30 };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: assignments, error } = await supabase
      .from('problem_assignments')
      .select(`id, problem_id, cadre_id, claimed_by_cadre_id, created_at,
               problems!inner(id, ticket_no, title, status, urgency, created_at, constituency)`)
      .eq('active', true)
      .not('problems.status', 'in', '(resolved,completed,citizen_confirmed,rejected)')
      .limit(500);
    if (error) throw error;

    // Build cadre load map
    const cadreIds = Array.from(new Set((assignments ?? []).map(a => a.claimed_by_cadre_id || a.cadre_id).filter(Boolean))) as string[];
    const loadMap = new Map<string, number>();
    cadreIds.forEach(id => loadMap.set(id, 0));
    (assignments ?? []).forEach(a => {
      const k = a.claimed_by_cadre_id || a.cadre_id;
      if (k) loadMap.set(k, (loadMap.get(k) ?? 0) + 1);
    });
    const { data: cadres } = await supabase.from('cadres').select('id, name, rank_tier').in('id', cadreIds.length ? cadreIds : ['00000000-0000-0000-0000-000000000000']);
    const cadreMap = new Map((cadres ?? []).map(c => [c.id, c]));

    let flagged = 0, low = 0;
    const now = Date.now();
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);

    for (const a of assignments ?? []) {
      const p: any = a.problems;
      const urgency = (p.urgency || 'medium').toLowerCase();
      const sla = SLA_HOURS[urgency] ?? 168;
      const ageHours = (now - new Date(p.created_at).getTime()) / 3600_000;
      const hoursLeft = sla - ageHours;
      if (hoursLeft <= 0) { low++; continue; } // already breached → escalation agent handles

      const cadreId = a.claimed_by_cadre_id || a.cadre_id;
      const cadre = cadreId ? cadreMap.get(cadreId) : null;
      const load = cadreId ? (loadMap.get(cadreId) ?? 0) : 0;
      const tierPenalty = TIER_BOOST[cadre?.rank_tier ?? 'bronze'] ?? 30;
      const loadPenalty = Math.min(35, load * 6);
      const timePressure = Math.max(0, Math.min(50, (1 - hoursLeft / sla) * 50));
      const urgencyBoost = urgency === 'critical' ? 15 : urgency === 'high' ? 10 : 0;

      const risk = Math.round(timePressure + loadPenalty + tierPenalty * 0.3 + urgencyBoost);
      if (risk < 50) { low++; continue; }

      // Dedupe: only one prediction per problem per day
      const { data: dec } = await supabase.from('ai_decisions' as any)
        .select('id').eq('agent_type', 'prediction').eq('entity_id', p.id)
        .gte('created_at', todayStart.toISOString()).limit(1);
      if (dec && dec.length) { low++; continue; }

      await supabase.from('ai_decisions' as any).insert({
        agent_type: 'prediction',
        entity_type: 'problem',
        entity_id: p.id,
        action: 'predict_breach',
        reason: `${p.ticket_no} likely to breach SLA. ${Math.round(hoursLeft)}h remaining vs cadre load ${load}, tier ${cadre?.rank_tier ?? 'unknown'}.`,
        confidence: Math.min(99, risk),
        status: 'auto_applied',
        applied_at: new Date().toISOString(),
        score_breakdown: {
          time_pressure: Math.round(timePressure),
          cadre_load: loadPenalty,
          tier_penalty: Math.round(tierPenalty * 0.3),
          urgency_boost: urgencyBoost,
        },
        metadata: {
          hours_left: Math.round(hoursLeft), sla_hours: sla, urgency, load,
          cadre_id: cadreId, cadre_name: cadre?.name, constituency: p.constituency,
          risk_score: risk,
        },
      });
      flagged++;

      if (risk >= 70) {
        await supabase.functions.invoke('send-push', {
          body: {
            title: `🔮 Predicted SLA breach`,
            body: `${p.ticket_no}: risk ${risk}%, only ${Math.round(hoursLeft)}h left. Consider reassigning.`,
            type: 'ai_prediction', severity: risk >= 85 ? 'critical' : 'high',
            url: `/admin`,
            target: { role: 'constituency_admin', constituency: p.constituency ?? undefined },
          },
        }).catch(() => {});
      }
    }

    return new Response(JSON.stringify({ flagged, low, scanned: assignments?.length ?? 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[ai-predict-delay]', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
