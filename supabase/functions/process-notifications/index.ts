// Drains the pgmq notification queues. Invoked by pg_cron every minute.
// Decouples SMS/email delivery from the citizen-facing request path,
// so a Twilio outage or rate-limit cannot slow down report submission.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const BATCH = 25;
const VISIBILITY_SEC = 60;

async function drain(queue: string, fnName: string, supabase: ReturnType<typeof createClient>) {
  let processed = 0, failed = 0;
  for (let i = 0; i < BATCH; i++) {
    const { data: msgs, error } = await supabase.schema('pgmq').rpc('read', {
      queue_name: queue, vt: VISIBILITY_SEC, qty: 1,
    });
    if (error || !msgs || msgs.length === 0) break;
    const msg = msgs[0] as { msg_id: number; message: { problemId: string; trigger: string } };
    try {
      const { error: invokeErr } = await supabase.functions.invoke(fnName, { body: msg.message });
      if (invokeErr) throw invokeErr;
      await supabase.schema('pgmq').rpc('delete', { queue_name: queue, msg_id: msg.msg_id });
      processed++;
    } catch (e) {
      console.error(`[${queue}] msg ${msg.msg_id} failed`, e);
      failed++;
      // leave it; visibility timeout will return it for retry
    }
  }
  return { processed, failed };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const sms = await drain('notifications_sms', 'send-sms', supabase);
    const email = await drain('notifications_email', 'send-notification', supabase);
    return new Response(JSON.stringify({ sms, email }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
