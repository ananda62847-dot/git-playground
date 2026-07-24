import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import BackButton from '@/components/BackButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { STATUS_STAGES, DEPARTMENTS, URGENCY_LEVELS } from '@/lib/departments';
import { useLanguage } from '@/contexts/LanguageContext';
import { Search, MapPin, Calendar, Users, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmAndRateModal from '@/components/track/ConfirmAndRateModal';
import { fmtIST } from '@/lib/datetime';

const TrackProblem: React.FC = () => {
  const { language, isBilingual } = useLanguage();
  const tt = (ta: string, en: string) => (isBilingual ? `${ta} / ${en}` : language === 'en' ? en : ta);
  const [params] = useSearchParams();
  // Support both `?t=` (legacy) and `?ticket=` + `&auto=1` (Makkal Connect QR flow).
  const initialTicket = params.get('ticket') || params.get('t') || '';
  const [query, setQuery] = useState(initialTicket);
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState<any>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [claim, setClaim] = useState<any>(null);
  const [assignee, setAssignee] = useState<{ name: string; level?: string; constituency?: string; phone?: string } | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [showRate, setShowRate] = useState(false);
  const [survey, setSurvey] = useState<any>(null);


  const formatIST = (value: string) => new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata',
  }).format(new Date(value));

  const lookup = async (q?: string) => {
    const term = (q ?? query).trim();
    if (!term) return;
    setLoading(true); setProblem(null);
    const isPhone = /^\d{10}$/.test(term);
    const sb = supabase.from('problems').select('*').order('created_at', { ascending: false }).limit(1);
    const { data, error } = isPhone ? await sb.eq('reporter_phone', term) : await sb.eq('ticket_no', term.toUpperCase());
    if (error || !data?.length) { toast.error(tt('கண்டுபிடிக்கப்படவில்லை', 'Not found')); setLoading(false); return; }
    const p = data[0];
    setProblem(p);
    const [{ data: u }, { data: m }, { data: a }, { data: s }] = await Promise.all([
      supabase.from('problem_updates').select('*').eq('problem_id', p.id).order('created_at', { ascending: true }),
      supabase.from('problem_media').select('*').eq('problem_id', p.id),
      (supabase.from('problem_assignments' as any) as any).select('claimed_at,estimated_completion_at,claimed_by_cadre_id').eq('problem_id', p.id).not('claimed_by_cadre_id', 'is', null).order('claimed_at', { ascending: false }).limit(1),
      (supabase as any).from('satisfaction_surveys').select('*').eq('problem_id', p.id).order('created_at', { ascending: false }).limit(1),
    ]);
    const claimed = a?.[0] || null;
    setUpdates(u || []); setMedia(m || []); setClaim(claimed); setSurvey(s?.[0] || null);
    if (claimed?.claimed_by_cadre_id) {
      const { data: c } = await supabase.from('cadres').select('name,level,constituency,phone,show_phone').eq('id', claimed.claimed_by_cadre_id).maybeSingle();
      setAssignee(c ? { name: c.name, level: c.level, constituency: c.constituency, phone: c.show_phone ? c.phone : undefined } : null);
    } else setAssignee(null);
    setLoading(false);
  };

  // Auto-lookup when arriving with ?ticket= / ?t= (and always when ?auto=1 is present).
  useEffect(() => { if (initialTicket) lookup(initialTicket); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Fetch completed blueprint task titles for the current problem, shown as a ticked checklist.
  const [completedTasks, setCompletedTasks] = useState<Array<{ id: string; title: string; seq: number }>>([]);
  useEffect(() => {
    if (!problem?.id) { setCompletedTasks([]); setProgress(null); return; }
    (async () => {
      const { data: bp } = await supabase.from('resolution_blueprints' as any)
        .select('id').eq('problem_id', problem.id).eq('is_active', true).maybeSingle();
      if (!bp) { setCompletedTasks([]); setProgress(null); return; }
      const { data: ts } = await supabase.from('blueprint_tasks' as any)
        .select('id,seq,title,title_ta,status').eq('blueprint_id', (bp as any).id).order('seq');
      const all = (ts as any[]) || [];
      const done = all.filter(t => ['done', 'skipped'].includes(t.status));
      setProgress({ done: done.length, total: all.length });
      setCompletedTasks(done.map(t => ({
        id: t.id, seq: t.seq,
        title: (language === 'ta' && t.title_ta) || t.title,
      })));
    })();
  }, [problem?.id, language]);

  const stageIdx = problem ? STATUS_STAGES.findIndex(s => s.id === problem.status) : -1;
  const dept = problem ? DEPARTMENTS.find(d => d.id === problem.department) : null;
  const urg = problem ? URGENCY_LEVELS.find(u => u.id === problem.urgency) : null;

  return (
    <div className="min-h-screen overflow-x-hidden">
      <BackButton to="/" />
      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{tt('புகார் நிலையை கண்காணி', 'Track Your Complaint')}</h1>
          <p className="text-sm text-muted-foreground mb-6">{tt('டிக்கெட் எண் அல்லது 10-இலக்க கைபேசி எண் கொடுக்கவும்', 'Enter ticket number or 10-digit phone')}</p>

          <div className="flex gap-2 mb-8">
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="MC-XXXXXXXX or 9876543210" onKeyDown={e => e.key === 'Enter' && lookup()} />
            <Button onClick={() => lookup()} disabled={loading}><Search className="w-4 h-4 mr-1" />{tt('தேடு', 'Search')}</Button>
          </div>

          {problem && (
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                  <div>
                    <div className="font-mono text-xs text-muted-foreground">{problem.ticket_no}</div>
                    <h2 className="text-lg md:text-xl font-bold">{problem.title}</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {urg && <Badge className={urg.color}>{tt(urg.ta, urg.en)}</Badge>}
                    {dept && <Badge variant="outline">{dept.icon} {tt(dept.ta, dept.en)}</Badge>}
                    {claim?.claimed_at && <Badge className="bg-green-600 text-white">{tt('ஏற்கப்பட்டது', 'Claimed')}</Badge>}
                    {problem.support_count > 1 && <Badge className="bg-primary/10 text-primary"><Users className="w-3 h-3 mr-1" />{problem.support_count} {tt('ஆதரவு', 'supporters')}</Badge>}
                  </div>
                </div>
                <p className="text-sm text-foreground/80 mb-3">{problem.description}</p>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{[problem.area, problem.constituency, problem.city].filter(Boolean).join(', ')}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtIST(problem.created_at)}</span>
                </div>
                {claim?.estimated_completion_at && (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <Clock className="w-3 h-3" />{tt('முடிக்கும் மதிப்பிடப்பட்ட நேரம்', 'Estimated completion')}: {formatIST(claim.estimated_completion_at)}
                  </div>
                )}
              </div>

              {(assignee || progress?.total || problem.voice_note_url) && (
                <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                  {assignee && (
                    <div>
                      <h3 className="font-bold mb-2 text-sm">{tt('பொறுப்பானவர்', 'Assigned Cadre')}</h3>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-semibold"><Users className="w-3 h-3" />{assignee.name}</span>
                        {assignee.level && <Badge variant="outline" className="text-[10px]">{assignee.level}</Badge>}
                        {assignee.constituency && <span className="text-xs text-muted-foreground">· {assignee.constituency}</span>}
                        {assignee.phone && <a href={`tel:${assignee.phone}`} className="text-xs text-primary underline">{assignee.phone}</a>}
                      </div>
                    </div>
                  )}
                  {progress && progress.total > 0 && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold">{tt('தீர்வு முன்னேற்றம்', 'Resolution progress')}</span>
                        <span className="text-muted-foreground">{progress.done}/{progress.total} · {Math.round((progress.done / progress.total) * 100)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
                      </div>
                    </div>
                  )}
                  {problem.voice_note_url ? (
                    <div>
                      <h3 className="font-bold mb-2 text-sm">🎙 {tt('குரல் குறிப்பு', 'Voice note')}</h3>
                      <audio controls src={problem.voice_note_url} className="w-full" />
                      {problem.voice_transcript && <p className="mt-2 text-xs italic bg-muted/30 rounded p-2 tamil-safe">"{problem.voice_transcript}"</p>}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic">🎙 {tt('குரல் குறிப்பு இல்லை', 'No voice note attached to this ticket')}</div>
                  )}
                </div>
              )}



              {/* Status Pipeline */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="font-bold mb-4">{tt('நிலை', 'Status Pipeline')}</h3>
                <div className="space-y-3">
                  {STATUS_STAGES.map((s, i) => {
                    const done = i <= stageIdx;
                    const current = i === stageIdx;
                    return (
                      <div key={s.id} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                          {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                        </div>
                        <div className="flex-1">
                          <div className={`text-sm font-medium ${current ? 'text-primary' : done ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {tt(s.ta, s.en)}
                          </div>
                        </div>
                        {current && <Badge className={s.color}>{tt('தற்போது', 'Current')}</Badge>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {media.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h3 className="font-bold mb-3">{tt('ஆதாரம்', 'Evidence')}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {media.map(m => m.media_type === 'video'
                      ? <video key={m.id} src={m.url} controls className="w-full h-32 object-cover rounded" />
                      : <img key={m.id} src={m.url} alt="" className="w-full h-32 object-cover rounded" />)}
                  </div>
                </div>
              )}

              {completedTasks.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h3 className="font-bold mb-3">{tt('முடிந்த பணிகள்', 'Completed Tasks')} ({completedTasks.length})</h3>
                  <ul className="space-y-2">
                    {completedTasks.map(t => (
                      <li key={t.id} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                        <span><span className="text-xs font-mono text-muted-foreground">#{t.seq}</span> {t.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {updates.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h3 className="font-bold mb-3">{tt('நேர வரிசை', 'Timeline')}</h3>
                  <div className="space-y-3">
                    {updates.map(u => (
                      <div key={u.id} className="border-l-2 border-primary pl-3">
                        <div className="text-xs text-muted-foreground">{fmtIST(u.created_at)}</div>
                        <div className="text-sm font-medium">{STATUS_STAGES.find(s => s.id === u.status)?.[language === 'en' ? 'en' : 'ta'] || u.status}</div>
                        {u.note && <div className="text-sm text-foreground/80">{u.note}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Citizen confirmation / rating */}
              {['resolved','completed','citizen_confirmed'].includes(problem.status) && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-2 border-green-200 dark:border-green-900 rounded-2xl p-5">
                  {survey ? (
                    <div className="text-center">
                      <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <h3 className="font-bold mb-1">{tt('நீங்கள் ஏற்கனவே மதிப்பீடு செய்துள்ளீர்கள்', 'You already rated this resolution')}</h3>
                      <div className="flex justify-center gap-0.5 my-2">
                        {[1,2,3,4,5].map(n => (
                          <span key={n} className={n <= survey.rating ? 'text-yellow-400' : 'text-muted-foreground/40'}>★</span>
                        ))}
                      </div>
                      {survey.comment && <p className="text-xs text-muted-foreground italic">"{survey.comment}"</p>}
                    </div>
                  ) : (
                    <div className="text-center">
                      <h3 className="font-bold mb-1">{tt('உங்கள் சிக்கல் தீர்க்கப்பட்டதா?', 'Was your issue resolved?')}</h3>
                      <p className="text-xs text-muted-foreground mb-3">{tt('நட்சத்திர மதிப்பீடு மற்றும் கருத்து வழங்கி உறுதிப்படுத்தவும்.', 'Confirm by giving a star rating and feedback. Admins will see this.')}</p>
                      <Button onClick={() => setShowRate(true)} className="font-bold">
                        <CheckCircle2 className="w-4 h-4 mr-2" />{tt('உறுதிப்படுத்தி மதிப்பீடு', 'Confirm & Rate')}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      {showRate && problem && (
        <ConfirmAndRateModal
          problem={problem}
          onClose={() => setShowRate(false)}
          onDone={() => lookup(problem.ticket_no)}
        />
      )}
    </div>
  );
};

export default TrackProblem;
