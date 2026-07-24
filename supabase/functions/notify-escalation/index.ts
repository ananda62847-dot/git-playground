// notify-escalation — fan-out a single escalation to all matching constituency admins.
// Inserts in-app notifications + push, so AI and cadre/team escalations behave identically.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface Body {
  problem_id: string;
  escalation_id?: string;
  reason?: string;
  severity?: 'info' | 'medium' | 'high' | 'critical';
  source?: 'ai' | 'cadre' | 'admin';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = (await req.json()) as Body;
    if (!body.problem_id) {
      return new Response(JSON.stringify({ error: 'problem_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: problem } = await supabase
      .from('problems')
      .select('id, ticket_no, title, urgency, constituency, department')
      .eq('id', body.problem_id).maybeSingle();
    if (!problem) throw new Error('problem not found');

    // Look up every moderator (constituency admin) for this constituency.
    const { data: mods } = await supabase
      .from('moderator_constituencies')
      .select('user_id')
      .eq('constituency', problem.constituency ?? '');

    // Plus super admins (always notified).
    const { data: superAdmins } = await supabase
      .from('user_roles').select('user_id').eq('role', 'admin');

    const userIds = Array.from(new Set([
      ...((mods || []).map((m: any) => m.user_id)),
      ...((superAdmins || []).map((s: any) => s.user_id)),
    ])).filter(Boolean);

    const sourceLabel = body.source === 'ai' ? '🤖 AI' :
                        body.source === 'cadre' ? '👤 Cadre' : '⚠️';
    const title = `${sourceLabel} Escalation · ${problem.ticket_no ?? ''}`;
    const text = `${problem.title ?? 'Issue'} — ${body.reason ?? 'escalation raised'}`;
    const severity = body.severity ??
      (problem.urgency === 'critical' || problem.urgency === 'emergency' ? 'critical' : 'high');

    // In-app notifications
    if (userIds.length) {
      const rows = userIds.map((uid) => ({
        user_id: uid,
        title,
        body: text,
        type: 'escalation',
        severity,
        constituency: problem.constituency ?? null,
        department: problem.department ?? null,
        data: {
          problem_id: problem.id,
          escalation_id: body.escalation_id ?? null,
          ticket_no: problem.ticket_no,
        },
      }));
      await supabase.from('notifications').insert(rows);
    }

    // Push (per user_id so it actually lands)
    await Promise.all(userIds.map((uid) =>
      supabase.functions.invoke('send-push', {
        body: {
          title,
          body: text,
          type: 'escalation',
          severity,
          url: '/admin',
          target: { user_id: uid },
        },
      }).catch(() => {})
    ));

    return new Response(JSON.stringify({ ok: true, notified: userIds.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('[notify-escalation]', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
