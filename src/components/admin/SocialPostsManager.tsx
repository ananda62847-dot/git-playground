import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Pin, Trash2, Send } from 'lucide-react';
import { constituenciesByCity as CONSTITUENCIES } from '@/lib/constituencies';
import { fmtIST } from '@/lib/datetime';

const SocialPostsManager: React.FC<{ isAdmin: boolean; allowedConstituencies?: string[] }> = ({ isAdmin, allowedConstituencies }) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [form, setForm] = useState({ title:'', body:'', constituency:'', category:'announcement', pinned:false, image_url:'' });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const load = async () => {
    const { data } = await supabase.from('social_posts').select('*').order('created_at', { ascending: false }).limit(100);
    setPosts(data || []);
  };
  useEffect(() => { load(); }, []);

  const publish = async () => {
    if (form.body.trim().length < 5) return toast.error('Body too short');
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from('social_posts').insert({
      author_id: u.user?.id, author_name: u.user?.email?.split('@')[0] || 'TVK',
      title: form.title || null, body: form.body, constituency: form.constituency || null,
      category: form.category, pinned: form.pinned, image_url: form.image_url || null,
    });
    if (error) return toast.error(error.message);
    toast.success('Published'); setForm({ title:'', body:'', constituency:'', category:'announcement', pinned:false, image_url:'' });
    load();
  };

  const del = async (id: string) => { if (!confirm('Delete?')) return; await supabase.from('social_posts').delete().eq('id', id); load(); };
  const togglePin = async (id: string, pinned: boolean) => { await supabase.from('social_posts').update({ pinned: !pinned }).eq('id', id); load(); };

  const allowed = isAdmin ? Array.from(new Set(Object.values(CONSTITUENCIES).flat())) : (allowedConstituencies || []);

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <h3 className="font-bold text-sm">Publish update</h3>
        <Input placeholder="Title (optional)" value={form.title} onChange={e => set('title', e.target.value)} />
        <Textarea rows={3} placeholder="What do you want to announce?" value={form.body} onChange={e => set('body', e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <select value={form.constituency} onChange={e => set('constituency', e.target.value)} className="h-10 px-2 rounded border border-input bg-background text-sm">
            <option value="">All / State-wide</option>
            {allowed.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={form.category} onChange={e => set('category', e.target.value)} className="h-10 px-2 rounded border border-input bg-background text-sm">
            <option value="announcement">Announcement</option>
            <option value="completed_work">Completed Work</option>
            <option value="event">Event / Camp</option>
            <option value="alert">Alert</option>
          </select>
        </div>
        <Input placeholder="Image URL (optional)" value={form.image_url} onChange={e => set('image_url', e.target.value)} />
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.pinned} onChange={e => set('pinned', e.target.checked)} />Pin to top</label>
        <Button onClick={publish}><Send className="w-4 h-4 mr-1" />Publish</Button>
      </div>

      <div className="space-y-2">
        {posts.map(p => (
          <div key={p.id} className="bg-card border border-border rounded-lg p-3">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                {p.title && <div className="font-semibold text-sm">{p.title}</div>}
                <div className="text-[11px] text-muted-foreground">{p.category} · {p.constituency || 'state-wide'} · {fmtIST(p.created_at)}</div>
                <p className="text-sm mt-1 whitespace-pre-wrap break-words">{p.body}</p>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => togglePin(p.id, p.pinned)} title="Pin"><Pin className={`w-4 h-4 ${p.pinned ? 'text-primary' : 'text-muted-foreground'}`} /></button>
                {isAdmin && <button onClick={() => del(p.id)}><Trash2 className="w-4 h-4 text-red-500" /></button>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default SocialPostsManager;
