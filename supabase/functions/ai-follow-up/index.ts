// Follow-up Agent: scans active assignments, sends reminders for stale work.
// Cron-driven (every 15 min). Auto-applies low-risk reminders (push only).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Thresholds (hours since last update) by urgency
const REMINDER_HOURS: Record<string, number> = {
  critical: 4, high: 8, medium: 24, low: 48,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Find active assignments where the problem isn't resolved
    const { data: assignments, error } = await supabase
      .from('problem_assignments')
      .select(`
        id, problem_id, cadre_id, claimed_by_cadre_id, team_id, created_at,
        problems!inner(id, ticket_no, title, status, urgency, updated_at)
      `)
      .eq('active', true)
      .not('problems.status', 'in', '(resolved,completed,citizen_confirmed,rejected)');

    if (error) throw error;

    let reminders = 0, skipped = 0;
    const now = Date.now();

    for (const a of assignments ?? []) {
      const p: any = a.problems;
      const urgency = (p.urgency || 'medium').toLowerCase();
      const threshold = REMINDER_HOURS[urgency] ?? 24;
      const lastUpdate = new Date(p.updated_at || a.created_at).getTime();
      const hoursSince = (now - lastUpdate) / 3600_000;
      if (hoursSince < threshold) { skipped++; continue; }

      // Dedupe: don't send another reminder if one was sent in the last `threshold` hours
      const cutoff = new Date(now - threshold * 3600_000).toISOString();
      const { data: recent } = await supabase
        .from('ai_decisions' as any)
        .select('id')
        .eq('agent_type', 'follow_up')
        .eq('entity_id', a.problem_id)
        .gte('created_at', cutoff)
        .limit(1);
      if (recent && recent.length) { skipped++; continue; }

      const cadreId = a.claimed_by_cadre_id || a.cadre_id;
      const confidence = 95;

      // Log decision (auto-applied)
      await supabase.from('ai_decisions' as any).insert({
        agent_type: 'follow_up',
        entity_type: 'problem',
        entity_id: a.problem_id,
        action: 'send_reminder',
        reason: `No update on ${p.ticket_no} for ${Math.round(hoursSince)}h (urgency: ${urgency}, threshold: ${threshold}h).`,
        confidence,
        status: 'auto_applied',
        applied_at: new Date().toISOString(),
        metadata: { cadre_id: cadreId, team_id: a.team_id, hours_since: Math.round(hoursSince), threshold },
      });

      // Dispatch into the cadre's AI Inbox (in-app + push + SMS if high pri)
      if (cadreId) {
        await supabase.functions.invoke('ai-dispatch-task', {
          body: {
            cadre_id: cadreId, problem_id: a.problem_id,
            action: 'follow_up',
            priority: urgency === 'critical' ? 'critical' : urgency === 'high' ? 'high' : 'normal',
            ai_message: `Reminder on ${p.ticket_no}: no update for ${Math.round(hoursSince)}h. Please post progress today.`,
            metadata: { hours_since: Math.round(hoursSince), threshold },
          },
        }).catch(() => {});
      }
      reminders++;
    }

    return new Response(JSON.stringify({ reminders, skipped, scanned: assignments?.length ?? 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[ai-follow-up]', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
