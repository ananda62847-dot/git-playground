import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, StickyNote, Send, Trash2 } from 'lucide-react';
import { fmtIST } from '@/lib/datetime';
import { toast } from 'sonner';

interface Note { id: string; note: string; author_label: string | null; author_user_id: string | null; created_at: string; }

const CorruptionInternalNotes: React.FC<{ corruptionId: string }> = ({ corruptionId }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uid, setUid] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('corruption_internal_notes' as any)
      .select('*').eq('corruption_id', corruptionId).order('created_at', { ascending: false });
    setNotes(((data as any) || []) as Note[]);
    setLoading(false);
  };
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id || null));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corruptionId]);

  const add = async () => {
    if (!text.trim()) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    let label: string | null = user?.email || null;
    if (user) {
      const { data: p } = await supabase.from('profiles').select('email').eq('user_id', user.id).maybeSingle();
      label = p?.email || label;
    }
    const { error } = await supabase.from('corruption_internal_notes' as any).insert({
      corruption_id: corruptionId, note: text.trim(),
      author_user_id: user?.id || null, author_label: label,
    } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    setText('');
    load();
  };

  const del = async (id: string) => {
    if (!confirm('Delete this note?')) return;
    const { error } = await supabase.from('corruption_internal_notes' as any).delete().eq('id', id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="border-t pt-3">
      <div className="text-xs font-semibold mb-2 inline-flex items-center gap-1.5">
        <StickyNote className="w-3.5 h-3.5" />Internal notes <span className="text-muted-foreground">(admin/moderator only)</span>
      </div>
      <div className="space-y-2 mb-2 max-h-52 overflow-y-auto">
        {loading && <div className="text-xs text-muted-foreground">Loading…</div>}
        {!loading && notes.length === 0 && <div className="text-xs text-muted-foreground italic">No notes yet.</div>}
        {notes.map(n => (
          <div key={n.id} className="bg-muted/50 rounded p-2 text-xs">
            <div className="flex items-center justify-between mb-0.5">
              <div className="font-medium">{n.author_label || 'Admin'}</div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{fmtIST(n.created_at)}</span>
                {n.author_user_id === uid && (
                  <button onClick={() => del(n.id)} className="text-rose-600 hover:opacity-75" title="Delete">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            <div className="whitespace-pre-wrap break-words">{n.note}</div>
          </div>
        ))}
      </div>
      <div className="flex items-start gap-2">
        <Textarea rows={2} value={text} onChange={e => setText(e.target.value)} placeholder="Add an internal note…" className="text-xs" />
        <Button size="sm" onClick={add} disabled={busy || !text.trim()}>
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </div>
  );
};

export default CorruptionInternalNotes;
