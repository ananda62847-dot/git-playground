import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { X, Loader2, CheckCircle, Copy, Upload, FileText } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLockBodyScroll } from '@/hooks/use-lock-body-scroll';
import { constituenciesByCity as CONSTITUENCIES } from '@/lib/constituencies';
import { DEPARTMENTS } from '@/lib/departments';

const INCIDENT_TYPES = [
  { id: 'bribe_demand', ta: 'லஞ்சம் கேட்டல்', en: 'Bribe demand' },
  { id: 'delay_for_payment', ta: 'பணத்துக்காக தாமதம்', en: 'Delay for payment' },
  { id: 'abuse_of_power', ta: 'அதிகார துஷ்பிரயோகம்', en: 'Abuse of power' },
  { id: 'illegal_collection', ta: 'சட்டவிரோத வசூல்', en: 'Illegal collection' },
  { id: 'tender_corruption', ta: 'டெண்டர் ஊழல்', en: 'Tender corruption' },
  { id: 'document_withholding', ta: 'ஆவணம் தடுத்தல்', en: 'Document withholding' },
  { id: 'other', ta: 'மற்றவை', en: 'Other' },
];

const PERSON_ROLES = [
  { id: 'officer', ta: 'அதிகாரி', en: 'Officer' },
  { id: 'contractor', ta: 'ஒப்பந்ததாரர்', en: 'Contractor' },
  { id: 'local_staff', ta: 'உள்ளூர் ஊழியர்', en: 'Local staff' },
  { id: 'elected_rep', ta: 'மக்கள் பிரதிநிதி', en: 'Elected representative' },
  { id: 'other', ta: 'மற்றவை', en: 'Other' },
];

const CorruptionReportModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  useLockBodyScroll(true);
  const { language, isBilingual } = useLanguage();
  const tt = (ta: string, en: string) => (isBilingual ? `${ta} / ${en}` : language === 'en' ? en : ta);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ ticket_no: string } | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [f, setF] = useState({
    city: '', constituency: '', area: '', department: '',
    office_location: '', incident_type: '', person_involved: '', person_name: '',
    description: '', amount_demanded: '',
    incident_date: '', incident_time: '',
    confirmed: false,
  });
  const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    const max = 5;
    const sizeOk = list.every(x => x.size <= 20 * 1024 * 1024);
    if (!sizeOk) return toast.error(tt('ஒவ்வொரு கோப்பும் 20MB இற்குள்', 'Each file must be ≤ 20MB'));
    if (list.length + files.length > max) return toast.error(tt(`அதிகபட்சம் ${max} கோப்புகள்`, `Max ${max} files`));
    setFiles(p => [...p, ...list]);
  };
  const removeFile = (i: number) => setFiles(p => p.filter((_, idx) => idx !== i));

  const uploadFiles = async (): Promise<string[]> => {
    if (files.length === 0) return [];
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split('.').pop() || 'bin';
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('corruption-evidence').upload(path, file, {
        contentType: file.type, upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('corruption-evidence').getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const submit = async () => {
    if (f.description.trim().length < 10) return toast.error(tt('விளக்கம் குறைந்தது 10 எழுத்துகள்', 'Description min 10 chars'));
    if (!f.confirmed) return toast.error(tt('நல்ல எண்ணத்தில் உறுதிப்படுத்தவும்', 'Please confirm good faith declaration'));
    setSubmitting(true);
    try {
      const evidence_urls = await uploadFiles();
      const { data, error } = await (supabase as any).rpc('submit_corruption_report', {
        _city: f.city || null,
        _constituency: f.constituency || null,
        _area: f.area || null,
        _department: f.department || null,
        _office_location: f.office_location || null,
        _incident_type: f.incident_type || null,
        _person_involved: f.person_involved || null,
        _person_name: f.person_name || null,
        _description: f.description.trim(),
        _amount_demanded: f.amount_demanded ? Number(f.amount_demanded) : null,
        _incident_date: f.incident_date || null,
        _incident_time: f.incident_time || null,
        _evidence_url: evidence_urls[0] || null,
        _evidence_urls: evidence_urls,
        _confirmed_good_faith: f.confirmed,
      });
      if (error) throw error;
      const ticketNo = Array.isArray(data) ? data[0]?.ticket_no : data?.ticket_no;
      setDone({ ticket_no: ticketNo || 'Submitted' });
      // Push to super admins
      const { sendPush } = await import('@/lib/push');
      sendPush({
        title: `Corruption report · ${ticketNo || ''}`,
        body: `${f.constituency || f.city || 'New report'} · ${f.incident_type || 'flagged'}`,
        severity: 'high', type: 'corruption_report', url: '/admin/dashboard',
        target: { role: 'super_admin' },
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-5 md:p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg md:text-xl font-bold">{tt('அநாமதேய ஊழல் புகார்', 'Anonymous Corruption Report')}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        {done ? (
          <div className="text-center py-4">
            <CheckCircle className="w-14 h-14 text-green-600 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-2">{tt('உங்கள் புகார் டிக்கெட்', 'Your report ticket')}</p>
            <div className="bg-muted rounded p-3 inline-flex items-center gap-2 mb-4">
              <span className="font-mono font-bold">{done.ticket_no}</span>
              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(done.ticket_no); toast.success('Copied'); }}><Copy className="w-3 h-3" /></Button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{tt('உங்கள் அடையாளம் பாதுகாக்கப்படுகிறது.', 'Your identity is protected.')}</p>
            <Button onClick={onClose} className="w-full">{tt('முடிக்க', 'Done')}</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{tt('பெயர் / கைபேசி தேவையில்லை. அதிகாரிகள் மட்டுமே படிக்க முடியும்.', 'No name or phone needed. Only admins can read.')}</p>

            <div className="grid grid-cols-2 gap-2">
              <div><Label>{tt('நகரம்', 'City')}</Label>
                <Select value={f.city || undefined} onValueChange={(v) => { set('city', v); set('constituency', ''); }}>
                  <SelectTrigger><SelectValue placeholder="--" /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(CONSTITUENCIES).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{tt('தொகுதி', 'Constituency')}</Label>
                <Select value={f.constituency || undefined} onValueChange={(v) => set('constituency', v)} disabled={!f.city}>
                  <SelectTrigger><SelectValue placeholder="--" /></SelectTrigger>
                  <SelectContent>
                    {(CONSTITUENCIES[f.city] || []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div><Label>{tt('துறை', 'Department')}</Label>
              <Select value={f.department || undefined} onValueChange={(v) => set('department', v)}>
                <SelectTrigger><SelectValue placeholder="--" /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map(d => <SelectItem key={d.id} value={d.id}>{tt(d.ta, d.en)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{tt('அலுவலகம் / இடம்', 'Office / Location')}</Label>
              <Input
                value={f.office_location}
                onChange={e => set('office_location', e.target.value)}
                placeholder={tt('உதா: RTO அலுவலகம், மின்வாரியம்…', 'e.g. RTO office, EB office, Municipality branch')}
              />
            </div>

            <div>
              <Label>{tt('சம்பவ வகை *', 'Incident Type *')}</Label>
              <Select value={f.incident_type || undefined} onValueChange={(v) => set('incident_type', v)}>
                <SelectTrigger><SelectValue placeholder="--" /></SelectTrigger>
                <SelectContent>
                  {INCIDENT_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{tt(t.ta, t.en)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div><Label>{tt('கேட்ட தொகை (₹)', 'Amount asked (₹)')}</Label><Input type="number" value={f.amount_demanded} onChange={e => set('amount_demanded', e.target.value)} /></div>
              <div><Label>{tt('தேதி', 'Date')}</Label><Input type="date" value={f.incident_date} onChange={e => set('incident_date', e.target.value)} /></div>
            </div>

            <div>
              <Label>{tt('தோராயமான நேரம்', 'Approximate Time')}</Label>
              <Input type="time" value={f.incident_time} onChange={e => set('incident_time', e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>{tt('நபர் / பதவி (விருப்பம்)', 'Person / Role (Optional)')}</Label>
                <Select value={f.person_involved || undefined} onValueChange={(v) => set('person_involved', v)}>
                  <SelectTrigger><SelectValue placeholder="--" /></SelectTrigger>
                  <SelectContent>
                    {PERSON_ROLES.map(r => <SelectItem key={r.id} value={r.id}>{tt(r.ta, r.en)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{tt('பெயர் (விருப்பம்)', 'Name (Optional)')}</Label>
                <Input value={f.person_name} onChange={e => set('person_name', e.target.value)} />
              </div>
            </div>

            <div><Label>{tt('என்ன நடந்தது *', 'What happened *')}</Label>
              <Textarea rows={5} value={f.description} onChange={e => set('description', e.target.value)} placeholder={tt('விரிவாக எழுதவும்…', 'Describe in detail…')} />
            </div>

            <div>
              <Label>{tt('சான்று பதிவேற்றம் (விருப்பம்)', 'Upload Evidence (Optional)')}</Label>
              <p className="text-[11px] text-muted-foreground mb-1">
                {tt('படம், PDF, ஆடியோ, வீடியோ · அதிகபட்சம் 5 கோப்புகள், 20MB ஒவ்வொன்றும்', 'Images, PDF, audio, video · max 5 files, 20MB each')}
              </p>
              <label className="flex items-center justify-center gap-2 border border-dashed border-input rounded-md py-3 cursor-pointer hover:bg-muted text-sm">
                <Upload className="w-4 h-4" />
                {tt('கோப்புகள் தேர்ந்தெடு', 'Choose files')}
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf,audio/*,video/*"
                  className="hidden"
                  onChange={onFiles}
                />
              </label>
              {files.length > 0 && (
                <div className="mt-2 space-y-1">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-muted rounded px-2 py-1">
                      <FileText className="w-3 h-3 shrink-0" />
                      <span className="truncate flex-1">{file.name}</span>
                      <span className="text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                      <button type="button" onClick={() => removeFile(i)} className="text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <label className="flex items-start gap-2 p-3 bg-muted/50 rounded-md cursor-pointer">
              <Checkbox
                checked={f.confirmed}
                onCheckedChange={(v) => set('confirmed', !!v)}
                className="mt-0.5"
              />
              <span className="text-xs leading-relaxed">
                {tt(
                  'இந்தப் புகார் நல்ல எண்ணத்தோடு, என் அறிவின் படி உண்மையானது என்று உறுதிப்படுத்துகிறேன்.',
                  'I confirm this report is submitted in good faith and to the best of my knowledge.'
                )}
              </span>
            </label>

            <Button onClick={submit} disabled={submitting} variant="hero" className="w-full">
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {tt('அநாமதேய புகார் சமர்ப்பி', 'Submit Anonymously')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
export default CorruptionReportModal;
