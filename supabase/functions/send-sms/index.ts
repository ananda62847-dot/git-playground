// Send SMS to citizens via Twilio REST API for problem status updates.
// Triggers: REPORTED | WORK_STARTED | COMPLETED
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// Prefer Account SID + Auth Token (standard Twilio REST). Fallback to connector if SID absent.
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || Deno.env.get('TWILIO_API_KEY');
const TWILIO_FROM = Deno.env.get('TWILIO_FROM') || '';

const TEMPLATES: Record<string, (id: string) => string> = {
  REPORTED: (id) => `Makkal Connect: Your report has been successfully submitted. Report ID: ${id}. Our team will review and process it shortly. Track status anytime using your Report ID.`,
  WORK_STARTED: (id) => `Makkal Connect: Work has started on your reported issue (Report ID: ${id}). Our field team is currently addressing the problem. Thank you for your patience.`,
  COMPLETED: (id) => `Makkal Connect: Your reported issue (Report ID: ${id}) has been marked as completed by the field team. Thank you for helping improve your constituency.`,
  WELFARE_SUBMITTED: (id) => `Makkal Connect: Your welfare/scheme issue has been received. Ticket: ${id}. We will follow up with the concerned department.`,
  WELFARE_PROCESSING: (id) => `Makkal Connect: Your welfare/scheme issue (${id}) is now being processed by the concerned department.`,
  WELFARE_RESOLVED: (id) => `Makkal Connect: Your welfare/scheme issue (${id}) has been resolved. Please confirm if the benefit reached you.`,
};

function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (raw.startsWith('+')) return raw;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { problemId, welfareId, trigger } = await req.json();
    if (!trigger || !TEMPLATES[trigger] || (!problemId && !welfareId)) {
      return new Response(JSON.stringify({ error: 'invalid input' }), { status: 400, headers: corsHeaders });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    let ticket_no = '', reporter_phone = '', recordId = '';
    if (welfareId) {
      const { data: w } = await supabase.from('welfare_issues').select('id, ticket_no, reporter_phone').eq('id', welfareId).maybeSingle();
      if (!w) return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: corsHeaders });
      ticket_no = w.ticket_no; reporter_phone = w.reporter_phone; recordId = w.id;
    } else {
      const { data: problem } = await supabase.from('problems').select('id, ticket_no, reporter_phone').eq('id', problemId).maybeSingle();
      if (!problem) return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: corsHeaders });
      ticket_no = problem.ticket_no; reporter_phone = problem.reporter_phone; recordId = problem.id;
    }

    const to = normalizePhone(reporter_phone);
    const message = TEMPLATES[trigger](ticket_no);
    const idemKey = `${recordId}-${trigger}`;

    const logIt = async (row: Record<string, unknown>) => {
      if (welfareId) return; // sms_log is tied to problems; skip for welfare
      await supabase.from('sms_log').insert({ problem_id: recordId, ...row });
    };

    const { data: existing } = await supabase.from('sms_log').select('id, status').eq('idempotency_key', idemKey).maybeSingle();
    if (existing && existing.status === 'sent') {
      return new Response(JSON.stringify({ skipped: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!to) {
      await logIt({ trigger_code: trigger, recipient_phone: reporter_phone || '', message, status: 'failed', error: 'invalid phone', idempotency_key: idemKey });
      return new Response(JSON.stringify({ error: 'invalid phone' }), { status: 400, headers: corsHeaders });
    }

    if (!TWILIO_FROM || !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      await logIt({ trigger_code: trigger, recipient_phone: to, message, status: 'queued', error: 'twilio not configured', idempotency_key: idemKey });
      return new Response(JSON.stringify({ queued: true, configured: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Send via Twilio REST API directly using Account SID + Auth Token
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: TWILIO_FROM, Body: message }),
    });
    const data = await res.json();
    if (!res.ok) {
      await logIt({ trigger_code: trigger, recipient_phone: to, message, status: 'failed', error: JSON.stringify(data).slice(0, 500), idempotency_key: idemKey });
      return new Response(JSON.stringify({ error: data }), { status: 502, headers: corsHeaders });
    }
    await logIt({ trigger_code: trigger, recipient_phone: to, message, status: 'sent', provider_sid: data.sid, sent_at: new Date().toISOString(), idempotency_key: idemKey });
    return new Response(JSON.stringify({ ok: true, sid: data.sid }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
