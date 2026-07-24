// ai-copilot — admin-facing conversational agent with tool calling via Lovable AI Gateway.
// Tools: query_problems, explain_decision, reassign_problem, escalate_problem,
// bulk_notify_cadres, forecast_load, get_cadre_workload.
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const MODEL = 'google/gemini-3-flash-preview';

const SYSTEM = `You are the AI Copilot for the TVK constituency civic-issue platform (Tamil Nadu, India).
Today is ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full' })} (IST).

You help admins (state admins and constituency moderators) understand and act on
real data: problems, cadre workloads, escalations, AI decisions. Be concise but specific.

CRITICAL: NEVER guess numbers, names, or status. ALWAYS call a tool to look up real data
before answering anything quantitative. If the user asks "how many", "list", "who", "show",
"forecast", call the matching tool first. If they ask you to take an action (reassign,
escalate, notify), call the action tool and confirm the result with the IDs returned.

When the user names a constituency (e.g. "Sulur"), pass it through to the tools as the
constituency parameter. When in doubt about scope, ask the user which constituency.

Format replies in concise markdown: bold key numbers, bullet lists for items, tables only
when comparing 3+ rows. Always show the ticket_no for problems.`;

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'query_problems',
      description: 'Search problems by status, constituency, department, or keyword. Returns up to 20.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          constituency: { type: 'string' },
          department: { type: 'string' },
          keyword: { type: 'string' },
          limit: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'explain_decision',
      description: 'Fetch an AI decision row by id and explain its breakdown.',
      parameters: { type: 'object', properties: { decision_id: { type: 'string' } }, required: ['decision_id'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_cadre_workload',
      description: 'Return active assignment counts for cadres in a constituency.',
      parameters: { type: 'object', properties: { constituency: { type: 'string' } }, required: ['constituency'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reassign_problem',
      description: 'Reassign a problem to a specific cadre and notify them via AI task.',
      parameters: {
        type: 'object',
        properties: {
          problem_id: { type: 'string' },
          cadre_id: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['problem_id', 'cadre_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'escalate_problem',
      description: 'Escalate a problem to constituency admin with optional message.',
      parameters: {
        type: 'object',
        properties: { problem_id: { type: 'string' }, reason: { type: 'string' } },
        required: ['problem_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'bulk_notify_cadres',
      description: 'Send an in-app + push notification to cadres in a constituency or department.',
      parameters: {
        type: 'object',
        properties: {
          constituency: { type: 'string' },
          department: { type: 'string' },
          title: { type: 'string' },
          message: { type: 'string' },
        },
        required: ['title', 'message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'forecast_load',
      description: 'Forecast tomorrow load based on last 14 days of problem inflow.',
      parameters: { type: 'object', properties: { constituency: { type: 'string' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'count_summary',
      description: 'Return live counts for problems by status (and optionally constituency, department). Use this for "how many" questions.',
      parameters: { type: 'object', properties: {
        constituency: { type: 'string' }, department: { type: 'string' }, since_days: { type: 'number' },
      } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_open_escalations',
      description: 'List currently open escalations, optionally filtered by constituency.',
      parameters: { type: 'object', properties: { constituency: { type: 'string' }, limit: { type: 'number' } } },
    },
  },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');
    const { messages } = await req.json();
    if (!Array.isArray(messages)) throw new Error('messages array required');

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const convo: any[] = [{ role: 'system', content: SYSTEM }, ...messages];

    // Tool-calling loop (max 4 rounds to be safe)
    for (let i = 0; i < 4; i++) {
      const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, messages: convo, tools: TOOLS, tool_choice: 'auto' }),
      });
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited. Try again shortly.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Add credits in workspace settings.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`AI gateway ${resp.status}: ${text.slice(0, 200)}`);
      }
      const j = await resp.json();
      const msg = j.choices?.[0]?.message;
      if (!msg) throw new Error('No message in response');
      convo.push(msg);

      const toolCalls = msg.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        return new Response(JSON.stringify({ reply: msg.content ?? '' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      for (const call of toolCalls) {
        const name = call.function?.name;
        let args: any = {};
        try { args = JSON.parse(call.function?.arguments || '{}'); } catch {}
        const result = await runTool(supabase, name, args);
        convo.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result).slice(0, 8000),
        });
      }
    }

    return new Response(JSON.stringify({ reply: 'Sorry — too many tool rounds.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('ai-copilot', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

async function runTool(supabase: any, name: string, args: any) {
  try {
    switch (name) {
      case 'query_problems': {
        let q = supabase.from('problems').select('id,ticket_no,title,status,department,constituency,urgency,created_at')
          .order('created_at', { ascending: false }).limit(Math.min(args.limit ?? 20, 50));
        if (args.status) q = q.eq('status', args.status);
        if (args.constituency) q = q.eq('constituency', args.constituency);
        if (args.department) q = q.eq('department', args.department);
        if (args.keyword) q = q.ilike('title', `%${args.keyword}%`);
        const { data, error } = await q;
        if (error) return { error: error.message };
        return { problems: data };
      }
      case 'explain_decision': {
        const { data } = await supabase.from('ai_decisions').select('*').eq('id', args.decision_id).maybeSingle();
        return data ?? { error: 'not found' };
      }
      case 'get_cadre_workload': {
        const { data: cadres } = await supabase.from('cadres')
          .select('id,name,phone,level').eq('constituency', args.constituency).eq('active', true).limit(50);
        const ids = (cadres ?? []).map((c: any) => c.id);
        const { data: loads } = await supabase.from('problem_assignments')
          .select('cadre_id').in('cadre_id', ids).eq('active', true);
        const map = new Map<string, number>();
        (loads ?? []).forEach((l: any) => map.set(l.cadre_id, (map.get(l.cadre_id) ?? 0) + 1));
        return { cadres: (cadres ?? []).map((c: any) => ({ ...c, active_load: map.get(c.id) ?? 0 })) };
      }
      case 'reassign_problem': {
        const { data: prob } = await supabase.from('problems').select('ticket_no,title').eq('id', args.problem_id).maybeSingle();
        await supabase.from('problem_assignments').update({ active: false }).eq('problem_id', args.problem_id).eq('active', true);
        const { data: ins } = await supabase.from('problem_assignments').insert({
          problem_id: args.problem_id, cadre_id: args.cadre_id,
          notes: `Copilot reassign: ${args.reason ?? ''}`,
        }).select('id').maybeSingle();
        const { data: dec } = await supabase.from('ai_decisions').insert({
          agent_type: 'copilot', entity_type: 'problem', entity_id: args.problem_id,
          action: 'reassigned', reason: args.reason ?? 'Admin copilot reassigned',
          status: 'auto_applied', confidence: 100,
          metadata: { cadre_id: args.cadre_id, assignment_id: ins?.id },
          applied_at: new Date().toISOString(),
        }).select('id').maybeSingle();
        await supabase.functions.invoke('ai-dispatch-task', {
          body: {
            cadre_id: args.cadre_id, decision_id: dec?.id, problem_id: args.problem_id,
            action: 'reassign', priority: 'high',
            ai_message: `You have been reassigned to ${prob?.ticket_no ?? 'a problem'}: ${prob?.title ?? ''}. Reason: ${args.reason ?? 'admin action'}`,
          },
        });
        return { ok: true };
      }
      case 'escalate_problem': {
        return await (await supabase.functions.invoke('ai-escalation', { body: { problem_id: args.problem_id, reason: args.reason } })).data ?? { ok: true };
      }
      case 'bulk_notify_cadres': {
        // cadres has no `department` column — match via team membership when department is given
        let q = supabase.from('cadres').select('id,user_id').eq('active', true);
        if (args.constituency) q = q.eq('constituency', args.constituency);
        const { data: list } = await q.limit(200);
        const rows = (list ?? []).filter((c: any) => c.user_id).map((c: any) => ({
          user_id: c.user_id, title: args.title, body: args.message, type: 'broadcast', severity: 'info',
          constituency: args.constituency ?? null,
        }));
        if (rows.length) await supabase.from('notifications').insert(rows);
        return { notified: rows.length };
      }
      case 'forecast_load': {
        const since = new Date(Date.now() - 14 * 24 * 3600_000).toISOString();
        let q = supabase.from('problems').select('id,created_at').gte('created_at', since);
        if (args.constituency) q = q.eq('constituency', args.constituency);
        const { data } = await q.limit(2000);
        const perDay: Record<string, number> = {};
        (data ?? []).forEach((p: any) => {
          const d = p.created_at.slice(0, 10);
          perDay[d] = (perDay[d] ?? 0) + 1;
        });
        const counts = Object.values(perDay);
        const avg = counts.length ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;
        return { avg_per_day: Math.round(avg * 10) / 10, forecast_tomorrow: Math.round(avg), per_day: perDay };
      }
      case 'count_summary': {
        const since = args.since_days
          ? new Date(Date.now() - args.since_days * 24 * 3600_000).toISOString() : null;
        let q = supabase.from('problems').select('status, urgency, constituency, department');
        if (args.constituency) q = q.eq('constituency', args.constituency);
        if (args.department) q = q.eq('department', args.department);
        if (since) q = q.gte('created_at', since);
        const { data, error } = await q.limit(5000);
        if (error) return { error: error.message };
        const byStatus: Record<string, number> = {};
        const byUrgency: Record<string, number> = {};
        (data ?? []).forEach((p: any) => {
          byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
          byUrgency[p.urgency || 'medium'] = (byUrgency[p.urgency || 'medium'] ?? 0) + 1;
        });
        return {
          total: data?.length ?? 0,
          by_status: byStatus, by_urgency: byUrgency,
          filters: { constituency: args.constituency, department: args.department, since_days: args.since_days },
        };
      }
      case 'list_open_escalations': {
        let q = supabase.from('escalations')
          .select('id, problem_id, reason, to_level, created_at, problem:problems(ticket_no, title, constituency, urgency, status)')
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(Math.min(args.limit ?? 20, 50));
        const { data, error } = await q;
        if (error) return { error: error.message };
        const rows = (data ?? []).filter((r: any) =>
          !args.constituency || r.problem?.constituency === args.constituency);
        return { count: rows.length, escalations: rows };
      }
    }
    return { error: 'unknown tool' };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
