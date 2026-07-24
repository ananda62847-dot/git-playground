import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { ArrowLeft, MapPin, Camera, Loader2, CheckCircle, Copy, X, Plus, Download, Mic } from 'lucide-react';
import { DEPARTMENTS, URGENCY_LEVELS } from '@/lib/departments';
import { constituenciesByCity as CONSTITUENCIES } from '@/lib/constituencies';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { notifySms, notifyEmail } from '@/lib/notify';
import TVKLogo from './TVKLogo';
import VoiceNoteRecorder from './VoiceNoteRecorder';
import { downloadComplaintPdf } from '@/lib/complaintPdf';

interface Props { onClose: () => void }

const ProblemReportingWizard: React.FC<Props> = ({ onClose }) => {
  const { language, isBilingual } = useLanguage();
  const tt = (ta: string, en: string) => (isBilingual ? `${ta} / ${en}` : language === 'en' ? en : ta);

  const [step, setStepRaw] = useState(1);
  const setStep = (n: number) => {
    setStepRaw(n);
    queueMicrotask(() => window.scrollTo({ top: 0, left: 0, behavior: 'smooth' }));
  };
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState<{ ticket_no: string; id: string } | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const [form, setForm] = useState({
    name: '', phone: '', age: '', city: '', constituency: '', area: '', pincode: '',
    addressLine: '', latitude: null as number | null, longitude: null as number | null,
    department: '', category: '', urgency: 'medium', title: '', description: '',
    isLocalResident: '' as '' | 'yes' | 'no',
    voice_note_url: '' as string | null,
    voice_transcript: '' as string | null,
  });
  const [files, setFiles] = useState<File[]>([]);
  const [gpsLoading, setGpsLoading] = useState(false);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const captureGPS = () => {
    if (!navigator.geolocation) return toast.error(tt('GPS ஆதரவு இல்லை', 'GPS not supported by this browser'));
    if (!window.isSecureContext) return toast.error(tt('GPS க்கு HTTPS தேவை', 'GPS requires HTTPS'));
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        set('latitude', pos.coords.latitude);
        set('longitude', pos.coords.longitude);
        setGpsLoading(false);
        toast.success(tt('இடம் பதிவாகியது', 'Location captured'));
      },
      err => {
        setGpsLoading(false);
        const msg =
          err.code === 1 ? tt('அனுமதி மறுக்கப்பட்டது — உலாவி அமைப்புகளில் இடத்தை அனுமதிக்கவும்', 'Permission denied — allow location in browser settings') :
          err.code === 2 ? tt('இடம் கிடைக்கவில்லை — பின்னர் முயற்சிக்கவும்', 'Location unavailable — try again later') :
          err.code === 3 ? tt('நேரம் முடிந்தது — மீண்டும் முயற்சிக்கவும்', 'Timed out — please retry') :
          tt('இடம் கிடைக்கவில்லை', 'Could not get location');
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...incoming].slice(0, 8));
    e.target.value = '';
  };
  const removeFile = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (!form.name || form.phone.length < 10 || !form.city || form.pincode.length !== 6 || !form.department || !form.category || !form.title || form.description.length < 5) {
      return toast.error(tt('அனைத்து புலங்களையும் நிரப்பவும்', 'Please fill all required fields'));
    }
    setSubmitting(true);
    try {
      const dept = DEPARTMENTS.find(d => d.id === form.department);
      const localityTag = form.isLocalResident === 'yes'
        ? '[Local resident of constituency]'
        : form.isLocalResident === 'no' ? '[NOT local resident — outside constituency]' : '';
      const addressWithTag = [form.addressLine?.trim(), localityTag].filter(Boolean).join(' · ') || null;
      const { data: inserted, error } = await supabase.from('problems').insert({
        reporter_name: form.name.trim(), reporter_phone: form.phone, reporter_age: form.age ? Number(form.age) : null,
        city: form.city, constituency: form.constituency || null, area: form.area || null,
        pincode: form.pincode, address_line: addressWithTag,
        latitude: form.latitude, longitude: form.longitude,
        department: form.department, category: form.category, urgency: form.urgency,
        title: form.title.trim(), description: form.description.trim(),
        status: 'reported',
        voice_note_url: form.voice_note_url || null,
        voice_transcript: form.voice_transcript || null,
      } as any).select('id, ticket_no').single();

      if (error) { console.error(error); toast.error(error.message); return; }

      // Duplicate detection: same dept+category+constituency in last 30 days within ~500m if GPS
      try {
        const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
        const { data: dupes } = await supabase.from('problems')
          .select('id, latitude, longitude, master_problem_id')
          .eq('department', form.department).eq('category', form.category)
          .eq('constituency', form.constituency || '').gte('created_at', since)
          .neq('id', inserted.id).limit(20);
        let masterId: string | null = null;
        if (dupes && dupes.length) {
          if (form.latitude && form.longitude) {
            const near = dupes.find(d => d.latitude && d.longitude &&
              Math.hypot((d.latitude - form.latitude!) * 111000, (d.longitude - form.longitude!) * 96000) < 500);
            masterId = near?.master_problem_id || near?.id || null;
          } else {
            masterId = dupes[0].master_problem_id || dupes[0].id;
          }
          if (masterId) {
            await supabase.from('problems').update({ master_problem_id: masterId }).eq('id', inserted.id);
            await supabase.rpc as any;
            const { data: master } = await supabase.from('problems').select('support_count').eq('id', masterId).single();
            if (master) await supabase.from('problems').update({ support_count: (master.support_count || 1) + 1 }).eq('id', masterId);
          }
        }
      } catch (e) { console.warn('dup detect failed', e); }

      // Upload media
      if (files.length) {
        for (const f of files) {
          const path = `${inserted.id}/${Date.now()}-${f.name}`;
          const { error: upErr } = await supabase.storage.from('problem-media').upload(path, f);
          if (!upErr) {
            const { data: pub } = supabase.storage.from('problem-media').getPublicUrl(path);
            await supabase.from('problem_media').insert({
              problem_id: inserted.id, url: pub.publicUrl,
              media_type: f.type.startsWith('video') ? 'video' : 'image',
            });
          }
        }
      }

      // Initial timeline entry
      await supabase.from('problem_updates').insert({
        problem_id: inserted.id, status: 'reported',
        note: tt('புகார் பதிவு செய்யப்பட்டது', 'Complaint registered'),
      });

      // Fire notifications (non-blocking, fail silently)
      notifySms(inserted.id, 'REPORTED');
      notifyEmail(inserted.id, 'REPORT_CREATED');

      // Push: alert constituency admins + department officers
      const { sendPush } = await import('@/lib/push');
      const url = `/admin/dashboard?ticket=${inserted.ticket_no}`;
      const title = `New report · ${inserted.ticket_no}`;
      const body = `${form.title.trim()} — ${form.constituency || form.city}`;
      if (form.constituency) {
        sendPush({ title, body, severity: form.urgency === 'emergency' ? 'critical' : 'medium',
          type: 'report_created', url, target: { role: 'constituency_admin', constituency: form.constituency } });
      }
      if (form.department) {
        sendPush({ title, body, severity: 'medium', type: 'report_created', url,
          target: { role: 'department_admin', department: form.department } });
      }
      sendPush({ title, body, severity: 'info', type: 'report_created', url,
        target: { role: 'super_admin' } });

      setTicket(inserted);
      setStep(4);
    } finally { setSubmitting(false); }
  };

  if (step === 4 && ticket) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-6 md:p-8 text-center shadow-lg">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">{tt('புகார் பதிவாகியது!', 'Complaint Registered!')}</h2>
          <p className="text-muted-foreground text-sm mb-6">{tt('உங்கள் டிக்கெட் எண்', 'Your ticket number')}</p>
          <div className="bg-muted rounded-lg p-4 mb-6 flex items-center justify-between gap-2">
            <span className="font-mono font-bold text-lg">{ticket.ticket_no}</span>
            <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(ticket.ticket_no); toast.success('Copied'); }}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mb-6">
            {tt('இந்த எண்ணைப் பயன்படுத்தி எந்த நேரத்திலும் நிலையை சரிபார்க்கலாம்', 'Use this number to track status anytime')}
          </p>
          <Button
            variant="outline"
            className="w-full mb-2"
            disabled={downloadingPdf}
            onClick={async () => {
              setDownloadingPdf(true);
              try {
                const dept = DEPARTMENTS.find(d => d.id === form.department);
                const cat = dept?.categories.find(c => c.id === form.category);
                await downloadComplaintPdf({
                  ticket_no: ticket.ticket_no,
                  submitted_at: new Date(),
                  status: 'Submitted',
                  citizen: {
                    name: form.name, phone: form.phone, age: form.age,
                    constituency: form.constituency, city: form.city || 'Coimbatore',
                    area: form.area, pincode: form.pincode,
                  },
                  complaint: {
                    department: form.department, department_label: dept?.en,
                    category: form.category, category_label: cat?.en,
                    urgency: form.urgency,
                    title: form.title, description: form.description,
                  },
                  location: { latitude: form.latitude, longitude: form.longitude },
                  evidence_count: files.length,
                  has_voice_note: !!form.voice_note_url,
                });
                toast.success('PDF downloaded');
              } catch (e: any) {
                toast.error(e?.message || 'Could not generate PDF');
              } finally {
                setDownloadingPdf(false);
              }
            }}
          >
            {downloadingPdf ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {tt('PDF பதிவிறக்கம்', 'Download Complaint PDF')}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => window.location.href = `/track?t=${ticket.ticket_no}`}>{tt('நிலை காண', 'Track Status')}</Button>
            <Button variant="hero" className="flex-1" onClick={onClose}>{tt('முடிக்க', 'Done')}</Button>
          </div>
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
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3].map(n => (
              <div key={n} className={`flex-1 h-1.5 rounded-full ${step >= n ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">{tt('உங்கள் விவரங்கள்', 'Your Details')}</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label>{tt('பெயர்', 'Name')} *</Label><Input value={form.name} onChange={e => set('name', e.target.value)} /></div>
                <div><Label>{tt('கைபேசி', 'Phone')} *</Label><Input value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} /></div>
                <div><Label>{tt('வயது', 'Age')}</Label><Input type="number" value={form.age} onChange={e => set('age', e.target.value)} /></div>
                <div><Label>{tt('நகரம்', 'City / District')} *</Label>
                  <Select value={form.city || undefined} onValueChange={(v) => { set('city', v); set('constituency', ''); }}>
                    <SelectTrigger><SelectValue placeholder="--" /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(CONSTITUENCIES).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>{tt('தொகுதி', 'Constituency')}</Label>
                  <Select value={form.constituency || undefined} onValueChange={(v) => set('constituency', v)} disabled={!form.city}>
                    <SelectTrigger><SelectValue placeholder="--" /></SelectTrigger>
                    <SelectContent>
                      {(CONSTITUENCIES[form.city] || []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>{tt('பகுதி', 'Area / Locality')}</Label><Input value={form.area} onChange={e => set('area', e.target.value)} /></div>
                <div><Label>{tt('அஞ்சல் குறியீடு', 'Pincode')} *</Label><Input value={form.pincode} onChange={e => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} /></div>
              </div>

              {form.constituency && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <Label className="text-sm">
                    {tt(
                      `நீங்கள் "${form.constituency}" தொகுதியில் வசிக்கிறீர்களா?`,
                      `Do you live in the "${form.constituency}" constituency?`
                    )} *
                  </Label>
                  <div className="flex gap-2 mt-2">
                    {(['yes','no'] as const).map(opt => (
                      <button key={opt} type="button" onClick={() => set('isLocalResident', opt)}
                        className={`flex-1 px-3 py-2 rounded-md border text-sm font-medium transition ${form.isLocalResident === opt ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted'}`}>
                        {opt === 'yes' ? tt('ஆம், இங்கு வசிக்கிறேன்', 'Yes, I live here') : tt('இல்லை, வேறு தொகுதி', 'No, I am from elsewhere')}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end pt-2">
                <Button variant="hero" onClick={() => setStep(2)} disabled={!form.name || form.phone.length < 10 || !form.city || form.pincode.length !== 6 || (!!form.constituency && !form.isLocalResident)}>{tt('அடுத்தது', 'Next')} →</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">{tt('என்ன பிரச்சனை?', "What's the problem?")}</h2>
              <div>
                <Label>{tt('துறை', 'Department')} *</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {DEPARTMENTS.map(d => (
                    <button key={d.id} type="button" onClick={() => { set('department', d.id); set('category', ''); }}
                      className={`p-2 rounded-lg border text-xs font-medium transition ${form.department === d.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted'}`}>
                      <div className="text-2xl mb-1">{d.icon}</div>
                      {tt(d.ta, d.en)}
                    </button>
                  ))}
                </div>
              </div>
              {form.department && (
                <div>
                  <Label>{tt('வகை', 'Category')} *</Label>
                  <Select value={form.category || undefined} onValueChange={(v) => set('category', v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="--" /></SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.find(d => d.id === form.department)?.categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>{tt(c.ta, c.en)}</SelectItem>
                      ))}
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
                <Button variant="ghost" onClick={() => setStep(1)}>← {tt('பின்', 'Back')}</Button>
                <Button variant="hero" onClick={() => setStep(3)} disabled={!form.department || !form.category}>{tt('அடுத்தது', 'Next')} →</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">{tt('விவரம் & ஆதாரம்', 'Details & Evidence')}</h2>

              <VoiceNoteRecorder
                folder="problems"
                onProcessed={({ voice_note_url, transcript, title, description }) => {
                  set('voice_note_url', voice_note_url);
                  set('voice_transcript', transcript);
                  if (title) set('title', title);
                  if (description) set('description', description);
                }}
              />

              <div><Label>{tt('தலைப்பு', 'Title')} *</Label><Input value={form.title} onChange={e => set('title', e.target.value)} placeholder={tt('சுருக்கமாக', 'Short summary')} /></div>
              <div><Label>{tt('விரிவான விளக்கம்', 'Description')} *</Label>
                <Textarea rows={4} value={form.description} onChange={e => set('description', e.target.value)} placeholder={tt('என்ன பிரச்சனை, எப்போது இருந்து...', 'What is the issue, since when...')} />
              </div>
              {form.voice_note_url && (
                <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 dark:bg-green-950/40 dark:text-green-300 rounded-md px-3 py-2">
                  <Mic className="w-3.5 h-3.5" /> Voice note attached
                </div>
              )}
              <div><Label>{tt('முகவரி (விருப்பம்)', 'Address (optional)')}</Label><Input value={form.addressLine} onChange={e => set('addressLine', e.target.value)} /></div>

              <div className="grid sm:grid-cols-2 gap-3">
                <Button type="button" variant="outline" onClick={captureGPS} disabled={gpsLoading} className="h-auto min-h-10 py-2 px-3 text-xs whitespace-normal text-center leading-tight">
                  {gpsLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" /> : <MapPin className="w-4 h-4 mr-2 shrink-0" />}
                  <span className="truncate">{form.latitude ? tt('இடம் பதிவாகியது ✓', 'Location captured ✓') : tt('GPS பெறு', 'Capture GPS')}</span>
                </Button>
                <label className="cursor-pointer">
                  <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={onFiles} />
                  <div className="h-10 flex items-center justify-center border border-input rounded-md text-xs hover:bg-muted px-2 text-center">
                    <Camera className="w-4 h-4 mr-2 shrink-0" />
                    <span className="truncate">{files.length ? `+ ${tt('மேலும்', 'Add more')} (${files.length})` : tt('புகைப்படம்/வீடியோ', 'Photo / Video')}</span>
                  </div>
                </label>
              </div>

              {files.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {files.map((f, i) => {
                    const isImg = f.type.startsWith('image');
                    const url = URL.createObjectURL(f);
                    return (
                      <div key={i} className="relative group aspect-square bg-muted rounded-lg overflow-hidden border">
                        {isImg ? <img src={url} alt="" className="w-full h-full object-cover" />
                          : <video src={url} className="w-full h-full object-cover" />}
                        <button type="button" onClick={() => removeFile(i)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg opacity-90 hover:opacity-100"><X className="w-3 h-3" /></button>
                      </div>
                    );
                  })}
                  <label className="cursor-pointer aspect-square border-2 border-dashed rounded-lg flex items-center justify-center hover:bg-muted">
                    <Plus className="w-5 h-5 text-muted-foreground" />
                    <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={onFiles} />
                  </label>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(2)}>← {tt('பின்', 'Back')}</Button>
                <Button variant="hero" onClick={submit} disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {tt('புகார் சமர்ப்பிக்க', 'Submit Complaint')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProblemReportingWizard;
