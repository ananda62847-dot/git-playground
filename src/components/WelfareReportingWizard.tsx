import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { ArrowLeft, Loader2, CheckCircle, Copy, X, Camera, Building2, Download, Mic } from 'lucide-react';
import { WELFARE_SCHEMES, MONTHS_PENDING_OPTIONS } from '@/lib/welfareSchemes';
import { URGENCY_LEVELS } from '@/lib/departments';
import { constituenciesByCity as CONSTITUENCIES } from '@/lib/constituencies';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import TVKLogo from './TVKLogo';
import VoiceNoteRecorder from './VoiceNoteRecorder';
import { downloadComplaintPdf } from '@/lib/complaintPdf';

interface Props { onClose: () => void }

const WelfareReportingWizard: React.FC<Props> = ({ onClose }) => {
  const { language, isBilingual } = useLanguage();
  const tt = (ta: string, en: string) => (isBilingual ? `${ta} / ${en}` : language === 'en' ? en : ta);

  const [step, setStepRaw] = useState(1);
  const setStep = (n: number) => { setStepRaw(n); queueMicrotask(() => window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })); };
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState<{ ticket_no: string; id: string } | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const [form, setForm] = useState({
    name: '', phone: '', age: '',
    city: '', constituency: '', area: '', pincode: '', addressLine: '',
    scheme_type: '', subcategory: '',
    scheme_name: '', application_id: '', months_pending: '',
    urgency: 'medium', title: '', description: '',
    voice_note_url: '' as string | null,
    voice_transcript: '' as string | null,
  });
  const [files, setFiles] = useState<File[]>([]);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const selectedScheme = WELFARE_SCHEMES.find(s => s.id === form.scheme_type);

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...incoming].slice(0, 6));
    e.target.value = '';
  };
  const removeFile = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!form.name || form.phone.length < 10 || !form.city || form.pincode.length !== 6
        || !form.scheme_type || !form.subcategory || !form.title || form.description.length < 5) {
      return toast.error(tt('அனைத்து புலங்களையும் நிரப்பவும்', 'Please fill all required fields'));
    }
    setSubmitting(true);
    try {
      // upload proof files first
      const proof_urls: string[] = [];
      for (const f of files) {
        const path = `welfare/${Date.now()}-${Math.random().toString(36).slice(2)}-${f.name.replace(/[^a-z0-9.]/gi,'_')}`;
        const { error: upErr } = await supabase.storage.from('problem-media').upload(path, f, { contentType: f.type });
        if (!upErr) {
          proof_urls.push(supabase.storage.from('problem-media').getPublicUrl(path).data.publicUrl);
        }
      }

      const { data: inserted, error } = await supabase.from('welfare_issues').insert({
        reporter_name: form.name.trim(),
        reporter_phone: form.phone,
        reporter_age: form.age ? Number(form.age) : null,
        city: form.city,
        constituency: form.constituency || null,
        area: form.area || null,
        pincode: form.pincode,
        address_line: form.addressLine || null,
        scheme_type: form.scheme_type,
        subcategory: form.subcategory,
        scheme_name: form.scheme_name || null,
        application_id: form.application_id || null,
        months_pending: form.months_pending || null,
        department: selectedScheme?.routedDepartment || null,
        title: form.title.trim(),
        description: form.description.trim(),
        urgency: form.urgency,
        status: 'submitted',
        proof_urls,
        voice_note_url: form.voice_note_url || null,
        voice_transcript: form.voice_transcript || null,
      } as any).select('id, ticket_no').single();

      if (error) { console.error(error); toast.error(error.message); return; }
      // Fire-and-forget SMS confirmation to citizen
      supabase.functions.invoke('send-sms', { body: { welfareId: inserted.id, trigger: 'WELFARE_SUBMITTED' } })
        .catch(e => console.warn('[welfare-sms]', e));
      setTicket(inserted);
      setStep(5);
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 5 && ticket) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-6 md:p-8 text-center shadow-lg">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">{tt('நலத்திட்ட புகார் பதிவாகியது!', 'Welfare Issue Registered!')}</h2>
          <p className="text-muted-foreground text-sm mb-6">{tt('உங்கள் டிக்கெட் எண்', 'Your ticket number')}</p>
          <div className="bg-muted rounded-lg p-4 mb-6 flex items-center justify-between gap-2">
            <span className="font-mono font-bold text-lg">{ticket.ticket_no}</span>
            <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(ticket.ticket_no); toast.success('Copied'); }}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            {tt('உங்கள் புகார் சம்பந்தப்பட்ட துறைக்கு அனுப்பப்படும்', 'Your issue will be routed to the relevant department')}
          </p>
          <Button
            variant="outline"
            className="w-full mb-2"
            disabled={downloadingPdf}
            onClick={async () => {
              setDownloadingPdf(true);
              try {
                await downloadComplaintPdf({
                  ticket_no: ticket.ticket_no,
                  submitted_at: new Date(),
                  status: 'submitted',
                  citizen: {
                    name: form.name, phone: form.phone, age: form.age,
                    city: form.city, constituency: form.constituency, area: form.area, pincode: form.pincode,
                  },
                  complaint: {
                    department: selectedScheme?.routedDepartment, department_label: selectedScheme?.en,
                    category: form.subcategory, category_label: form.subcategory,
                    urgency: form.urgency, title: form.title, description: form.description,
                  },
                  evidence_count: files.length,
                  has_voice_note: !!form.voice_note_url,
                });
              } catch (e: any) { toast.error(e?.message || 'PDF failed'); }
              finally { setDownloadingPdf(false); }
            }}
          >
            {downloadingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {tt('PDF ரசீது பதிவிறக்கம்', 'Download PDF receipt')}
          </Button>
          <Button variant="hero" className="w-full" onClick={onClose}>{tt('முடிக்க', 'Done')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-4 md:py-8 px-3 md:px-4 overflow-x-hidden">
      <div className="container mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={onClose} size="sm"><ArrowLeft className="w-4 h-4 mr-1" />{tt('முகப்பு', 'Home')}</Button>
          <div className="flex items-center gap-2"><TVKLogo size="sm" /><span className="font-bold text-primary">Makkal Connect</span></div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 md:p-6 shadow">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-5 h-5 text-primary" />
            <h1 className="text-lg md:text-xl font-bold">{tt('நலத்திட்ட புகார்', 'Welfare / Scheme Issue')}</h1>
          </div>
          <p className="text-xs text-muted-foreground mb-5">
            {tt('அரசு திட்டம் / உரிமை கிடைக்காமல், தாமதம் அல்லது நிராகரிக்கப்பட்டால் இங்கு புகாரளிக்கவும்.',
              'Report when a government benefit is delayed, denied or stuck.')}
          </p>

          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className={`flex-1 h-1.5 rounded-full ${step >= n ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-base font-bold">{tt('உங்கள் விவரங்கள்', 'Your Details')}</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label>{tt('பெயர்', 'Name')} *</Label><Input value={form.name} onChange={e => set('name', e.target.value)} /></div>
                <div><Label>{tt('கைபேசி', 'Phone')} *</Label><Input value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} /></div>
                <div><Label>{tt('வயது', 'Age')}</Label><Input type="number" value={form.age} onChange={e => set('age', e.target.value)} /></div>
                <div><Label>{tt('நகரம்', 'City / District')} *</Label>
                  <Select value={form.city || undefined} onValueChange={(v) => { set('city', v); set('constituency', ''); }}>
                    <SelectTrigger><SelectValue placeholder="--" /></SelectTrigger>
                    <SelectContent>{Object.keys(CONSTITUENCIES).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>{tt('தொகுதி', 'Constituency')}</Label>
                  <Select value={form.constituency || undefined} onValueChange={(v) => set('constituency', v)} disabled={!form.city}>
                    <SelectTrigger><SelectValue placeholder="--" /></SelectTrigger>
                    <SelectContent>{(CONSTITUENCIES[form.city] || []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>{tt('பகுதி', 'Area')}</Label><Input value={form.area} onChange={e => set('area', e.target.value)} /></div>
                <div><Label>{tt('அஞ்சல்', 'Pincode')} *</Label><Input value={form.pincode} onChange={e => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} /></div>
              </div>
              <div className="flex justify-end pt-2">
                <Button variant="hero" onClick={() => setStep(2)}
                  disabled={!form.name || form.phone.length < 10 || !form.city || form.pincode.length !== 6}>
                  {tt('அடுத்தது', 'Next')} →
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-base font-bold">{tt('நலத்திட்டத் துறை', 'Welfare Department')} *</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {WELFARE_SCHEMES.map(s => (
                  <button key={s.id} type="button" onClick={() => { set('scheme_type', s.id); set('subcategory', ''); }}
                    className={`p-3 rounded-lg border text-xs font-medium transition ${form.scheme_type === s.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted'}`}>
                    <div className="text-2xl mb-1">{s.icon}</div>
                    {tt(s.ta, s.en)}
                  </button>
                ))}
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(1)}>← {tt('பின்', 'Back')}</Button>
                <Button variant="hero" onClick={() => setStep(3)} disabled={!form.scheme_type}>{tt('அடுத்தது', 'Next')} →</Button>
              </div>
            </div>
          )}

          {step === 3 && selectedScheme && (
            <div className="space-y-4">
              <h2 className="text-base font-bold">{tt('என்ன பிரச்சனை?', "What's the issue?")} *</h2>
              <div>
                <Label>{tt('வகை', 'Subcategory')} *</Label>
                <Select value={form.subcategory || undefined} onValueChange={(v) => set('subcategory', v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="--" /></SelectTrigger>
                  <SelectContent>
                    {selectedScheme.subcategories.map(c => <SelectItem key={c.id} value={c.id}>{tt(c.ta, c.en)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {selectedScheme.extraFields?.includes('scheme_name') && (
                <div><Label>{tt('திட்டப் பெயர் (விருப்பம்)', 'Scheme name (optional)')}</Label>
                  <Input value={form.scheme_name} onChange={e => set('scheme_name', e.target.value)} /></div>
              )}
              {selectedScheme.extraFields?.includes('application_id') && (
                <div><Label>{tt('விண்ணப்ப எண் (விருப்பம்)', 'Application ID (optional)')}</Label>
                  <Input value={form.application_id} onChange={e => set('application_id', e.target.value)} /></div>
              )}
              {selectedScheme.extraFields?.includes('months_pending') && (
                <div><Label>{tt('எத்தனை மாதம் காத்திருக்கிறீர்கள்?', 'How long pending?')}</Label>
                  <Select value={form.months_pending || undefined} onValueChange={(v) => set('months_pending', v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="--" /></SelectTrigger>
                    <SelectContent>
                      {MONTHS_PENDING_OPTIONS.map(m => <SelectItem key={m.id} value={m.id}>{tt(m.ta, m.en)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>{tt('அவசர நிலை', 'Urgency')} *</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {URGENCY_LEVELS.map(u => (
                    <button key={u.id} type="button" onClick={() => set('urgency', u.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border ${form.urgency === u.id ? 'bg-primary text-primary-foreground border-primary' : u.color}`}>
                      {tt(u.ta, u.en)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(2)}>← {tt('பின்', 'Back')}</Button>
                <Button variant="hero" onClick={() => setStep(4)} disabled={!form.subcategory}>{tt('அடுத்தது', 'Next')} →</Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-base font-bold">{tt('விவரம் & ஆதாரம்', 'Details & Evidence')}</h2>

              <VoiceNoteRecorder
                folder="welfare"
                language={language === 'en' ? 'en' : 'ta'}
                onProcessed={({ voice_note_url, transcript, title, description }) => {
                  set('voice_note_url', voice_note_url);
                  set('voice_transcript', transcript);
                  if (title && !form.title) set('title', title);
                  if (description && form.description.length < 5) set('description', description);
                }}
              />

              <div><Label>{tt('தலைப்பு', 'Title')} *</Label>
                <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder={tt('சுருக்கம்', 'Short summary')} /></div>
              <div><Label>{tt('விரிவான விளக்கம்', 'Description')} *</Label>
                <Textarea rows={4} value={form.description} onChange={e => set('description', e.target.value)}
                  placeholder={tt('என்ன பிரச்சனை, எப்போது இருந்து, எத்தனை முறை முயற்சித்தீர்கள்...',
                    'What is the issue, since when, how many times you tried...')} /></div>
              <div><Label>{tt('முகவரி (விருப்பம்)', 'Address (optional)')}</Label>
                <Input value={form.addressLine} onChange={e => set('addressLine', e.target.value)} /></div>

              <div>
                <Label className="text-xs">{tt('ஆதாரம் (ரசீது / ரகசிய SMS / நிராகரிப்பு)', 'Proof (receipt / SMS / rejection slip)')}</Label>
                <label className="cursor-pointer block mt-1">
                  <input type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
                  <div className="h-10 flex items-center justify-center border border-input rounded-md text-xs hover:bg-muted px-2">
                    <Camera className="w-4 h-4 mr-2 shrink-0" />
                    <span>{files.length ? `+ ${tt('மேலும்', 'Add more')} (${files.length}/6)` : tt('படம் பதிவேற்று', 'Upload images')}</span>
                  </div>
                </label>
              </div>

              {files.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {files.map((f, i) => (
                    <div key={i} className="relative aspect-square bg-muted rounded-lg overflow-hidden border">
                      <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeFile(i)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(3)}>← {tt('பின்', 'Back')}</Button>
                <Button variant="hero" onClick={submit} disabled={submitting}>
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {tt('சமர்ப்பிக்க', 'Submit')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WelfareReportingWizard;
