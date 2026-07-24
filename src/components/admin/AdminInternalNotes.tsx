import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Pin, PinOff, Trash2, StickyNote, CalendarClock, CheckCircle2, Circle, Users } from 'lucide-react';
import { toast } from 'sonner';

type Note = {
  id: string;
  owner_user_id: string;
  title: string | null;
  body: string;
  color: string;
  pinned: boolean;
  shared: boolean;
  is_task: boolean;
  done: boolean;
  due_at: string | null;
  created_at: string;
  updated_at: string;
  problem_id?: string | null;
  welfare_id?: string | null;
  corruption_id?: string | null;
  fund_request_id?: string | null;
};

const COLORS = [
  { key: 'yellow', bg: 'bg-yellow-100 border-yellow-300' },
  { key: 'pink',   bg: 'bg-pink-100 border-pink-300' },
  { key: 'green',  bg: 'bg-green-100 border-green-300' },
  { key: 'blue',   bg: 'bg-blue-100 border-blue-300' },
  { key: 'purple', bg: 'bg-purple-100 border-purple-300' },
];

const colorBg = (k: string) => COLORS.find(c => c.key === k)?.bg || COLORS[0].bg;

const AdminInternalNotes: React.FC = () => {
  const [uid, setUid] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Partial<Note>>({ color: 'yellow', body: '', shared: false, is_task: false });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUid(user?.id || null);
      await reload();
    })();
  }, []);

  const reload = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_sticky_notes')
      .select('*')
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false });
    if (error) toast.error(error.message);
    setNotes((data as Note[]) || []);
    setLoading(false);
  };

  const create = async () => {
    if (!uid) return;
    if (!draft.body?.trim() && !draft.title?.trim()) { toast.error('Add a title or body'); return; }
    const { error } = await supabase.from('admin_sticky_notes').insert({
      owner_user_id: uid,
      title: draft.title || null,
      body: draft.body || '',
      color: draft.color || 'yellow',
      shared: !!draft.shared,
      is_task: !!draft.is_task,
      due_at: draft.due_at || null,
    });
    if (error) return toast.error(error.message);
    setDraft({ color: 'yellow', body: '', shared: false, is_task: false });
    setShowForm(false);
    reload();
  };

  const patch = async (id: string, changes: Partial<Note>) => {
    const { error } = await supabase.from('admin_sticky_notes').update(changes).eq('id', id);
    if (error) return toast.error(error.message);
    reload();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this note?')) return;
    const { error } = await supabase.from('admin_sticky_notes').delete().eq('id', id);
    if (error) return toast.error(error.message);
    reload();
  };

  const filter = (fn: (n: Note) => boolean) => notes.filter(fn);
  const upcoming = filter(n => n.is_task && !n.done);
  const done = filter(n => n.is_task && n.done);
  const stickies = filter(n => !n.is_task);

  const NoteCard = ({ n }: { n: Note }) => {
    const mine = n.owner_user_id === uid;
    return (
      <div className={`rounded-lg border p-3 shadow-sm ${colorBg(n.color)} relative`}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-1 flex-wrap">
            {n.is_task && (
              <button onClick={() => mine && patch(n.id, { done: !n.done })} disabled={!mine} aria-label="toggle done">
                {n.done ? <CheckCircle2 className="w-4 h-4 text-green-700" /> : <Circle className="w-4 h-4 text-gray-500" />}
              </button>
            )}
            {n.title && <div className={`text-sm font-semibold ${n.done ? 'line-through opacity-60' : ''}`}>{n.title}</div>}
            {n.shared && <Badge variant="secondary" className="text-[9px] px-1 py-0"><Users className="w-3 h-3 mr-0.5" />shared</Badge>}
          </div>
          {mine && (
            <div className="flex items-center gap-0.5">
              <button onClick={() => patch(n.id, { pinned: !n.pinned })} className="p-1 hover:bg-black/5 rounded" title="pin">
                {n.pinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5 opacity-50" />}
              </button>
              <button onClick={() => remove(n.id)} className="p-1 hover:bg-black/5 rounded" title="delete">
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
              </button>
            </div>
          )}
        </div>
        {n.body && (
          <div className={`text-xs whitespace-pre-wrap ${n.done ? 'line-through opacity-60' : ''}`}>{n.body}</div>
        )}
        {n.due_at && (
          <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
            <CalendarClock className="w-3 h-3" />
            {new Date(n.due_at).toLocaleString()}
          </div>
        )}
        {(n.problem_id || n.welfare_id || n.corruption_id || n.fund_request_id) && (
          <div className="mt-1 text-[10px] text-muted-foreground">Linked to a report</div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardContent className="p-3 md:p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-primary" />
            <div className="font-semibold text-sm">Internal Notes & Upcoming Tasks</div>
          </div>
          <Button size="sm" onClick={() => setShowForm(v => !v)}>
            <Plus className="w-4 h-4 mr-1" />New
          </Button>
        </div>

        {showForm && (
          <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
            <Input placeholder="Title (optional)" value={draft.title || ''} onChange={e => setDraft({ ...draft, title: e.target.value })} />
            <Textarea rows={3} placeholder="Note / details…" value={draft.body || ''} onChange={e => setDraft({ ...draft, body: e.target.value })} />
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1">
                {COLORS.map(c => (
                  <button key={c.key}
                    onClick={() => setDraft({ ...draft, color: c.key })}
                    className={`w-6 h-6 rounded-full border-2 ${c.bg} ${draft.color === c.key ? 'ring-2 ring-primary' : ''}`}
                    aria-label={c.key}
                  />
                ))}
              </div>
              <label className="flex items-center gap-1 text-xs">
                <Checkbox checked={!!draft.is_task} onCheckedChange={v => setDraft({ ...draft, is_task: !!v })} />
                Upcoming task
              </label>
              <label className="flex items-center gap-1 text-xs">
                <Checkbox checked={!!draft.shared} onCheckedChange={v => setDraft({ ...draft, shared: !!v })} />
                Share with all admins
              </label>
              {draft.is_task && (
                <Input type="datetime-local" className="h-8 w-52"
                  value={draft.due_at ? draft.due_at.slice(0, 16) : ''}
                  onChange={e => setDraft({ ...draft, due_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" onClick={create}>Save</Button>
            </div>
          </div>
        )}

        <Tabs defaultValue="stickies">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="stickies">Sticky ({stickies.length})</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="done">Done ({done.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="stickies" className="mt-3">
            {loading ? <div className="text-xs text-muted-foreground">Loading…</div>
              : stickies.length === 0 ? <div className="text-xs text-muted-foreground">No sticky notes yet.</div>
              : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">{stickies.map(n => <NoteCard key={n.id} n={n} />)}</div>}
          </TabsContent>
          <TabsContent value="upcoming" className="mt-3">
            {upcoming.length === 0 ? <div className="text-xs text-muted-foreground">Nothing planned.</div>
              : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">{upcoming.map(n => <NoteCard key={n.id} n={n} />)}</div>}
          </TabsContent>
          <TabsContent value="done" className="mt-3">
            {done.length === 0 ? <div className="text-xs text-muted-foreground">No completed tasks.</div>
              : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">{done.map(n => <NoteCard key={n.id} n={n} />)}</div>}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AdminInternalNotes;
