import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Paperclip, Check, MessageCircle, MapPin, Keyboard, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useT, useLang, depLabel } from '@/lib/i18n/cadreT';
import LanguageToggle from '@/components/layout/LanguageToggle';
import { DEPARTMENTS } from '@/lib/departments';
import VoiceNoteRecorder from '@/components/VoiceNoteRecorder';
import { COIMBATORE_CONSTITUENCIES, DEFAULT_DISTRICT } from '@/lib/constituencies';
import CadreFiledBadge from '@/components/CadreFiledBadge';
import {
  StepId, ChatAnswers, Mode, nextStep, subCategoriesFor, URGENCY, submitReport,
  welfareSchemes, welfareSubcategoriesFor, fundCategories,
} from '@/lib/chatbot/problemFlow';

type BubbleKind = 'bot' | 'user';
interface Bubble { kind: BubbleKind; text: string; }

const ChatBot: React.FC = () => {
  const nav = useNavigate();
  const t = useT();
  const lang = useLang();
  // Cadre-only: file-on-behalf is the ONLY mode; public/citizen chat removed.
  const [cadreId, setCadreId] = useState<string | null>(null);
  const [step, setStep] = useState<StepId>('greeting');
  const [answers, setAnswers] = useState<ChatAnswers>({});
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [ticket, setTicket] = useState<{ id: string; ticket_no: string } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Cadre auth gate
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { nav('/cadre/login'); return; }
      const { data: c } = await supabase.from('cadres').select('id, constituency').eq('user_id', session.user.id).maybeSingle();
      if (!c) { toast.error('Cadre account required'); nav('/cadre/login'); return; }
      setCadreId(c.id);
      setAnswers(a => ({ ...a, district: DEFAULT_DISTRICT, constituency: c.constituency || undefined }));
    })();
  }, [nav]);

  const say = (kind: BubbleKind, text: string) =>
    setBubbles(b => [...b, { kind, text }]);

  // Ask the prompt for a step
  const promptFor = (s: StepId): string => {
    switch (s) {
      case 'greeting':      return t.chat_greeting;
      case 'category':      return t.chat_ask_category;
      case 'subcategory':   return t.chat_ask_subcategory;
      case 'urgency':       return t.chat_ask_urgency;
      case 'scheme_type':   return lang === 'ta' ? 'எந்த நல திட்டம்?' : 'Which welfare scheme?';
      case 'scheme_subcategory': return lang === 'ta' ? 'சிக்கல் வகையைத் தேர்வுசெய்க:' : 'Pick the issue sub-type:';
      case 'application_id': return lang === 'ta' ? 'விண்ணப்ப எண் / அட்டை எண் (இருந்தால்):' : 'Application / card number (if any):';
      case 'fund_category': return lang === 'ta' ? 'எந்த வகை நிதி உதவி?' : 'Which type of fund assistance?';
      case 'fund_amount':   return lang === 'ta' ? 'தேவைப்படும் தொகை (₹)?' : 'Amount needed (₹)?';
      case 'fund_purpose':  return lang === 'ta' ? 'நிதி தேவைப்படும் நோக்கத்தை விளக்குங்கள்:' : 'Explain the purpose of the fund request:';
      case 'fund_bank':     return lang === 'ta' ? 'வங்கி விபரங்கள் (கணக்கு எண் / IFSC) — விருப்பம்:' : 'Bank details (account / IFSC) — optional:';
      case 'district':      return t.chat_ask_district || 'Select district:';
      case 'constituency':  return t.chat_ask_constituency;
      case 'belongs_to_constituency': return t.chat_ask_belongs || 'Does the citizen belong to this constituency?';
      case 'pincode':       return t.chat_ask_pincode;
      case 'area':          return t.chat_ask_area;
      case 'title_mode':    return t.chat_ask_title_mode || 'How would you like to add the title & description — type or voice record?';
      case 'title':         return t.chat_ask_title;
      case 'desc_mode':     return t.chat_ask_desc_mode || 'How would you like to add the description — type or voice record?';
      case 'description':   return t.chat_ask_description;
      case 'months_pending':return t.chat_ask_months || 'How many months has this been pending?';
      case 'photos':        return t.chat_ask_photos;
      case 'citizen_name':  return t.chat_ask_citizen_name;
      case 'citizen_phone': return t.chat_ask_citizen_phone;
      case 'review':        return t.chat_review_title;
      default:              return '';
    }
  };

  // Auto-scroll
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [bubbles, step]);

  // Kick off with greeting
  useEffect(() => {
    if (bubbles.length === 0) say('bot', t.chat_greeting);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const advance = (label: string, next: StepId) => {
    say('user', label);
    setInput('');
    setStep(next);
    setTimeout(() => say('bot', promptFor(next)), 250);
  };

  const mode: Mode = answers.mode || 'report';

  // Handlers per input type
  const chooseMode = (m: Mode, label: string) => {
    setAnswers(a => ({ ...a, mode: m }));
    const next: StepId = m === 'welfare' ? 'scheme_type' : m === 'fund' ? 'fund_category' : 'category';
    advance(label, next);
  };

  const chooseDept = (deptId: string, label: string) => {
    setAnswers(a => ({ ...a, department: deptId, category: undefined }));
    advance(label, 'subcategory');
  };
  const chooseSub = (catId: string, label: string) => {
    setAnswers(a => ({ ...a, category: catId }));
    advance(label, 'urgency');
  };
  const chooseUrgency = (uId: string, label: string) => {
    setAnswers(a => ({ ...a, urgency: uId }));
    advance(label, mode === 'fund' ? 'district' : 'district');
  };

  const chooseScheme = (schemeId: string, label: string) => {
    setAnswers(a => ({ ...a, scheme_type: schemeId, scheme_subcategory: undefined }));
    advance(label, 'scheme_subcategory');
  };
  const chooseSchemeSub = (subId: string, label: string) => {
    setAnswers(a => ({ ...a, scheme_subcategory: subId }));
    advance(label, 'district');
  };
  const chooseFundCat = (catId: string, label: string) => {
    setAnswers(a => ({ ...a, fund_category: catId }));
    advance(label, 'fund_amount');
  };

  const chooseDistrict = (d: string) => {
    setAnswers(a => ({ ...a, district: d }));
    advance(d, 'constituency');
  };
  const chooseConstituency = (c: string) => {
    setAnswers(a => ({ ...a, constituency: c }));
    advance(c, 'belongs_to_constituency');
  };
  const chooseBelongs = (v: boolean, label: string) => {
    setAnswers(a => ({ ...a, belongs_to_constituency: v }));
    advance(label, 'pincode');
  };
  const chooseTitleMode = (m: 'type' | 'voice') => {
    advance(m === 'type' ? (t.chat_opt_type || 'Type') : (t.chat_opt_voice || 'Voice record'), 'title');
  };
  const chooseDescMode = (m: 'type' | 'voice') => {
    advance(m === 'type' ? (t.chat_opt_type || 'Type') : (t.chat_opt_voice || 'Voice record'),
      mode === 'fund' ? 'fund_purpose' : 'description');
  };
  const chooseMonths = (m: string) => {
    setAnswers(a => ({ ...a, months_pending: m }));
    advance(m, 'photos');
  };

  const submitText = () => {
    const v = input.trim();
    if (!v) return toast.error(t.chat_field_required);
    if (step === 'citizen_phone' && !/^\d{10}$/.test(v))
      return toast.error(t.chat_invalid_phone);
    if (step === 'fund_amount' && !/^\d+$/.test(v))
      return toast.error(lang === 'ta' ? 'சரியான தொகையை உள்ளிடவும்' : 'Enter a valid amount (digits only).');

    const key: Record<string, keyof ChatAnswers> = {
      pincode: 'pincode', area: 'area',
      title: 'title', description: 'description',
      citizen_name: 'citizen_name', citizen_phone: 'citizen_phone',
      application_id: 'application_id',
      fund_amount: 'fund_amount', fund_purpose: 'fund_purpose', fund_bank: 'fund_bank',
    };
    const k = key[step];
    if (k) setAnswers(a => ({ ...a, [k]: v } as ChatAnswers));
    // After typed title → ask desc_mode; else default nextStep
    const next = step === 'title' ? ('desc_mode' as StepId) : nextStep(step, mode);
    advance(v, next);
  };

  const attachFiles = (files: FileList | null) => {
    if (!files || !files.length) { advance(t.chat_skip, nextStep('photos', mode)); return; }
    const arr = Array.from(files);
    setAnswers(a => ({ ...a, files: arr }));
    advance(`📎 ${arr.length} file(s)`, nextStep('photos', mode));
  };


  const doSubmit = async () => {
    setBusy(true);
    try {
      const res = await submitReport(answers, cadreId);
      setTicket(res);
      setStep('done');
      say('user', t.chat_submit);
      setTimeout(() => say('bot', `${t.chat_success}\n${t.chat_ticket_line(res.ticket_no)}\n\n✅ ${t.chat_filed_on_behalf || 'Filed on behalf (cadre-flagged)'}`), 250);
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit');
    } finally { setBusy(false); }
  };

  const restart = () => {
    setAnswers({ district: DEFAULT_DISTRICT, constituency: answers.constituency });
    setBubbles([{ kind: 'bot', text: t.chat_greeting }]);
    setStep('greeting');
    setTicket(null);
  };

  const dept = DEPARTMENTS.find(d => d.id === answers.department);
  const monthsOpts = ['<1', '1', '2', '3', '4-6', '6-12', '12+'];

  const onVoiceProcessed = (data: { voice_note_url: string; transcript: string; title: string; description: string }) => {
    setAnswers(a => ({
      ...a,
      voice_note_url: data.voice_note_url,
      title: data.title || data.transcript.slice(0, 80),
      description: data.description || data.transcript,
      fund_purpose: mode === 'fund' ? (data.description || data.transcript) : a.fund_purpose,
    }));
    say('user', `🎙️ ${data.title || 'Voice note'}\n${data.description || data.transcript}`);
    // After voice, jump to the next mode-appropriate step
    const jump: StepId = mode === 'welfare' ? 'application_id' : mode === 'fund' ? 'fund_bank' : 'months_pending';
    setStep(jump);
    setTimeout(() => say('bot', promptFor(jump)), 250);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between px-3 h-14">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => nav('/cadre')} aria-label="Back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div lang={lang} className="text-sm font-bold tamil-safe leading-tight">TVK Assistant</div>
              <div className="text-[10px] text-muted-foreground leading-none">Cadre · file on behalf</div>
            </div>
          </div>
          <LanguageToggle />
        </div>
      </header>

      {/* Transcript */}
      <main className="flex-1 overflow-y-auto px-3 py-4 space-y-2 max-w-2xl w-full mx-auto">
        {bubbles.map((b, i) => (
          <div key={i} className={`flex ${b.kind === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              lang={lang}
              className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-line tamil-safe shadow-sm ${
                b.kind === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-card border border-border rounded-bl-sm'
              }`}
            >
              {b.text}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </main>

      {/* Input area — switches by step */}
      <div className="sticky bottom-0 bg-background border-t border-border p-3 space-y-2 max-w-2xl w-full mx-auto" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}>
        {step === 'greeting' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button size="sm" onClick={() => chooseMode('report', `📋 ${t.chat_opt_report}`)}>📋 {t.chat_opt_report}</Button>
            <Button size="sm" variant="secondary" onClick={() => chooseMode('welfare', `🏛 ${t.chat_opt_welfare}`)}>🏛 {t.chat_opt_welfare}</Button>
            <Button size="sm" variant="outline" onClick={() => chooseMode('fund', `💰 ${lang === 'ta' ? 'நிதி உதவி கோரிக்கை' : 'Fund assistance'}`)}>
              💰 {lang === 'ta' ? 'நிதி உதவி' : 'Fund assistance'}
            </Button>
          </div>
        )}

        {step === 'category' && (
          <div className="grid grid-cols-2 gap-2">
            {DEPARTMENTS.map(d => (
              <button
                key={d.id}
                onClick={() => chooseDept(d.id, `${d.icon} ${depLabel(d, lang)}`)}
                className="text-left border border-border rounded-xl px-3 py-2 hover:bg-muted transition text-sm"
              >
                <span className="mr-1.5">{d.icon}</span>
                <span lang={lang} className="tamil-safe font-medium">{depLabel(d, lang)}</span>
              </button>
            ))}
          </div>
        )}

        {step === 'subcategory' && (
          <div className="flex flex-wrap gap-2">
            {subCategoriesFor(answers.department).map(c => (
              <button
                key={c.id}
                onClick={() => chooseSub(c.id, lang === 'ta' ? c.ta : c.en)}
                className="border border-border rounded-full px-3 py-1.5 text-sm hover:bg-muted"
                lang={lang}
              >
                <span className="tamil-safe">{lang === 'ta' ? c.ta : c.en}</span>
              </button>
            ))}
          </div>
        )}

        {step === 'scheme_type' && (
          <div className="grid grid-cols-2 gap-2">
            {welfareSchemes().map(s => (
              <button
                key={s.id}
                onClick={() => chooseScheme(s.id, `${s.icon} ${lang === 'ta' ? s.ta : s.en}`)}
                className="text-left border border-border rounded-xl px-3 py-2 hover:bg-muted transition text-sm"
              >
                <span className="mr-1.5">{s.icon}</span>
                <span lang={lang} className="tamil-safe font-medium">{lang === 'ta' ? s.ta : s.en}</span>
              </button>
            ))}
          </div>
        )}

        {step === 'scheme_subcategory' && (
          <div className="flex flex-wrap gap-2">
            {welfareSubcategoriesFor(answers.scheme_type).map(c => (
              <button
                key={c.id}
                onClick={() => chooseSchemeSub(c.id, lang === 'ta' ? c.ta : c.en)}
                className="border border-border rounded-full px-3 py-1.5 text-sm hover:bg-muted"
                lang={lang}
              >
                <span className="tamil-safe">{lang === 'ta' ? c.ta : c.en}</span>
              </button>
            ))}
          </div>
        )}

        {step === 'fund_category' && (
          <div className="grid grid-cols-2 gap-2">
            {fundCategories().map(c => (
              <button
                key={c.id}
                onClick={() => chooseFundCat(c.id, c.label)}
                className="text-left border border-border rounded-xl px-3 py-2 hover:bg-muted transition text-sm"
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        {step === 'urgency' && (
          <div className="flex flex-wrap gap-2">
            {URGENCY.map(u => (
              <button
                key={u.id}
                onClick={() => chooseUrgency(u.id, lang === 'ta' ? u.ta : u.en)}
                className={`rounded-full px-3 py-1.5 text-sm border ${u.color} border-transparent`}
                lang={lang}
              >
                <span className="tamil-safe">{lang === 'ta' ? u.ta : u.en}</span>
              </button>
            ))}
          </div>
        )}

        {step === 'district' && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => chooseDistrict(DEFAULT_DISTRICT)}>{DEFAULT_DISTRICT}</Button>
          </div>
        )}

        {step === 'constituency' && (
          <div className="flex flex-wrap gap-2">
            {COIMBATORE_CONSTITUENCIES.map(c => (
              <button key={c} onClick={() => chooseConstituency(c)} className="border border-border rounded-full px-3 py-1.5 text-sm hover:bg-muted tamil-safe">{c}</button>
            ))}
          </div>
        )}

        {step === 'belongs_to_constituency' && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => chooseBelongs(true, lang === 'ta' ? 'ஆம்' : 'Yes')}>{lang === 'ta' ? 'ஆம்' : 'Yes'}</Button>
            <Button size="sm" variant="outline" onClick={() => chooseBelongs(false, lang === 'ta' ? 'இல்லை' : 'No')}>{lang === 'ta' ? 'இல்லை' : 'No'}</Button>
          </div>
        )}

        {step === 'title_mode' && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => chooseTitleMode('type')}><Keyboard className="w-4 h-4 mr-1" /> {t.chat_opt_type || 'Type'}</Button>
            <Button size="sm" onClick={() => chooseTitleMode('voice')}><Mic className="w-4 h-4 mr-1" /> {t.chat_opt_voice || 'Voice record'}</Button>
          </div>
        )}

        {step === 'desc_mode' && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => chooseDescMode('type')}><Keyboard className="w-4 h-4 mr-1" /> {t.chat_opt_type || 'Type'}</Button>
            <Button size="sm" onClick={() => chooseDescMode('voice')}><Mic className="w-4 h-4 mr-1" /> {t.chat_opt_voice || 'Voice record'}</Button>
          </div>
        )}

        {/* Voice recorder appears when user chose voice for title (fills both title & description) */}
        {step === 'title' && !answers.title && bubbles.some(b => b.text.includes(t.chat_opt_voice || 'Voice record')) && (
          <VoiceNoteRecorder language={lang} onProcessed={onVoiceProcessed} />
        )}

        {step === 'months_pending' && (
          <div className="flex flex-wrap gap-2">
            {monthsOpts.map(m => (
              <button key={m} onClick={() => chooseMonths(m)} className="border border-border rounded-full px-3 py-1.5 text-sm hover:bg-muted">{m}</button>
            ))}
          </div>
        )}

        {(step === 'pincode' || step === 'area' ||
          (step === 'title' && !bubbles.some(b => b.text.includes(t.chat_opt_voice || 'Voice record'))) ||
          step === 'citizen_name' || step === 'citizen_phone' ||
          step === 'application_id' || step === 'fund_amount' || step === 'fund_bank') && (
          <form onSubmit={(e) => { e.preventDefault(); submitText(); }} className="flex gap-2">
            <Input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.chat_type_here}
              inputMode={
                step === 'citizen_phone' || step === 'pincode' || step === 'fund_amount' ? 'numeric' : 'text'
              }
              lang={lang}
              className="tamil-safe"
            />
            <Button type="submit" size="icon"><Send className="w-4 h-4" /></Button>
          </form>
        )}

        {step === 'fund_purpose' && (
          <form onSubmit={(e) => { e.preventDefault(); submitText(); }} className="space-y-2">
            <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder={t.chat_type_here} rows={3} lang={lang} className="tamil-safe resize-none" />
            <Button type="submit" className="w-full"><Send className="w-4 h-4 mr-1" />{t.chat_send}</Button>
          </form>
        )}

        {step === 'description' && (
          bubbles.some(b => b.text === (t.chat_opt_voice || 'Voice record')) ? (
            <VoiceNoteRecorder language={lang} onProcessed={onVoiceProcessed} />
          ) : (
          <form onSubmit={(e) => { e.preventDefault(); submitText(); }} className="space-y-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.chat_type_here}
              rows={3}
              lang={lang}
              className="tamil-safe resize-none"
            />
            <Button type="submit" className="w-full"><Send className="w-4 h-4 mr-1" />{t.chat_send}</Button>
          </form>
          )
        )}

        {step === 'photos' && (
          <div className="flex gap-2">
            <label className="flex-1 border border-dashed border-border rounded-xl px-3 py-3 text-sm text-center cursor-pointer hover:bg-muted">
              <Paperclip className="w-4 h-4 inline mr-1" /> {t.chat_ask_photos}
              <input type="file" hidden multiple accept="image/*,video/*" onChange={(e) => attachFiles(e.target.files)} />
            </label>
            <Button variant="outline" onClick={() => attachFiles(null)}>{t.chat_skip}</Button>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-2">
            <div className="border border-border rounded-xl p-3 text-sm bg-muted/40 space-y-1">
              <div className="flex items-center gap-2">
                <b>
                  {mode === 'welfare'
                    ? `🏛 ${welfareSchemes().find(s => s.id === answers.scheme_type)?.[lang === 'ta' ? 'ta' : 'en'] || ''}`
                    : mode === 'fund'
                      ? `💰 ${fundCategories().find(c => c.id === answers.fund_category)?.label || ''}`
                      : `${dept?.icon || ''} ${dept ? depLabel(dept, lang) : ''}`}
                </b>
                <CadreFiledBadge />
              </div>
              <div lang={lang} className="tamil-safe font-semibold">{answers.title}</div>
              <div lang={lang} className="tamil-safe text-muted-foreground text-xs">{answers.description || answers.fund_purpose}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {[answers.area, answers.constituency, answers.district, answers.pincode].filter(Boolean).join(' · ')}
              </div>
              <div className="text-xs">{answers.citizen_name} · {answers.citizen_phone}</div>
              {mode === 'welfare' && answers.application_id && <div className="text-xs">🆔 App# {answers.application_id}</div>}
              {mode === 'fund' && answers.fund_amount && <div className="text-xs">💵 ₹{answers.fund_amount}</div>}
              {mode === 'fund' && answers.fund_bank && <div className="text-xs">🏦 {answers.fund_bank}</div>}
              {answers.months_pending && <div className="text-xs">⏱ {answers.months_pending} months pending</div>}
              {answers.belongs_to_constituency !== undefined && <div className="text-xs">🏛 belongs to constituency: {answers.belongs_to_constituency ? 'yes' : 'no'}</div>}
              {answers.files?.length ? <div className="text-xs">📎 {answers.files.length} attachment(s)</div> : null}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={restart}>{t.chat_edit}</Button>
              <Button className="flex-1" onClick={doSubmit} disabled={busy}>
                <Check className="w-4 h-4 mr-1" /> {busy ? '…' : t.chat_submit}
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && ticket && (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={restart}>{t.chat_file_another}</Button>
            <Button className="flex-1" onClick={() => nav('/cadre')}>{lang === 'ta' ? 'டாஷ்போர்டு' : 'Dashboard'}</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatBot;