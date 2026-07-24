import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { StickyNote, Plus, Trash2, CheckCircle2, Circle, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';

type Kind = 'problem' | 'welfare' | 'corruption' | 'fund';
const COL: Record<Kind, string> = {
  problem: 'problem_id', welfare: 'welfare_id', corruption: 'corruption_id', fund: 'fund_request_id',
};

interface Props {
  kind: Kind;
  reportId: string;
}

/**
 * Sticky notes + upcoming tasks scoped to a single report. Admins/moderators only.
 */
const ReportInternalNotes: React.FC<Props> = ({ kind, reportId }) => {
  const col = COL[kind];
  const [uid, setUid] = useState<string | null>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [body, setBody] = useState('');
  const [title, setTitle] = useState('');
  const [isTask, setIsTask] = useState(false);
  const [dueAt, setDueAt] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const q: any = supabase.from('admin_sticky_notes').select('*');
    const { data, error } = await q
      .eq(col, reportId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    setNotes(data || []);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUid(user?.id || null);
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  const add = async () => {
    if (!uid) return;
    if (!body.trim() && !title.trim()) return toast.error('Add a title or body');
    const row: any = {
      owner_user_id: uid,
      title: title || null,
      body,
      shared: true, // per-report notes are visible to all admins
      is_task: isTask,
      due_at: isTask && dueAt ? new Date(dueAt).toISOString() : null,
      [col]: reportId,
    };
    const { error } = await supabase.from('admin_sticky_notes').insert(row);
    if (error) return toast.error(error.message);
    setBody(''); setTitle(''); setIsTask(false); setDueAt('');
    load();
  };

  const toggle = async (n: any) => {
    if (n.owner_user_id !== uid) return;
    await supabase.from('admin_sticky_notes').update({ done: !n.done }).eq('id', n.id);
    load();
  };
  const del = async (n: any) => {
    if (n.owner_user_id !== uid) return;
    if (!confirm('Delete this note?')) return;
    await supabase.from('admin_sticky_notes').delete().eq('id', n.id);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <StickyNote className="w-4 h-4 text-primary" />
        <div className="font-semibold text-sm">Internal notes & upcoming tasks</div>
      </div>

      <div className="border rounded-lg p-2 space-y-2 bg-muted/30">
        <Input placeholder="Title (optional)" value={title} onChange={e => setTitle(e.target.value)} className="h-8" />
        <Textarea rows={2} placeholder="Note / follow-up…" value={body} onChange={e => setBody(e.target.value)} />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1 text-xs">
            <Checkbox checked={isTask} onCheckedChange={v => setIsTask(!!v)} /> Upcoming task
          </label>
          {isTask && (
            <Input type="datetime-local" className="h-8 w-52" value={dueAt} onChange={e => setDueAt(e.target.value)} />
          )}
          <Button size="sm" className="ml-auto" onClick={add}><Plus className="w-3 h-3 mr-1" />Add</Button>
        </div>
      </div>

      {loading ? <div className="text-xs text-muted-foreground">Loading…</div>
        : notes.length === 0 ? <div className="text-xs text-muted-foreground">No internal notes yet.</div>
        : (
          <div className="space-y-2">
            {notes.map(n => (
              <div key={n.id} className="border rounded-lg p-2 text-xs bg-white">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {n.is_task && (
                      <button onClick={() => toggle(n)} aria-label="toggle done">
                        {n.done ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Circle className="w-4 h-4 text-gray-500" />}
                      </button>
                    )}
                    {n.title && <div className={`font-semibold ${n.done ? 'line-through opacity-60' : ''}`}>{n.title}</div>}
                  </div>
                  {n.owner_user_id === uid && (
                    <button onClick={() => del(n)} className="text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  )}
                </div>
                {n.body && <div className={`mt-1 whitespace-pre-wrap ${n.done ? 'line-through opacity-60' : ''}`}>{n.body}</div>}
                {n.due_at && (
                  <div className="mt-1 text-[10px] text-muted-foreground flex items-center gap-1">
                    <CalendarClock className="w-3 h-3" />{new Date(n.due_at).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  );
};

export default ReportInternalNotes;
