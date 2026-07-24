// ai-dispatch-task — creates a cadre_ai_task row, sends in-app + push (+ SMS for high pri),
// and updates the originating ai_decisions row with delivered_channels.
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface Body {
  cadre_id: string;
  decision_id?: string;
  problem_id?: string;
  action: string;           // assigned | escalated | follow_up | verify | reassign
  priority?: 'low' | 'normal' | 'high' | 'critical';
  ai_message: string;
  due_at?: string;
  metadata?: Record<string, any>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = (await req.json()) as Body;
    if (!body.cadre_id || !body.action || !body.ai_message) {
      return new Response(JSON.stringify({ error: 'cadre_id, action, ai_message required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const priority = body.priority ?? 'normal';

    // 1) Insert the task row
    const { data: task, error: tErr } = await supabase.from('cadre_ai_tasks').insert({
      cadre_id: body.cadre_id,
      decision_id: body.decision_id ?? null,
      problem_id: body.problem_id ?? null,
      action: body.action,
      priority,
      ai_message: body.ai_message,
      due_at: body.due_at ?? null,
      metadata: body.metadata ?? {},
    }).select('*').maybeSingle();
    if (tErr) throw tErr;

    // 2) Lookup cadre for delivery
    const { data: cadre } = await supabase.from('cadres')
      .select('id,name,phone,user_id,constituency,department').eq('id', body.cadre_id).maybeSingle();

    const channels: string[] = [];

    // 3) In-app notification
    if (cadre?.user_id) {
      await supabase.from('notifications').insert({
        user_id: cadre.user_id,
        title: `🤖 AI: ${labelFor(body.action)}`,
        body: body.ai_message,
        type: 'ai_task',
        severity: priority === 'critical' ? 'critical' : priority === 'high' ? 'high' : 'info',
        data: { task_id: task?.id, problem_id: body.problem_id, action: body.action },
      });
      channels.push('in_app');
    }

    // 4) Push
    if (cadre?.user_id) {
      await supabase.functions.invoke('send-push', {
        body: {
          title: `🤖 AI ${labelFor(body.action)}`,
          body: body.ai_message,
          type: 'ai_task',
          severity: priority === 'critical' ? 'critical' : priority === 'high' ? 'high' : 'medium',
          url: '/cadre',
          target: { user_id: cadre.user_id },
        },
      }).catch(() => {});
      channels.push('push');
    }

    // 5) SMS for high+ priority
    if ((priority === 'high' || priority === 'critical') && cadre?.phone) {
      await supabase.functions.invoke('send-sms', {
        body: { to: cadre.phone, message: `AI: ${body.ai_message}`.slice(0, 300) },
      }).catch(() => {});
      channels.push('sms');
    }

    // 6) Persist delivered channels
    await supabase.from('cadre_ai_tasks').update({ delivered_channels: channels }).eq('id', task!.id);
    if (body.decision_id) {
      await supabase.from('ai_decisions').update({ delivered_channels: channels }).eq('id', body.decision_id);
    }

    return new Response(JSON.stringify({ ok: true, task, channels }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('ai-dispatch-task', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

function labelFor(action: string) {
  return {
    assigned: 'New Assignment',
    escalated: 'Escalation',
    follow_up: 'Follow-up Needed',
    verify: 'Verify Resolution',
    reassign: 'Reassignment',
  }[action] ?? 'Action Required';
}
