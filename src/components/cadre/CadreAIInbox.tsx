import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Brain, ExternalLink, Loader2, Send, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useT } from '@/lib/i18n/cadreT';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';

type Task = {
  id: string;
  ai_message: string;
  problem_id: string | null;
  created_at: string;
  status: string;
  metadata: any;
};

/**
 * Minimal AI inbox: shows AI questions with the linked report's ticket. Once the
 * cadre types a reply and taps Send, the task is marked done and disappears.
 * No status filters, no AI-drafted replies, no snooze — just AI asks → cadre answers.
 */
const CadreAIInbox: React.FC<{ cadreId: string }> = ({ cadreId }) => {
  const T = useT();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [tickets, setTickets] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!cadreId) return;
    const { data, error } = await supabase
      .from('cadre_ai_tasks' as any)
      .select('id,ai_message,problem_id,created_at,status,metadata')
      .eq('cadre_id', cadreId)
      .not('status', 'in', '("done","declined","expired")')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    const list = ((data ?? []) as unknown) as Task[];
    setTasks(list);
    setLoading(false);
    const pids = Array.from(new Set(list.map(t => t.problem_id).filter(Boolean))) as string[];
    if (pids.length) {
      const { data: probs } = await supabase.from('problems').select('id,ticket_no').in('id', pids);
      const m: Record<string, string> = {};
      (probs || []).forEach((p: any) => { m[p.id] = p.ticket_no; });
      setTickets(m);
    }
  }, [cadreId]);

  useEffect(() => {
    load();
    if (!cadreId) return;
    const ch = supabase
      .channel(`ai_inbox_${cadreId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cadre_ai_tasks', filter: `cadre_id=eq.${cadreId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [cadreId, load]);

  const send = async (task: Task) => {
    const text = (replies[task.id] || '').trim();
    if (!text) return toast.error(T.type_reply_first);
    setSending(s => ({ ...s, [task.id]: true }));
    const { error } = await supabase.from('cadre_ai_tasks' as any).update({
      status: 'done',
      cadre_response: text,
      reply_text: text,
      acknowledged_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    }).eq('id', task.id);
    if (error) { setSending(s => ({ ...s, [task.id]: false })); return toast.error(error.message); }
    if (task.problem_id) {
      const combined = `AI asked: ${task.ai_message}\n\nCadre reply: ${text}`;
      await supabase.from('problem_updates').insert({
        problem_id: task.problem_id, status: 'in_progress', note: combined.slice(0, 4000),
      } as any);
    }
    setTasks(ts => ts.filter(t => t.id !== task.id));
    setReplies(r => { const n = { ...r }; delete n[task.id]; return n; });
    setSending(s => ({ ...s, [task.id]: false }));
    toast.success(T.reply_sent);
  };

  const tt = useAutoTranslate(tasks.map(t => ({ id: t.id, text: t.ai_message })));

  if (loading) return <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-24 rounded-lg bg-muted/40 animate-pulse" />)}</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-violet-600" />
        <h3 className="font-semibold text-sm">{T.ai_inbox_title}</h3>
        <Badge variant="outline" className="text-[10px]">{tasks.length} {T.awaiting}</Badge>
      </div>
      {tasks.length === 0 && (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">{T.all_caught_up}</CardContent></Card>
      )}
      {tasks.map(t => (
        <Card key={t.id}>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  {t.problem_id && tickets[t.problem_id] && (
                    <span className="font-mono text-[11px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">{tickets[t.problem_id]}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(t.created_at))} ago</span>
                </div>
                <p className="text-sm leading-snug">{tt(t.id, t.ai_message)}</p>
              </div>
            </div>
            <Textarea
              value={replies[t.id] || ''}
              onChange={e => setReplies(r => ({ ...r, [t.id]: e.target.value }))}
              placeholder={T.type_reply}
              rows={2}
              className="text-sm"
            />
            <div className="flex items-center gap-2">
              {t.problem_id && (
                <Button size="sm" variant="ghost" className="h-8" onClick={() => navigate(`/cadre/report/${t.problem_id}`)}>
                  <ExternalLink className="w-3.5 h-3.5 mr-1" />{T.open_report}
                </Button>
              )}
              <Button size="sm" className="h-8 ml-auto" onClick={() => send(t)} disabled={sending[t.id]}>
                {sending[t.id] ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                {T.send_reply}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CadreAIInbox;