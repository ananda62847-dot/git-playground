// Smart Assignment Agent — scores eligible cadres for a problem (individuals + teams),
// hard-filters by constituency + availability, then auto-applies the top pick when
// confidence ≥ AUTO_APPLY_THRESHOLD, or logs a pending_review decision otherwise.
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Weights sum to 100
const W = { availability: 30, performance: 20, proximity: 15, speed: 10, success: 10, dept_match: 15 };
const AUTO_APPLY_THRESHOLD = 75;
const MAX_PENDING_PER_CADRE = 5;

interface Score {
  cadre_id: string;
  cadre_name: string;
  score: number;
  breakdown: Record<string, number>;
  reasons: string[];
  pending_load: number;
}

function clamp(n: number, lo = 0, hi = 1) { return Math.max(lo, Math.min(hi, n)); }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { problem_id, dry_run = false } = await req.json();
    if (!problem_id) {
      return new Response(JSON.stringify({ error: 'problem_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: problem, error: pErr } = await supabase.from('problems').select('*').eq('id', problem_id).maybeSingle();
    if (pErr || !problem) throw new Error(pErr?.message || 'Problem not found');

    if (!problem.constituency) {
      await logDecision(supabase, problem_id, 'no_constituency',
        'Problem has no constituency — cannot smart-assign.', 0, [], 'pending_review');
      return new Response(JSON.stringify({ assigned: false, reason: 'no constituency on problem' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: existing } = await supabase.from('problem_assignments').select('id').eq('problem_id', problem_id).eq('active', true).limit(1);
    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ skipped: true, reason: 'Already assigned' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // HARD FILTER: only active, approved cadres in the SAME constituency.
    const { data: cadres } = await supabase
      .from('cadres')
      .select('id, name, constituency, city, ward_number, area, points, stars, resolved_count, rank_tier, level, skills')
      .eq('active', true).eq('approved', true)
      .eq('constituency', problem.constituency);

    if (!cadres || cadres.length === 0) {
      await logDecision(supabase, problem_id, 'no_candidates',
        `No active cadres in constituency ${problem.constituency}`, 0, [], 'pending_review');
      return new Response(JSON.stringify({ assigned: false, reason: 'No candidates in constituency' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const cadreIds = cadres.map(c => c.id);

    // Active workload per cadre (assignments + open AI tasks)
    const { data: loads } = await supabase
      .from('problem_assignments')
      .select('cadre_id, claimed_by_cadre_id')
      .or(`cadre_id.in.(${cadreIds.join(',')}),claimed_by_cadre_id.in.(${cadreIds.join(',')})`)
      .eq('active', true);
    const loadMap = new Map<string, number>();
    (loads ?? []).forEach((l: any) => {
      [l.cadre_id, l.claimed_by_cadre_id].forEach((k: any) => {
        if (k && cadreIds.includes(k)) loadMap.set(k, (loadMap.get(k) ?? 0) + 1);
      });
    });

    const { data: openTasks } = await supabase
      .from('cadre_ai_tasks')
      .select('cadre_id')
      .in('cadre_id', cadreIds)
      .in('status', ['new', 'ack', 'accepted']);
    const taskMap = new Map<string, number>();
    (openTasks ?? []).forEach((t: any) => taskMap.set(t.cadre_id, (taskMap.get(t.cadre_id) ?? 0) + 1));

    const maxLoad = Math.max(1, ...cadreIds.map(id => (loadMap.get(id) ?? 0) + (taskMap.get(id) ?? 0)));

    const tierBoost: Record<string, number> = { diamond: 1, platinum: 0.85, gold: 0.7, silver: 0.5, bronze: 0.3 };
    const department = String(problem.department ?? '').toLowerCase();

    // Score every cadre; exclude over-loaded ones unless ALL are over loaded.
    const allScored: Score[] = cadres.map(c => {
      const pending = (loadMap.get(c.id) ?? 0) + (taskMap.get(c.id) ?? 0);
      const availability = clamp(1 - pending / Math.max(1, maxLoad));
      const performance = clamp(tierBoost[c.rank_tier ?? 'bronze'] ?? 0.3);
      const proximity = c.ward_number && problem.area && String(c.ward_number) === String(problem.area) ? 1
                      : c.area && problem.area && c.area === problem.area ? 0.9
                      : 0.6;
      const speed = clamp(((c.resolved_count ?? 0) > 0 ? 0.6 : 0.4) + (c.stars ? 0.04 * c.stars : 0));
      const success = clamp((c.resolved_count ?? 0) / 20);
      const skillList = Array.isArray(c.skills) ? c.skills.map((s: string) => String(s).toLowerCase()) : [];
      const dept_match = department && skillList.some((s: string) => s.includes(department)) ? 1
                       : department ? 0.4 : 0.6;

      const score = Math.round(
        availability * W.availability +
        performance  * W.performance +
        proximity    * W.proximity +
        speed        * W.speed +
        success      * W.success +
        dept_match   * W.dept_match,
      );

      const reasons: string[] = [];
      if (availability >= 0.7) reasons.push(`Low load (${pending} pending)`);
      if (proximity === 1) reasons.push('Same ward as report');
      else if (proximity >= 0.9) reasons.push('Same area as report');
      if (performance >= 0.7) reasons.push(`${c.rank_tier} tier`);
      if (success >= 0.5) reasons.push(`${c.resolved_count} resolved historically`);
      if (dept_match === 1) reasons.push(`Skilled in ${problem.department}`);

      return {
        cadre_id: c.id, cadre_name: c.name, score, reasons, pending_load: pending,
        breakdown: {
          availability: Math.round(availability * W.availability),
          performance: Math.round(performance * W.performance),
          proximity: Math.round(proximity * W.proximity),
          speed: Math.round(speed * W.speed),
          success: Math.round(success * W.success),
          dept_match: Math.round(dept_match * W.dept_match),
        },
      };
    });

    const available = allScored.filter(s => s.pending_load < MAX_PENDING_PER_CADRE);
    const eligible = available.length > 0 ? available : allScored;
    const scored = eligible.sort((a, b) => b.score - a.score);

    const top = scored[0];
    const alternatives = scored.slice(1, 4);
    const confidence = top.score;

    const autoApply = !dry_run && confidence >= AUTO_APPLY_THRESHOLD;
    let assignmentId: string | null = null;

    if (autoApply) {
      const { data: ins, error: insErr } = await supabase.from('problem_assignments').insert({
        problem_id, cadre_id: top.cadre_id, assigned_by: null,
        notes: `Auto-assigned by AI (confidence ${confidence})`,
      }).select('id').maybeSingle();
      if (insErr) throw insErr;
      assignmentId = ins?.id ?? null;
      await supabase.from('problems').update({ status: 'assigned' }).eq('id', problem_id);
      await supabase.from('problem_updates').insert({
        problem_id, status: 'assigned',
        note: `🤖 AI auto-assigned to ${top.cadre_name} (confidence ${confidence}%, ${top.pending_load} pending)`,
      });

      await supabase.functions.invoke('ai-dispatch-task', {
        body: {
          cadre_id: top.cadre_id,
          problem_id,
          action: 'assigned',
          priority: problem.urgency === 'emergency' || problem.urgency === 'critical' ? 'critical'
                   : problem.urgency === 'high' ? 'high' : 'normal',
          ai_message: `New assignment: ${problem.ticket_no ?? ''} — ${problem.title ?? ''}. ${top.reasons.slice(0, 2).join('; ')}. Confidence ${confidence}%.`,
          metadata: { confidence, breakdown: top.breakdown, pending_load: top.pending_load },
        },
      }).catch(() => {});
    } else {
      // Notify constituency admins so they can review
      const { data: mods } = await supabase
        .from('moderator_constituencies').select('user_id').eq('constituency', problem.constituency);
      const userIds = (mods || []).map((m: any) => m.user_id).filter(Boolean);
      if (userIds.length) {
        await supabase.from('notifications').insert(userIds.map((uid: string) => ({
          user_id: uid,
          title: '🤖 AI assignment needs your review',
          body: `${problem.ticket_no ?? 'Report'}: top pick ${top.cadre_name} (${confidence}%). Open AI Ops Center.`,
          type: 'ai_review',
          severity: 'medium',
          constituency: problem.constituency,
          data: { problem_id, recommended_cadre_id: top.cadre_id },
        })));
      }
    }

    await logDecision(
      supabase, problem_id,
      autoApply ? 'auto_assigned' : 'assignment_recommended',
      `Top candidate: ${top.cadre_name} (${top.pending_load} pending). ${top.reasons.join('; ')}`,
      confidence,
      alternatives.map(a => ({ cadre_id: a.cadre_id, cadre_name: a.cadre_name, score: a.score, breakdown: a.breakdown, pending_load: a.pending_load })),
      autoApply ? 'auto_applied' : 'pending_review',
      { recommended_cadre_id: top.cadre_id, recommended_cadre_name: top.cadre_name, breakdown: top.breakdown, assignment_id: assignmentId, pending_load: top.pending_load },
    );

    return new Response(JSON.stringify({
      assigned: autoApply, confidence, recommendation: top, alternatives,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('ai-smart-assign error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

async function logDecision(
  supabase: any, problem_id: string, action: string, reason: string,
  confidence: number, alternatives: any[], status: string, metadata: any = {},
) {
  await supabase.from('ai_decisions').insert({
    agent_type: 'smart_assignment',
    entity_type: 'problem',
    entity_id: problem_id,
    action, reason, confidence,
    score_breakdown: metadata.breakdown ?? {},
    alternatives,
    status,
    metadata,
    applied_at: status === 'auto_applied' ? new Date().toISOString() : null,
  });
}
