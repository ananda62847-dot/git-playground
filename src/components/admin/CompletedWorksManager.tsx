import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Loader2, Image as ImageIcon, Trash2, Edit3, Star, Eye, EyeOff, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { DEPARTMENTS } from '@/lib/departments';
import { constituenciesByCity as CONSTITUENCIES } from '@/lib/constituencies';

interface Review { name: string; rating: number; comment: string; }

const empty = {
  title: '', description: '', cover_image_url: '', before_image_url: '', after_image_url: '',
  gallery_urls: [] as string[], department: '', city: '', constituency: '', area: '',
  beneficiaries: '', cost_amount: '', completed_on: '', reviews: [] as Review[],
  highlight: false, published: true,
};

const upload = async (file: File, prefix: string) => {
  const path = `${prefix}/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi,'_')}`;
  const { error } = await supabase.storage.from('completed-works').upload(path, file, { contentType: file.type });
  if (error) throw error;
  return supabase.storage.from('completed-works').getPublicUrl(path).data.publicUrl;
};

const CompletedWorksManager: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);
  const [busy, setBusy] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiTicket, setAiTicket] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('completed_works').select('*').order('created_at', { ascending: false });
    setRows(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (r: any) => {
    setEditing(r);
    setForm({
      ...empty, ...r,
      beneficiaries: r.beneficiaries ?? '', cost_amount: r.cost_amount ?? '',
      completed_on: r.completed_on || '', gallery_urls: r.gallery_urls || [], reviews: r.reviews || [],
    });
    setOpen(true);
  };

  const handleFileUpload = async (key: string, file: File | null) => {
    if (!file) return;
    setBusy(true);
    try { const url = await upload(file, key); set(key, url); toast.success('Uploaded'); }
    catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const addGallery = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const urls = await Promise.all(Array.from(files).map(f => upload(f, 'gallery')));
      set('gallery_urls', [...(form.gallery_urls || []), ...urls]);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const removeGallery = (i: number) => set('gallery_urls', form.gallery_urls.filter((_: any, idx: number) => idx !== i));

  const addReview = () => set('reviews', [...form.reviews, { name: '', rating: 5, comment: '' }]);
  const updReview = (i: number, k: keyof Review, v: any) => {
    const next = [...form.reviews]; (next[i] as any)[k] = v; set('reviews', next);
  };
  const rmReview = (i: number) => set('reviews', form.reviews.filter((_: Review, idx: number) => idx !== i));

  const submit = async () => {
    if (!form.title.trim()) return toast.error('Title required');
    setBusy(true);
    const payload: any = {
      title: form.title.trim(), description: form.description?.trim() || null,
      cover_image_url: form.cover_image_url || null, before_image_url: form.before_image_url || null,
      after_image_url: form.after_image_url || null, gallery_urls: form.gallery_urls,
      department: form.department || null, city: form.city || null,
      constituency: form.constituency || null, area: form.area || null,
      beneficiaries: form.beneficiaries ? Number(form.beneficiaries) : null,
      cost_amount: form.cost_amount ? Number(form.cost_amount) : null,
      completed_on: form.completed_on || null, reviews: form.reviews,
      highlight: form.highlight, published: form.published,
    };
    const { error } = editing
      ? await supabase.from('completed_works').update(payload).eq('id', editing.id)
      : await supabase.from('completed_works').insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? 'Updated' : 'Created'); setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this work?')) return;
    const { error } = await supabase.from('completed_works').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Deleted'); load();
  };

  const togglePublished = async (r: any) => {
    await supabase.from('completed_works').update({ published: !r.published }).eq('id', r.id);
    load();
  };

  const autoDraft = async () => {
    const t = aiTicket.trim();
    if (!t) return toast.error('Enter a ticket number (e.g. MC-XXXXXXXX)');
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-draft-completed-work', { body: { ticket_no: t } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Draft created — review before publishing');
      setAiOpen(false); setAiTicket(''); load();
      if (data?.work) openEdit(data.work);
    } catch (e: any) {
      toast.error(e?.message || 'AI draft failed');
    } finally { setAiBusy(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="text-xs text-muted-foreground">{rows.length} completed works</div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setAiOpen(true)}><Sparkles className="w-4 h-4 mr-1" />AI Auto-draft</Button>
          <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" />Add Work</Button>
        </div>
      </div>

      {loading ? <div className="text-center py-10 text-sm text-muted-foreground">Loading…</div> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.length === 0 && <div className="col-span-full text-sm text-muted-foreground text-center py-8">No completed works yet</div>}
          {rows.map(r => (
            <div key={r.id} className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="aspect-square bg-muted relative">
                {r.cover_image_url || r.after_image_url
                  ? <img src={r.cover_image_url || r.after_image_url} alt={r.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ImageIcon className="w-8 h-8" /></div>}
                {r.highlight && <Badge className="absolute top-2 left-2 bg-yellow-500 text-black"><Star className="w-3 h-3 mr-1" />Featured</Badge>}
                {!r.published && <Badge className="absolute top-2 right-2" variant="secondary">Draft</Badge>}
              </div>
              <div className="p-3">
                <div className="font-semibold text-sm truncate">{r.title}</div>
                <div className="text-[11px] text-muted-foreground truncate">{[r.area, r.constituency, r.city].filter(Boolean).join(' · ') || '—'}</div>
                <div className="flex gap-1 mt-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(r)} className="flex-1"><Edit3 className="w-3 h-3 mr-1" />Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => togglePublished(r)}>{r.published ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}</Button>
                  <Button size="sm" variant="outline" onClick={() => remove(r.id)}><Trash2 className="w-3 h-3 text-red-600" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-2 md:p-4" onClick={() => setOpen(false)}>
          <div className="bg-card border border-border rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-10 bg-card border-b p-4 flex justify-between items-center">
              <h3 className="font-bold">{editing ? 'Edit' : 'Add'} Completed Work</h3>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="p-4 space-y-4">
              <div><Label>Title *</Label><Input value={form.title} onChange={e => set('title', e.target.value)} /></div>
              <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} /></div>

              <div className="grid sm:grid-cols-3 gap-3">
                <PhotoBox label="Cover" url={form.cover_image_url} onPick={(f) => handleFileUpload('cover_image_url', f)} onClear={() => set('cover_image_url','')} />
                <PhotoBox label="Before" url={form.before_image_url} onPick={(f) => handleFileUpload('before_image_url', f)} onClear={() => set('before_image_url','')} />
                <PhotoBox label="After" url={form.after_image_url} onPick={(f) => handleFileUpload('after_image_url', f)} onClear={() => set('after_image_url','')} />
              </div>

              <div>
                <Label>Gallery</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {form.gallery_urls.map((u: string, i: number) => (
                    <div key={i} className="relative group">
                      <img src={u} alt="" className="w-20 h-20 rounded object-cover border" />
                      <button onClick={() => removeGallery(i)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                  <label className="w-20 h-20 border-2 border-dashed rounded flex items-center justify-center cursor-pointer hover:bg-muted">
                    <Plus className="w-5 h-5 text-muted-foreground" />
                    <input type="file" hidden multiple accept="image/*" onChange={e => addGallery(e.target.files)} />
                  </label>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label>Department</Label>
                  <Select value={form.department} onValueChange={v => set('department', v)}>
                    <SelectTrigger><SelectValue placeholder="--" /></SelectTrigger>
                    <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d.id} value={d.id}>{d.icon} {d.en}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>City</Label>
                  <Select value={form.city} onValueChange={v => { set('city', v); set('constituency',''); }}>
                    <SelectTrigger><SelectValue placeholder="--" /></SelectTrigger>
                    <SelectContent>{Object.keys(CONSTITUENCIES).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Constituency</Label>
                  <Select value={form.constituency} onValueChange={v => set('constituency', v)} disabled={!form.city}>
                    <SelectTrigger><SelectValue placeholder="--" /></SelectTrigger>
                    <SelectContent>{(CONSTITUENCIES[form.city] || []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Area</Label><Input value={form.area} onChange={e => set('area', e.target.value)} /></div>
                <div><Label>Beneficiaries</Label><Input type="number" value={form.beneficiaries} onChange={e => set('beneficiaries', e.target.value)} /></div>
                <div><Label>Cost (₹)</Label><Input type="number" value={form.cost_amount} onChange={e => set('cost_amount', e.target.value)} /></div>
                <div><Label>Completed on</Label><Input type="date" value={form.completed_on} onChange={e => set('completed_on', e.target.value)} /></div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Citizen Reviews</Label>
                  <Button size="sm" variant="outline" onClick={addReview}><Plus className="w-3 h-3 mr-1" />Add</Button>
                </div>
                <div className="space-y-2">
                  {form.reviews.map((rv: Review, i: number) => (
                    <div key={i} className="bg-muted/40 rounded p-2 grid grid-cols-12 gap-2 items-center">
                      <Input className="col-span-4" placeholder="Name" value={rv.name} onChange={e => updReview(i, 'name', e.target.value)} />
                      <Select value={String(rv.rating)} onValueChange={v => updReview(i, 'rating', Number(v))}>
                        <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                        <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}★</SelectItem>)}</SelectContent>
                      </Select>
                      <Input className="col-span-5" placeholder="Comment" value={rv.comment} onChange={e => updReview(i, 'comment', e.target.value)} />
                      <Button size="sm" variant="ghost" onClick={() => rmReview(i)} className="col-span-1"><X className="w-3 h-3 text-red-600" /></Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2 border-t">
                <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={form.highlight} onChange={e => set('highlight', e.target.checked)} />Featured</label>
                <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={form.published} onChange={e => set('published', e.target.checked)} />Published</label>
              </div>

              <Button onClick={submit} disabled={busy} className="w-full">{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{editing ? 'Save changes' : 'Create work'}</Button>
            </div>
          </div>
        </div>
      )}

      {aiOpen && (
        <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-3" onClick={() => !aiBusy && setAiOpen(false)}>
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />AI Auto-draft</h3>
              <Button variant="ghost" size="sm" onClick={() => setAiOpen(false)} disabled={aiBusy}><X className="w-4 h-4" /></Button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Enter a resolved problem's ticket number. AI will polish the title/description and pull before/after photos into a <b>draft</b> completed-work entry.
            </p>
            <Label className="text-xs">Ticket number</Label>
            <Input placeholder="MC-XXXXXXXX" value={aiTicket} onChange={e => setAiTicket(e.target.value.toUpperCase())} className="mb-3" />
            <Button onClick={autoDraft} disabled={aiBusy} className="w-full">
              {aiBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Generate draft
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const PhotoBox: React.FC<{ label: string; url: string; onPick: (f: File | null) => void; onClear: () => void; }> = ({ label, url, onPick, onClear }) => (
  <div className="border border-dashed rounded-lg p-2 bg-muted/30">
    <Label className="text-xs">{label}</Label>
    {url ? (
      <div className="relative mt-1">
        <img src={url} alt={label} className="w-full h-32 object-cover rounded" />
        <button onClick={onClear} className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center"><X className="w-3 h-3" /></button>
      </div>
    ) : (
      <label className="mt-1 flex items-center justify-center h-32 border border-dashed rounded cursor-pointer hover:bg-muted">
        <ImageIcon className="w-6 h-6 text-muted-foreground" />
        <input type="file" hidden accept="image/*" onChange={e => onPick(e.target.files?.[0] || null)} />
      </label>
    )}
  </div>
);

export default CompletedWorksManager;
