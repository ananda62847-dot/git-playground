// Fire-and-forget push notification helpers.
// Calls the `send-push` edge function which targets FCM tokens
// stored in `notification_tokens`. Never throws.
import { supabase } from '@/integrations/supabase/client';

export interface PushTarget {
  role?: 'cadre' | 'constituency_admin' | 'department_admin' | 'super_admin';
  roles?: string[];
  constituency?: string | null;
  department?: string | null;
  user_id?: string | null;
}

export interface PushPayload {
  title: string;
  body: string;
  type?: string;
  severity?: 'info' | 'medium' | 'high' | 'critical';
  url?: string;
  data?: Record<string, string>;
  target: PushTarget;
}

export const sendPush = (payload: PushPayload) => {
  const clean: any = { ...payload, target: { ...payload.target } };
  Object.keys(clean.target).forEach(k => clean.target[k] == null && delete clean.target[k]);
  supabase.functions
    .invoke('send-push', { body: clean })
    .then(r => r.error && console.warn('[push]', payload.title, r.error))
    .catch(e => console.warn('[push]', payload.title, e));
};

// Convenience: lookup cadre.user_id by cadre id, then push to that user.
export const pushToCadre = async (cadreId: string, payload: Omit<PushPayload, 'target'>) => {
  const { data } = await supabase.from('cadres').select('user_id').eq('id', cadreId).maybeSingle();
  if (data?.user_id) sendPush({ ...payload, target: { user_id: data.user_id } });
};

// Convenience: push to all members of a team.
export const pushToTeam = async (teamId: string, payload: Omit<PushPayload, 'target'>) => {
  const { data: members } = await supabase
    .from('team_members').select('cadre_id').eq('team_id', teamId);
  if (!members?.length) return;
  const { data: cads } = await supabase
    .from('cadres').select('user_id').in('id', members.map(m => m.cadre_id));
  (cads || []).forEach(c => c.user_id && sendPush({ ...payload, target: { user_id: c.user_id } }));
};
