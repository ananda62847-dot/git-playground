// Send branded notification emails to admins/cadres via custom SMTP (Gmail or any provider).
// Triggers: REPORT_CREATED | REPORT_ASSIGNED | WORK_STARTED | PROGRESS_UPDATED | WORK_COMPLETED | CITIZEN_CONFIRMED
// Resolves recipients via the get_notification_recipients RPC.
// Gracefully queues to email_outbox when SMTP not yet configured.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6.9.14';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SMTP_HOST = Deno.env.get('SMTP_HOST');
const SMTP_PORT = parseInt(Deno.env.get('SMTP_PORT') || '587');
const SMTP_USER = Deno.env.get('SMTP_USER');
const SMTP_PASS = Deno.env.get('SMTP_PASS');
const SMTP_FROM = Deno.env.get('SMTP_FROM') || SMTP_USER || '';

const SUBJECTS: Record<string, string> = {
  REPORT_CREATED: 'New citizen report — {ticket_no}',
  REPORT_ASSIGNED: 'Report assigned to your team — {ticket_no}',
  WORK_STARTED: 'Work started on report — {ticket_no}',
  PROGRESS_UPDATED: 'Progress update on report — {ticket_no}',
  WORK_COMPLETED: 'Report marked completed — {ticket_no}',
  CITIZEN_CONFIRMED: 'Citizen confirmed resolution — {ticket_no}',
};

function renderHtml(trigger: string, problem: any, recipientRole: string) {
  const baseUrl = 'https://tvk-makkal-osai.lovable.app';
  const intro: Record<string, string> = {
    REPORT_CREATED: 'A new report has been submitted by a citizen.',
    REPORT_ASSIGNED: 'A report has been assigned to your team for action.',
    WORK_STARTED: 'Field work has started on a report you are tracking.',
    PROGRESS_UPDATED: 'Progress has been updated on a report you are tracking.',
    WORK_COMPLETED: 'A report has been marked as completed by the field team.',
    CITIZEN_CONFIRMED: 'The citizen has confirmed the resolution of this report.',
  };
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f6f6f6;font-family:Arial,sans-serif;color:#222;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
      <div style="background:#C62828;color:#fff;padding:18px 22px;border-radius:12px 12px 0 0;">
        <div style="font-size:18px;font-weight:700;">Makkal Connect</div>
        <div style="font-size:12px;opacity:.9;">TVK Citizen Reporting</div>
      </div>
      <div style="background:#fff;border:1px solid #eee;border-top:none;padding:22px;border-radius:0 0 12px 12px;">
        <p style="margin:0 0 12px;font-size:14px;color:#666;text-transform:uppercase;letter-spacing:.5px;">${trigger.replace(/_/g, ' ')}</p>
        <p style="margin:0 0 16px;font-size:15px;">${intro[trigger] || ''}</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr><td style="padding:6px 0;color:#777;">Report ID</td><td style="padding:6px 0;font-weight:700;">${problem.ticket_no}</td></tr>
          <tr><td style="padding:6px 0;color:#777;">Title</td><td style="padding:6px 0;">${escapeHtml(problem.title || '')}</td></tr>
          <tr><td style="padding:6px 0;color:#777;">Department</td><td style="padding:6px 0;">${escapeHtml(problem.department || '')}</td></tr>
          <tr><td style="padding:6px 0;color:#777;">Category</td><td style="padding:6px 0;">${escapeHtml(problem.category || '')}</td></tr>
          <tr><td style="padding:6px 0;color:#777;">Constituency</td><td style="padding:6px 0;">${escapeHtml(problem.constituency || '—')}</td></tr>
          <tr><td style="padding:6px 0;color:#777;">Status</td><td style="padding:6px 0;">${escapeHtml(problem.status || '')}</td></tr>
        </table>
        <div style="margin-top:22px;text-align:center;">
          <a href="${baseUrl}/track?t=${problem.ticket_no}" style="display:inline-block;background:#C62828;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:14px;">View report</a>
        </div>
        <p style="margin:24px 0 0;font-size:11px;color:#999;text-align:center;">Sent to you as ${recipientRole.replace(/_/g, ' ')}. Do not reply.</p>
      </div>
    </div></body></html>`;
}
function escapeHtml(s: string) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)); }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { problemId, trigger } = await req.json();
    if (!problemId || !trigger || !SUBJECTS[trigger]) {
      return new Response(JSON.stringify({ error: 'invalid input' }), { status: 400, headers: corsHeaders });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: problem } = await supabase.from('problems').select('*').eq('id', problemId).maybeSingle();
    if (!problem) return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: corsHeaders });

    const { data: recipients } = await supabase.rpc('get_notification_recipients', { _problem_id: problemId, _trigger: trigger });
    if (!recipients || recipients.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const subject = SUBJECTS[trigger].replace('{ticket_no}', problem.ticket_no);
    const smtpReady = SMTP_HOST && SMTP_USER && SMTP_PASS && SMTP_FROM;
    let transporter: any = null;
    if (smtpReady) {
      transporter = nodemailer.createTransport({
        host: SMTP_HOST!,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465, // true for 465, false for 587 (STARTTLS)
        auth: { user: SMTP_USER!, pass: SMTP_PASS! },
      });
    }

    let sent = 0, queued = 0, failed = 0;
    for (const r of recipients as Array<{ email: string; role: string }>) {
      const html = renderHtml(trigger, problem, r.role);
      const idemKey = `${problem.id}-${trigger}-${r.email}`;
      const { data: existing } = await supabase.from('email_outbox').select('id, status').eq('idempotency_key', idemKey).maybeSingle();
      if (existing && existing.status === 'sent') continue;

      if (!smtpReady || !transporter) {
        await supabase.from('email_outbox').upsert({ problem_id: problem.id, trigger_code: trigger, recipient_email: r.email, recipient_role: r.role, subject, body_html: html, status: 'pending', idempotency_key: idemKey }, { onConflict: 'idempotency_key' });
        queued++;
        continue;
      }
      try {
        await transporter.sendMail({ from: SMTP_FROM, to: r.email, subject, html });
        await supabase.from('email_outbox').upsert({ problem_id: problem.id, trigger_code: trigger, recipient_email: r.email, recipient_role: r.role, subject, body_html: html, status: 'sent', sent_at: new Date().toISOString(), idempotency_key: idemKey }, { onConflict: 'idempotency_key' });
        sent++;
      } catch (e) {
        await supabase.from('email_outbox').upsert({ problem_id: problem.id, trigger_code: trigger, recipient_email: r.email, recipient_role: r.role, subject, body_html: html, status: 'failed', last_error: String(e).slice(0, 500), idempotency_key: idemKey }, { onConflict: 'idempotency_key' });
        failed++;
      }
    }
    if (transporter) transporter.close?.();
    return new Response(JSON.stringify({ ok: true, sent, queued, failed, configured: smtpReady }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
