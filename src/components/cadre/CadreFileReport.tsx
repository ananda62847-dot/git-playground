import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { UserCheck, Loader2, CheckCircle2, HeartPulse, ShieldAlert, Upload, X, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { DEPARTMENTS } from '@/lib/departments';
import { WELFARE_SCHEMES } from '@/lib/welfareSchemes';
import { COIMBATORE_CONSTITUENCIES, DEFAULT_DISTRICT } from '@/lib/constituencies';
import FundAssistanceForm from '@/components/FundAssistanceForm';
import VoiceNoteRecorder from '@/components/VoiceNoteRecorder';
import { useT, useLang, depLabel, schemeLabel } from '@/lib/i18n/cadreT';

async function uploadFiles(files: File[], folder: string): Promise<string[]> {
  const urls: string[] = [];
  for (const f of files) {
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${f.name.replace(/[^a-z0-9.]/gi, '_')}`;
    const { error } = await supabase.storage.from('problem-media').upload(path, f, { contentType: f.type });
    if (error) throw error;
    urls.push(supabase.storage.from('problem-media').getPublicUrl(path).data.publicUrl);
  }
  return urls;
}

const FilePicker: React.FC<{ files: File[]; setFiles: (f: File[]) => void; label?: string }> = ({ files, setFiles, label }) => {
  const T = useT();
  return (
  <div className="space-y-1.5">
    <Label className="text-xs">{label}</Label>
    <div className="flex items-center gap-2 flex-wrap">
      <label className="inline-flex items-center gap-1 cursor-pointer border rounded-md px-3 py-2 text-xs hover:bg-accent">
        <Upload className="w-4 h-4" /> {T.choose_files}
        <input type="file" hidden multiple accept="image/*,application/pdf,video/*"
          onChange={e => setFiles([...files, ...Array.from(e.target.files || [])])} />
      </label>
      {files.map((f, i) => (
        <span key={i} className="inline-flex items-center gap-1 text-[11px] bg-muted rounded-full px-2 py-1">
          <Paperclip className="w-3 h-3" />
          <span className="max-w-[110px] truncate">{f.name}</span>
          <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
        </span>
      ))}
    </div>
  </div>);
};

interface Props { cadre: any }
type ReportKind = 'problem' | 'welfare' | 'corruption' | 'fund';

const CadreFileReport: React.FC<Props> = ({ cadre }) => {
  const T = useT();
  const [kind, setKind] = useState<ReportKind>('problem');
  return (
    <div className="space-y-3">
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 rounded-lg p-3 flex gap-2 items-start">
        <UserCheck className="w-5 h-5 text-amber-700 mt-0.5" />
        <div className="text-xs text-amber-900 dark:text-amber-100">
          {T.onbehalf_banner}
        </div>
      </div>
      <Tabs value={kind} onValueChange={(v) => setKind(v as ReportKind)}>
        <TabsList className="grid grid-cols-4 h-auto">
          <TabsTrigger value="problem" className="text-xs py-2">{T.tab_problem}</TabsTrigger>
          <TabsTrigger value="welfare" className="text-xs py-2">{T.tab_welfare}</TabsTrigger>
          <TabsTrigger value="corruption" className="text-xs py-2">{T.tab_corruption}</TabsTrigger>
          <TabsTrigger value="fund" className="text-xs py-2">{T.tab_fund}</TabsTrigger>
        </TabsList>
        <TabsContent value="problem" className="mt-3"><ProblemOnBehalfForm cadre={cadre} /></TabsContent>
        <TabsContent value="welfare" className="mt-3"><WelfareOnBehalfForm cadre={cadre} /></TabsContent>
        <TabsContent value="corruption" className="mt-3"><CorruptionOnBehalfForm cadre={cadre} /></TabsContent>
        <TabsContent value="fund" className="mt-3">
          <FundAssistanceForm filedByCadreId={cadre.id} defaultConstituency={cadre.constituency} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const SuccessCard: React.FC<{ ticket: string; onAnother: () => void }> = ({ ticket, onAnother }) => {
  const T = useT();
  return (<Card><CardContent className="p-6 text-center space-y-3">
    <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
    <h3 className="text-lg font-bold">{T.success_title}</h3>
    <div className="font-mono text-xl bg-muted rounded-md px-4 py-2 inline-block">{ticket}</div>
    <p className="text-xs text-muted-foreground">{T.success_sub}</p>
    <Button variant="outline" onClick={onAnother}>{T.file_another}</Button>
  </CardContent></Card>);
};

const Field: React.FC<{ label: string; full?: boolean; children: React.ReactNode }> = ({ label, full, children }) => (
  <div className={full ? 'md:col-span-2' : ''}>
    <Label className="text-xs">{label}</Label>
    <div className="mt-1">{children}</div>
  </div>
);

const ProblemOnBehalfForm: React.FC<{ cadre: any }> = ({ cadre }) => {
  const T = useT();
  const lang = useLang();
  const [ticket, setTicket] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [v, setV] = useState<any>({
    citizen_name: '', citizen_phone: '', citizen_age: '', pincode: '', city: 'Coimbatore', district: DEFAULT_DISTRICT, belongs_confirm: false,
    constituency: cadre.constituency || '', area: '', address: '', department: '', category: '',
    urgency: 'medium', title: '', on_site_notes: '', cadre_remarks: '',
  });
  const set = (k: string, val: any) => setV((p: any) => ({ ...p, [k]: val }));
  const dep = DEPARTMENTS.find(d => d.id === v.department);

  const submit = async () => {
    if (!v.citizen_name || !v.citizen_phone || !v.title || !v.on_site_notes || !v.department || !v.pincode || !v.city)
      return toast.error(T.fill_required);
    if (!v.constituency) return toast.error(T.citizen_belongs_required);
    if (!v.belongs_confirm) return toast.error(T.citizen_belongs_required);
    setBusy(true);
    let photo_urls: string[] = [];
    try { photo_urls = await uploadFiles(files, 'cadre-filed'); }
    catch (e: any) { setBusy(false); return toast.error('Upload failed: ' + e.message); }
    const desc = v.cadre_remarks ? `${v.on_site_notes}\n\n— Cadre remarks: ${v.cadre_remarks}` : v.on_site_notes;
    const { data, error } = await supabase.rpc('submit_problem', {
      _reporter_name: v.citizen_name, _reporter_phone: v.citizen_phone,
      _reporter_age: v.citizen_age ? Number(v.citizen_age) : null,
      _pincode: v.pincode, _city: v.city, _constituency: v.constituency || null,
      _area: v.area || null, _polling_booth: null, _address_line: v.address || null,
      _category: v.category || 'other', _department: v.department,
      _urgency: v.urgency, _title: v.title, _description: desc, _photo_urls: photo_urls,
      _filed_by_cadre_id: cadre.id,
      _belongs_to_constituency: !!v.belongs_confirm,
    } as any);
    if (error) { setBusy(false); return toast.error(error.message); }
    const created: any = Array.isArray(data) ? data[0] : data;
    setBusy(false);
    setTicket(created.ticket_no);
  };

  if (ticket) return <SuccessCard ticket={ticket} onAnother={() => { setTicket(null); setFiles([]); setV({ ...v, title: '', on_site_notes: '', cadre_remarks: '', citizen_name: '', citizen_phone: '' }); }} />;

  return (
    <div className="grid md:grid-cols-2 gap-3">
      <div className="md:col-span-2">
        <div className="text-[10px] text-muted-foreground mb-1">🎙 {T.voice_note_helper}</div>
        <VoiceNoteRecorder language="ta" folder="cadre-filed"
          onProcessed={({ transcript, title, description }) => {
            set('title', title || v.title);
            set('on_site_notes', description || transcript || v.on_site_notes);
          }} />
      </div>
      <Field label={`${T.citizen_name} *`}><Input value={v.citizen_name} onChange={e => set('citizen_name', e.target.value)} /></Field>
      <Field label={`${T.citizen_phone} *`}><Input value={v.citizen_phone} inputMode="tel" onChange={e => set('citizen_phone', e.target.value.replace(/\D/g, '').slice(0, 10))} /></Field>
      <Field label={T.citizen_age}><Input type="number" value={v.citizen_age} onChange={e => set('citizen_age', e.target.value)} /></Field>
      <Field label={`${T.pincode} *`}><Input value={v.pincode} onChange={e => set('pincode', e.target.value)} /></Field>
      <Field label={`${T.district} *`}>
        <Select value={v.district} onValueChange={x => set('district', x)}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value={DEFAULT_DISTRICT}>{DEFAULT_DISTRICT}</SelectItem></SelectContent>
        </Select>
      </Field>
      <Field label={`${T.city} *`}><Input value={v.city} onChange={e => set('city', e.target.value)} /></Field>
      <Field label={`${T.constituency} *`}>
        <Select value={v.constituency} onValueChange={x => set('constituency', x)}>
          <SelectTrigger className="h-9"><SelectValue placeholder={T.select} /></SelectTrigger>
          <SelectContent>{COIMBATORE_CONSTITUENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <div className="md:col-span-2">
        <label className="flex items-start gap-2 border rounded-md p-2.5 bg-amber-50 dark:bg-amber-950/20 border-amber-300">
          <Checkbox checked={v.belongs_confirm} onCheckedChange={c => set('belongs_confirm', !!c)} className="mt-0.5" />
          <span className="text-xs">{T.citizen_belongs_confirm}</span>
        </label>
      </div>
      <Field label={T.area_locality}><Input value={v.area} onChange={e => set('area', e.target.value)} /></Field>
      <Field label={T.full_address}><Input value={v.address} onChange={e => set('address', e.target.value)} /></Field>
      <Field label={`${T.category_dep} *`}>
        <Select value={v.department} onValueChange={x => { set('department', x); set('category', ''); }}>
          <SelectTrigger className="h-9"><SelectValue placeholder={T.choose_cat} /></SelectTrigger>
          <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d.id} value={d.id}>{d.icon} {depLabel(d, lang)}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label={T.sub_category}>
        <Select value={v.category} onValueChange={x => set('category', x)} disabled={!dep}>
          <SelectTrigger className="h-9"><SelectValue placeholder={dep ? T.choose_sub : T.pick_dep_first} /></SelectTrigger>
          <SelectContent>{(dep?.categories || []).map(c => <SelectItem key={c.id} value={c.id}>{depLabel(c, lang)}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label={T.urgency}>
        <Select value={v.urgency} onValueChange={x => set('urgency', x)}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="low">{T.low}</SelectItem><SelectItem value="medium">{T.medium}</SelectItem>
            <SelectItem value="high">{T.high}</SelectItem><SelectItem value="emergency">{T.emergency}</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label={`${T.short_title} *`} full><Input value={v.title} onChange={e => set('title', e.target.value)} /></Field>
      <Field label={`${T.onsite_notes} *`} full><Textarea rows={4} value={v.on_site_notes} onChange={e => set('on_site_notes', e.target.value)} /></Field>
      <Field label={T.cadre_remarks} full><Textarea rows={2} value={v.cadre_remarks} onChange={e => set('cadre_remarks', e.target.value)} /></Field>
      <div className="md:col-span-2"><FilePicker files={files} setFiles={setFiles} label={T.attach_files} /></div>
      <div className="md:col-span-2">
        <Button className="w-full" onClick={submit} disabled={busy} size="lg">
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserCheck className="w-4 h-4 mr-2" />}
          {T.file_problem}
        </Button>
      </div>
    </div>
  );
};

const WelfareOnBehalfForm: React.FC<{ cadre: any }> = ({ cadre }) => {
  const T = useT();
  const lang = useLang();
  const [ticket, setTicket] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [v, setV] = useState<any>({
    citizen_name: '', citizen_phone: '', application_id: '', pincode: '', city: 'Coimbatore', district: DEFAULT_DISTRICT, belongs_confirm: false,
    constituency: cadre.constituency || '', area: '', scheme_type: '', scheme_name: '', subcategory: '',
    months_pending: '', title: '', on_site_notes: '', cadre_remarks: '',
  });
  const set = (k: string, val: any) => setV((p: any) => ({ ...p, [k]: val }));
  const scheme = WELFARE_SCHEMES.find(s => s.id === v.scheme_type);

  const submit = async () => {
    if (!v.citizen_name || !v.citizen_phone || !v.title || !v.on_site_notes || !v.scheme_type || !v.subcategory || !v.pincode || !v.city)
      return toast.error(T.fill_required);
    if (!v.constituency || !v.belongs_confirm) return toast.error(T.citizen_belongs_required);
    setBusy(true);
    let proof_urls: string[] = [];
    try { proof_urls = await uploadFiles(files, 'cadre-filed-welfare'); }
    catch (e: any) { setBusy(false); return toast.error('Upload failed: ' + e.message); }
    const desc = v.cadre_remarks ? `${v.on_site_notes}\n\n— Cadre remarks: ${v.cadre_remarks}` : v.on_site_notes;
    const { data, error } = await supabase.rpc('submit_welfare_issue', {
      _reporter_name: v.citizen_name, _reporter_phone: v.citizen_phone,
      _application_id: v.application_id || null,
      _pincode: v.pincode, _city: v.city,
      _constituency: v.constituency || null, _area: v.area || null,
      _scheme_type: v.scheme_type, _scheme_name: v.scheme_name || null,
      _subcategory: v.subcategory, _months_pending: v.months_pending || null,
      _title: v.title, _description: desc, _proof_urls: proof_urls,
      _filed_by_cadre_id: cadre.id,
      _belongs_to_constituency: !!v.belongs_confirm,
    } as any);
    if (error) { setBusy(false); return toast.error(error.message); }
    const created: any = Array.isArray(data) ? data[0] : data;
    setBusy(false);
    setTicket(created.ticket_no);
  };

  if (ticket) return <SuccessCard ticket={ticket} onAnother={() => { setTicket(null); setFiles([]); setV({ ...v, title: '', on_site_notes: '', cadre_remarks: '', citizen_name: '', citizen_phone: '' }); }} />;

  return (
    <div className="grid md:grid-cols-2 gap-3">
      <div className="md:col-span-2">
        <div className="text-[10px] text-muted-foreground mb-1">🎙 {T.voice_note_helper}</div>
        <VoiceNoteRecorder language="ta" folder="cadre-filed-welfare"
          onProcessed={({ transcript, title, description }) => {
            set('title', title || v.title);
            set('on_site_notes', description || transcript || v.on_site_notes);
          }} />
      </div>
      <Field label={`${T.beneficiary_name} *`}><Input value={v.citizen_name} onChange={e => set('citizen_name', e.target.value)} /></Field>
      <Field label={`${T.beneficiary_phone} *`}><Input value={v.citizen_phone} inputMode="tel" onChange={e => set('citizen_phone', e.target.value.replace(/\D/g, '').slice(0, 10))} /></Field>
      <Field label={T.application_id}><Input value={v.application_id} onChange={e => set('application_id', e.target.value)} /></Field>
      <Field label={`${T.pincode} *`}><Input value={v.pincode} onChange={e => set('pincode', e.target.value)} /></Field>
      <Field label={`${T.district} *`}>
        <Select value={v.district} onValueChange={x => set('district', x)}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value={DEFAULT_DISTRICT}>{DEFAULT_DISTRICT}</SelectItem></SelectContent>
        </Select>
      </Field>
      <Field label={`${T.city} *`}><Input value={v.city} onChange={e => set('city', e.target.value)} /></Field>
      <Field label={`${T.constituency} *`}>
        <Select value={v.constituency} onValueChange={x => set('constituency', x)}>
          <SelectTrigger className="h-9"><SelectValue placeholder={T.select} /></SelectTrigger>
          <SelectContent>{COIMBATORE_CONSTITUENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <div className="md:col-span-2">
        <label className="flex items-start gap-2 border rounded-md p-2.5 bg-amber-50 dark:bg-amber-950/20 border-amber-300">
          <Checkbox checked={v.belongs_confirm} onCheckedChange={c => set('belongs_confirm', !!c)} className="mt-0.5" />
          <span className="text-xs">{T.citizen_belongs_confirm}</span>
        </label>
      </div>
      <Field label={`${T.scheme_cat} *`}>
        <Select value={v.scheme_type} onValueChange={x => { set('scheme_type', x); set('subcategory', ''); }}>
          <SelectTrigger className="h-9"><SelectValue placeholder={T.choose_scheme} /></SelectTrigger>
          <SelectContent>{WELFARE_SCHEMES.map(s => <SelectItem key={s.id} value={s.id}>{s.icon} {schemeLabel(s, lang)}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label={`${T.sub_category} *`}>
        <Select value={v.subcategory} onValueChange={x => set('subcategory', x)} disabled={!scheme}>
          <SelectTrigger className="h-9"><SelectValue placeholder={scheme ? T.choose_sub : T.pick_scheme_first} /></SelectTrigger>
          <SelectContent>{(scheme?.subcategories || []).map(s => <SelectItem key={s.id} value={s.id}>{schemeLabel(s, lang)}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label={T.scheme_name}><Input value={v.scheme_name} onChange={e => set('scheme_name', e.target.value)} /></Field>
      <Field label={T.months_pending}>
        <Select value={v.months_pending} onValueChange={x => set('months_pending', x)}>
          <SelectTrigger className="h-9"><SelectValue placeholder={T.select} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="lt1">{T.months_pending_lt1}</SelectItem>
            <SelectItem value="1_3">{T.months_pending_1_3}</SelectItem>
            <SelectItem value="3_6">{T.months_pending_3_6}</SelectItem>
            <SelectItem value="6_12">{T.months_pending_6_12}</SelectItem>
            <SelectItem value="gt12">{T.months_pending_gt12}</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label={`${T.short_title} *`} full><Input value={v.title} onChange={e => set('title', e.target.value)} /></Field>
      <Field label={`${T.onsite_notes} *`} full><Textarea rows={4} value={v.on_site_notes} onChange={e => set('on_site_notes', e.target.value)} /></Field>
      <Field label={T.cadre_remarks} full><Textarea rows={2} value={v.cadre_remarks} onChange={e => set('cadre_remarks', e.target.value)} /></Field>
      <div className="md:col-span-2"><FilePicker files={files} setFiles={setFiles} label={T.attach_welfare} /></div>
      <div className="md:col-span-2">
        <Button className="w-full" onClick={submit} disabled={busy} size="lg">
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <HeartPulse className="w-4 h-4 mr-2" />}
          {T.file_welfare}
        </Button>
      </div>
    </div>
  );
};

const CorruptionOnBehalfForm: React.FC<{ cadre: any }> = ({ cadre }) => {
  const T = useT();
  const lang = useLang();
  const [ticket, setTicket] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [v, setV] = useState<any>({
    city: 'Coimbatore', district: DEFAULT_DISTRICT, constituency: cadre.constituency || '', area: '', department: '',
    office_location: '', person_involved: '', person_name: '',
    incident_type: '', incident_date: '', incident_time: '', amount: '', description: '', cadre_remarks: '',
    honesty: false,
  });
  const set = (k: string, val: any) => setV((p: any) => ({ ...p, [k]: val }));

  const submit = async () => {
    if (!v.description || v.description.length < 10) return toast.error('Description must be at least 10 characters');
    if (!v.honesty) return toast.error(T.honesty_required);
    setBusy(true);
    let evidence_urls: string[] = [];
    try { evidence_urls = await uploadFiles(files, 'cadre-filed-corruption'); }
    catch (e: any) { setBusy(false); return toast.error('Upload failed: ' + e.message); }
    const desc = v.cadre_remarks ? `${v.description}\n\n— Cadre remarks: ${v.cadre_remarks}` : v.description;
    const { data, error } = await supabase.rpc('submit_corruption_report', {
      _city: v.city || null, _constituency: v.constituency || null, _area: v.area || null,
      _department: v.department || null, _description: desc,
      _amount_demanded: v.amount ? Number(v.amount) : null,
      _incident_date: v.incident_date || null,
      _evidence_url: null, _incident_type: v.incident_type || null,
      _office_location: v.office_location || null, _person_involved: v.person_involved || null,
      _person_name: v.person_name || null, _incident_time: v.incident_time || null,
      _confirmed_good_faith: true, _evidence_urls: evidence_urls,
      _filed_by_cadre_id: cadre.id,
    } as any);
    if (error) { setBusy(false); return toast.error(error.message); }
    const created: any = Array.isArray(data) ? data[0] : data;
    setBusy(false);
    setTicket(created.ticket_no);
  };

  if (ticket) return <SuccessCard ticket={ticket} onAnother={() => { setTicket(null); setFiles([]); setV({ ...v, description: '', cadre_remarks: '' }); }} />;

  return (
    <div className="grid md:grid-cols-2 gap-3">
      <div className="md:col-span-2">
        <div className="text-[10px] text-muted-foreground mb-1">🎙 {T.voice_note_helper}</div>
        <VoiceNoteRecorder language="ta" folder="cadre-filed-corruption"
          onProcessed={({ transcript, description }) => {
            set('description', description || transcript || v.description);
          }} />
      </div>
      <Field label={T.department}>
        <Select value={v.department} onValueChange={x => set('department', x)}>
          <SelectTrigger className="h-9"><SelectValue placeholder={T.select} /></SelectTrigger>
          <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d.id} value={d.id}>{d.icon} {depLabel(d, lang)}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label={T.office_location}><Input value={v.office_location} onChange={e => set('office_location', e.target.value)} /></Field>
      <Field label={T.district}>
        <Select value={v.district} onValueChange={x => set('district', x)}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value={DEFAULT_DISTRICT}>{DEFAULT_DISTRICT}</SelectItem></SelectContent>
        </Select>
      </Field>
      <Field label={T.city}><Input value={v.city} onChange={e => set('city', e.target.value)} /></Field>
      <Field label={T.constituency}>
        <Select value={v.constituency} onValueChange={x => set('constituency', x)}>
          <SelectTrigger className="h-9"><SelectValue placeholder={T.select} /></SelectTrigger>
          <SelectContent>{COIMBATORE_CONSTITUENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label={T.person_role}><Input value={v.person_involved} onChange={e => set('person_involved', e.target.value)} /></Field>
      <Field label={T.person_name}><Input value={v.person_name} onChange={e => set('person_name', e.target.value)} /></Field>
      <Field label={T.incident_type}>
        <Select value={v.incident_type} onValueChange={x => set('incident_type', x)}>
          <SelectTrigger className="h-9"><SelectValue placeholder={T.select} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="bribery">{T.incident_bribery}</SelectItem>
            <SelectItem value="extortion">{T.incident_extortion}</SelectItem>
            <SelectItem value="favouritism">{T.incident_favouritism}</SelectItem>
            <SelectItem value="fraud">{T.incident_fraud}</SelectItem>
            <SelectItem value="negligence">{T.incident_negligence}</SelectItem>
            <SelectItem value="other">{T.incident_other}</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label={T.amount_demanded}><Input type="number" value={v.amount} onChange={e => set('amount', e.target.value)} /></Field>
      <Field label={T.incident_date}><Input type="date" value={v.incident_date} onChange={e => set('incident_date', e.target.value)} /></Field>
      <Field label={T.incident_time}><Input value={v.incident_time} onChange={e => set('incident_time', e.target.value)} placeholder="14:30" /></Field>
      <Field label={`${T.full_description} *`} full>
        <Textarea rows={5} value={v.description} onChange={e => set('description', e.target.value)} />
      </Field>
      <Field label={T.cadre_remarks} full>
        <Textarea rows={2} value={v.cadre_remarks} onChange={e => set('cadre_remarks', e.target.value)} />
      </Field>
      <div className="md:col-span-2"><FilePicker files={files} setFiles={setFiles} label={T.attach_evidence} /></div>
      <div className="md:col-span-2">
        <label className="flex items-start gap-2 border-2 rounded-md p-3 bg-red-50 dark:bg-red-950/20 border-red-300">
          <Checkbox checked={v.honesty} onCheckedChange={c => set('honesty', !!c)} className="mt-0.5" />
          <span className="text-xs font-medium">{T.honesty_checkbox}</span>
        </label>
      </div>
      <div className="md:col-span-2">
        <Button className="w-full" onClick={submit} disabled={busy || !v.honesty} size="lg">
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldAlert className="w-4 h-4 mr-2" />}
          {T.file_corruption}
        </Button>
      </div>
    </div>
  );
};

export default CadreFileReport;