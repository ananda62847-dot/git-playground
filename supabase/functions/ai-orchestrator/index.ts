// ai-orchestrator — runs one full agentic cycle:
// 1) Smart-assign any unassigned problems from the last 24h.
// 2) Predict-delay on active assignments approaching SLA.
// 3) Escalate stalled problems.
// 4) Follow-up on assigned problems with no progress.
// Records an ai_runs row summarising what happened.
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const t0 = Date.now();
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const trigger = (await safeJson(req)).trigger ?? 'manual';

  const agentsRun: string[] = [];
  const outcomes: Record<string, any> = {};
  let decisionsCreated = 0;
  let tasksDispatched = 0;
  let error: string | null = null;

  try {
    // 1) Smart assign — pick up to 10 unassigned recent problems
    const { data: unassigned } = await supabase
      .from('problems')
      .select('id, ticket_no')
      .in('status', ['reported', 'pending'])
      .order('created_at', { ascending: false })
      .limit(10);
    agentsRun.push('smart_assignment');
    outcomes.smart_assignment = { candidates: unassigned?.length ?? 0, assigned: 0 };
    for (const p of unassigned ?? []) {
      const r = await invoke(supabase, 'ai-smart-assign', { problem_id: p.id });
      decisionsCreated += 1;
      if (r?.assigned) outcomes.smart_assignment.assigned += 1;
    }

    // 2) Predict delay — sample first 15 active assignments
    const { data: activeAssign } = await supabase
      .from('problem_assignments')
      .select('problem_id')
      .eq('active', true)
      .limit(15);
    agentsRun.push('prediction');
    outcomes.prediction = { checked: activeAssign?.length ?? 0 };
    for (const a of activeAssign ?? []) {
      await invoke(supabase, 'ai-predict-delay', { problem_id: a.problem_id }).catch(() => {});
    }

    // 3) Escalate stalled — problems assigned >72h with no resolution
    const stale = new Date(Date.now() - 72 * 3600_000).toISOString();
    const { data: stalled } = await supabase
      .from('problems')
      .select('id')
      .eq('status', 'assigned')
      .lt('updated_at', stale)
      .limit(10);
    agentsRun.push('escalation');
    outcomes.escalation = { stalled: stalled?.length ?? 0 };
    for (const p of stalled ?? []) {
      await invoke(supabase, 'ai-escalation', { problem_id: p.id }).catch(() => {});
      // Apply one-time -15 SLA breach penalty
      await supabase.rpc('apply_sla_breach', { _problem_id: p.id }).catch(() => {});
      decisionsCreated += 1;
    }

    // 4) Follow up — recent in-progress with last update >24h
    const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { data: needsFollow } = await supabase
      .from('problems')
      .select('id')
      .in('status', ['in_progress', 'assigned'])
      .lt('updated_at', dayAgo)
      .limit(10);
    agentsRun.push('follow_up');
    outcomes.follow_up = { targets: needsFollow?.length ?? 0 };
    for (const p of needsFollow ?? []) {
      await invoke(supabase, 'ai-follow-up', { problem_id: p.id }).catch(() => {});
    }

    // Count tasks dispatched during this cycle
    const cycleStart = new Date(t0).toISOString();
    const { count: taskCount } = await supabase
      .from('cadre_ai_tasks')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', cycleStart);
    tasksDispatched = taskCount ?? 0;

  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    console.error('orchestrator error', error);
  }

  const { data: run } = await supabase.from('ai_runs').insert({
    trigger,
    agents_run: agentsRun,
    outcomes,
    decisions_created: decisionsCreated,
    tasks_dispatched: tasksDispatched,
    duration_ms: Date.now() - t0,
    error,
  }).select('*').maybeSingle();

  return new Response(JSON.stringify({ ok: !error, run }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});

async function invoke(supabase: any, fn: string, body: any) {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) console.error(`${fn} error`, error);
  return data;
}
async function safeJson(req: Request) { try { return await req.json(); } catch { return {}; } }
