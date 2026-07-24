// Fire-and-forget notification helpers. Never throw — failures are silently logged.
// SMS to citizen for status updates. Email to admin/cadre stakeholders.
import { supabase } from '@/integrations/supabase/client';

export type SmsTrigger = 'REPORTED' | 'WORK_STARTED' | 'COMPLETED';
export type EmailTrigger =
  | 'REPORT_CREATED'
  | 'REPORT_ASSIGNED'
  | 'WORK_STARTED'
  | 'PROGRESS_UPDATED'
  | 'WORK_COMPLETED'
  | 'CITIZEN_CONFIRMED';

export const notifySms = (problemId: string, trigger: SmsTrigger) => {
  supabase.functions.invoke('send-sms', { body: { problemId, trigger } })
    .then(r => r.error && console.warn('[sms]', trigger, r.error))
    .catch(e => console.warn('[sms]', trigger, e));
};

export const notifyEmail = (problemId: string, trigger: EmailTrigger) => {
  supabase.functions.invoke('send-notification', { body: { problemId, trigger } })
    .then(r => r.error && console.warn('[email]', trigger, r.error))
    .catch(e => console.warn('[email]', trigger, e));
};

// Convenience: map a problem-status change to the right SMS + email triggers.
export const notifyStatusChange = (problemId: string, newStatus: string) => {
  switch (newStatus) {
    case 'in_progress':
    case 'work_started':
      notifySms(problemId, 'WORK_STARTED');
      notifyEmail(problemId, 'WORK_STARTED');
      break;
    case 'completed':
    case 'resolved':
      notifySms(problemId, 'COMPLETED');
      notifyEmail(problemId, 'WORK_COMPLETED');
      break;
    case 'citizen_confirmed':
      notifyEmail(problemId, 'CITIZEN_CONFIRMED');
      break;
  }
};
