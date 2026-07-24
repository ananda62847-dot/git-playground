import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Loader2, UserPlus, Phone, MapPin, Upload, KeyRound, Search } from 'lucide-react';
import { toast } from 'sonner';
import { constituenciesByCity as CONSTITUENCIES } from '@/lib/constituencies';
import { CADRE_LEVELS as LEVELS } from '@/lib/cadreLevels';

import CadreDetailModal from './CadreDetailModal';

const CadreManagement: React.FC<{ allowedConstituencies?: string[]; isAdmin: boolean }> = ({ allowedConstituencies, isAdmin }) => {
  const [detail, setDetail] = useState<any>(null);
  const [cadres, setCadres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterConst, setFilterConst] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [form, setForm] = useState<any>({
    name: '', phone: '', email: '', password: '', city: '', constituency: '', area: '',
    ward_number: '', level: 'booth_volunteer', role_title: '', skills: '', notes: '', create_login: false,
  });
  const [saving, setSaving] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkImporting, setBulkImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('cadres').select('*').order('created_at', { ascending: false }).limit(500);
    if (error) {
      toast.error(error.message);
      setCadres([]);
    } else {
      setCadres(data || []);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.name || form.phone.length < 10 || !form.city) return toast.error('Name, phone, city required');
    setSaving(true);
    try {
      if (form.create_login) {
        if (!form.email || form.password.length < 6) { setSaving(false); return toast.error('Email + 6+ char password required'); }
        const { data, error } = await supabase.functions.invoke('cadre-signup', {
          body: {
            email: form.email, password: form.password, name: form.name, phone: form.phone,
            level: form.level, city: form.city, constituency: form.constituency || null,
            area: form.area || null, ward_number: form.ward_number || null,
            role_title: form.role_title || null,
            skills: form.skills ? form.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
            notes: form.notes || null, source: 'admin',
          },
        });
        if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
        toast.success('Cadre + login created');
      } else {
        const { error } = await supabase.from('cadres').insert({
          name: form.name, phone: form.phone, email: form.email || null, city: form.city,
          constituency: form.constituency || null, area: form.area || null,
          ward_number: form.ward_number || null,
          level: form.level, role_title: form.role_title || null, notes: form.notes || null,
          skills: form.skills ? form.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        });
        if (error) throw new Error(error.message);
        toast.success('Cadre added');
      }
      setOpen(false);
      setForm({ name:'', phone:'', email:'', password:'', city:'', constituency:'', area:'', ward_number:'', level:'booth_volunteer', role_title:'', skills:'', notes:'', create_login:false });
      load();
    } catch (e: any) { toast.error(e.message || 'Failed'); } finally { setSaving(false); }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from('cadres').update({ active: !active }).eq('id', id);
    load();
  };

  const toggleApproved = async (id: string, approved: boolean) => {
    await supabase.from('cadres').update({ approved: !approved }).eq('id', id);
    toast.success(approved ? 'Approval revoked' : 'Cadre approved');
    load();
  };

  const updateLevel = async (id: string, level: string) => {
    const { error } = await supabase.from('cadres').update({ level }).eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Level updated'); load();
  };

  const toggleVisible = async (id: string, v: boolean) => {
    const { error } = await supabase.from('cadres').update({ public_visible: !v }).eq('id', id);
    if (error) return toast.error(error.message);
    toast.success(!v ? 'Now visible publicly' : 'Hidden from public'); load();
  };
  const toggleShowPhone = async (id: string, v: boolean) => {
    const { error } = await supabase.from('cadres').update({ show_phone: !v }).eq('id', id);
    if (error) return toast.error(error.message);
    load();
  };
  const updatePublicRole = async (id: string, label: string) => {
    const { error } = await supabase.from('cadres').update({ public_role_label: label || null }).eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Public role updated'); load();
  };

  const filtered = cadres.filter(c =>
    (filterConst === 'all' || c.constituency === filterConst) &&
    (filterLevel === 'all' || c.level === filterLevel) &&
    (!search || `${c.name} ${c.phone} ${c.email||''} ${c.area||''} ${c.constituency||''}`.toLowerCase().includes(search.toLowerCase()))
  );

  const constOptions = isAdmin ? Array.from(new Set(Object.values(CONSTITUENCIES).flat())) : (allowedConstituencies || []);

  const parseCSV = (text: string) => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    return lines.slice(1).map(line => {
      const cells = line.split(',').map(c => c.trim());
      const row: any = {};
      headers.forEach((h, i) => row[h] = cells[i] ?? '');
      return row;
    });
  };

  const importBulk = async () => {
    const rows = parseCSV(bulkText);
    if (rows.length === 0) return toast.error('No rows found');
    setBulkImporting(true);
    const payload = rows.filter(r => r.name && r.phone && r.city).map(r => ({
      name: r.name, phone: String(r.phone).replace(/\D/g,'').slice(0,10),
      email: r.email || null, level: r.level || 'booth_volunteer',
      role_title: r.role_title || null, city: r.city,
      constituency: r.constituency || null, area: r.area || null,
      ward_number: r.ward_number || null, notes: r.notes || null, source: 'bulk_import',
    }));
    const { error } = await supabase.from('cadres').insert(payload);
    setBulkImporting(false);
    if (error) return toast.error(error.message);
    toast.success(`Imported ${payload.length} cadres`);
    setBulkText(''); setBulkOpen(false); load();
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => setBulkText(String(ev.target?.result || ''));
    reader.readAsText(f);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="w-4 h-4 absolute left-2 top-2.5 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="Search name / phone" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={filterConst} onChange={e => setFilterConst(e.target.value)} className="h-9 px-2 rounded border border-input bg-background text-sm">
          <option value="all">All Constituencies</option>
          {constOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="h-9 px-2 rounded border border-input bg-background text-sm">
          <option value="all">All Levels</option>
          {LEVELS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">{filtered.length} cadres</span>
        <div className="ml-auto flex gap-1">
          <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}><Upload className="w-4 h-4 mr-1" />Bulk Import</Button>
          <Button size="sm" onClick={() => setOpen(true)}><UserPlus className="w-4 h-4 mr-1" />Add Cadre</Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {loading ? <div className="text-sm text-muted-foreground py-6 text-center col-span-full">Loading…</div> :
          filtered.length === 0 ? <div className="text-sm text-muted-foreground py-6 text-center col-span-full">No cadres yet</div> :
          filtered.map(c => (
            <button key={c.id} onClick={() => setDetail(c)} className="bg-card border border-border rounded-lg p-3 text-left hover:border-primary transition-colors overflow-hidden">
              <div className="flex items-start gap-3 min-w-0">
                {c.profile_photo_url
                  ? <img src={c.profile_photo_url} alt="" className="w-10 h-10 rounded-full object-cover border shrink-0" />
                  : <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0">{c.name?.[0] || '?'}</div>}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate flex items-center gap-1">
                    <span className="truncate">{c.name}</span>
                    {c.user_id && <KeyRound className="w-3 h-3 text-green-600 shrink-0" />}
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1 min-w-0">
                    <Phone className="w-3 h-3 shrink-0" />
                    <span className="truncate">{c.phone}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 flex items-start gap-1 min-w-0">
                    <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                    <span className="truncate block min-w-0 flex-1">{[c.area, c.constituency].filter(Boolean).join(' · ') || c.city}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 max-w-[80px]">
                  <Badge variant={c.approved ? 'default' : 'secondary'} className="text-[9px]">
                    {c.approved ? '✓' : 'Pending'}
                  </Badge>
                  <Badge variant="outline" className="text-[9px] truncate max-w-full">{LEVELS.find(l => l.id === c.level)?.label || c.level}</Badge>
                </div>
              </div>
            </button>
          ))
        }
      </div>

      {detail && <CadreDetailModal cadre={detail} onClose={() => setDetail(null)} onChanged={() => { load(); supabase.from('cadres').select('*').eq('id', detail.id).maybeSingle().then(({ data }) => data && setDetail(data)); }} />}

      {open && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-3" onClick={() => setOpen(false)}>
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3"><h3 className="font-bold">Add Cadre</h3><Button variant="ghost" size="sm" onClick={() => setOpen(false)}><X className="w-4 h-4" /></Button></div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Name *</Label><Input value={form.name} onChange={e => set('name', e.target.value)} /></div>
                <div><Label>Phone *</Label><Input value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g,'').slice(0,10))} /></div>
                <div className="col-span-2"><Label>Email{form.create_login ? ' *' : ''}</Label><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
                <div><Label>City *</Label>
                  <select className="w-full h-10 rounded border border-input bg-background px-2 text-sm" value={form.city} onChange={e => { set('city', e.target.value); set('constituency',''); }}>
                    <option value="">--</option>{Object.keys(CONSTITUENCIES).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><Label>Constituency</Label>
                  <select className="w-full h-10 rounded border border-input bg-background px-2 text-sm" value={form.constituency} onChange={e => set('constituency', e.target.value)} disabled={!form.city}>
                    <option value="">--</option>{(CONSTITUENCIES[form.city]||[]).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><Label>Area / Ward</Label><Input value={form.area} onChange={e => set('area', e.target.value)} /></div>
                <div><Label>Ward Number</Label><Input value={form.ward_number} onChange={e => set('ward_number', e.target.value)} /></div>
                <div><Label>Level *</Label>
                  <select className="w-full h-10 rounded border border-input bg-background px-2 text-sm" value={form.level} onChange={e => set('level', e.target.value)}>
                    {LEVELS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                  </select>
                </div>
                <div><Label>Role title</Label><Input value={form.role_title} onChange={e => set('role_title', e.target.value)} placeholder="e.g. IT Coordinator" /></div>
                <div className="col-span-2"><Label>Skills (comma-separated)</Label><Input value={form.skills} onChange={e => set('skills', e.target.value)} placeholder="organising, social media, legal" /></div>
                <div className="col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
                <label className="col-span-2 flex items-center gap-2 text-sm bg-muted/50 p-2 rounded">
                  <input type="checkbox" checked={form.create_login} onChange={e => set('create_login', e.target.checked)} />
                  <KeyRound className="w-4 h-4" /> Create login account
                </label>
                {form.create_login && (
                  <div className="col-span-2"><Label>Password *</Label><Input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min 6 chars" /></div>
                )}
              </div>
              <Button onClick={submit} disabled={saving} className="w-full">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Add Cadre
              </Button>
            </div>
          </div>
        </div>
      )}

      {bulkOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-3" onClick={() => setBulkOpen(false)}>
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3"><h3 className="font-bold">Bulk Import (CSV)</h3><Button variant="ghost" size="sm" onClick={() => setBulkOpen(false)}><X className="w-4 h-4" /></Button></div>
            <p className="text-xs text-muted-foreground mb-2">
              Required: <code>name, phone, city</code>. Optional: <code>email, level, role_title, constituency, area, ward_number, notes</code>.
            </p>
            <div className="flex gap-2 mb-2">
              <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="text-xs" />
              <Button size="sm" variant="outline" onClick={() => setBulkText('name,phone,email,level,role_title,city,constituency,area,ward_number,notes\nRavi Kumar,9876543210,ravi@example.com,booth_volunteer,,Chennai / சென்னை,Anna Nagar / அண்ணா நகர்,Block 5,12,New')}>Load template</Button>
            </div>
            <textarea className="w-full h-60 border border-input rounded p-2 text-xs font-mono bg-background"
              value={bulkText} onChange={e => setBulkText(e.target.value)} placeholder="name,phone,city,..." />
            <Button onClick={importBulk} disabled={bulkImporting || !bulkText.trim()} className="w-full mt-2">
              {bulkImporting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Import
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
export default CadreManagement;
