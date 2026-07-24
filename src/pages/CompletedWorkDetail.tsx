import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import BackButton from '@/components/BackButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Calendar, Users, IndianRupee, ChevronLeft, ChevronRight, Image as ImageIcon, Share2, FileDown } from 'lucide-react';
import { DEPARTMENTS } from '@/lib/departments';

const CompletedWorkDetail: React.FC = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [work, setWork] = useState<any>(null);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    (async () => {
      let q = supabase.from('completed_works').select('*').eq('published', true).limit(1);
      q = slug?.length === 36 ? q.eq('id', slug) : q.eq('slug', slug as string);
      const { data } = await q.maybeSingle();
      setWork(data);
      if ((data as any)?.problem_id) {
        const { data: p } = await supabase.from('problems').select('completion_report_url').eq('id', (data as any).problem_id).maybeSingle();
        setReportUrl((p as any)?.completion_report_url || null);
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="min-h-screen bg-background pt-16 px-4"><div className="text-center text-sm text-muted-foreground py-10">Loading…</div></div>;
  if (!work) return (
    <div className="min-h-screen bg-background pt-16 px-4">
      <BackButton to="/completed-works" />
      <div className="text-center text-sm text-muted-foreground py-10">This work could not be found.</div>
    </div>
  );

  const allImgs = [work.cover_image_url, work.before_image_url, work.after_image_url, ...(work.gallery_urls || [])].filter(Boolean);
  const dep = DEPARTMENTS.find(d => d.id === work.department);
  const reviews: any[] = Array.isArray(work.reviews) ? work.reviews : [];

  const share = async () => {
    const url = window.location.href;
    try { if (navigator.share) await navigator.share({ title: work.title, url }); else { await navigator.clipboard.writeText(url); } } catch {}
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="pt-16">
        <BackButton to="/completed-works" />
        <article className="max-w-3xl mx-auto px-3 md:px-4 py-4 space-y-4">
          <header className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {work.highlight && <Badge className="bg-yellow-500 text-black"><Star className="w-3 h-3 mr-0.5" />Featured</Badge>}
              {dep && <Badge variant="outline">{dep.icon} {dep.en}</Badge>}
              {work.constituency && <Badge variant="outline">{work.constituency}</Badge>}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold leading-tight">{work.title}</h1>
            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              {work.completed_on && <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(work.completed_on).toLocaleDateString('en-IN')}</span>}
              {(work.area || work.city) && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{[work.area, work.city].filter(Boolean).join(', ')}</span>}
              <button onClick={share} className="ml-auto inline-flex items-center gap-1 text-primary hover:underline"><Share2 className="w-3 h-3" />Share</button>
              {reportUrl && (
                <a href={reportUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline font-semibold">
                  <FileDown className="w-3 h-3" /> Closure Report (DOCX)
                </a>
              )}
            </div>
          </header>

          {allImgs.length > 0 ? (
            <div className="relative bg-muted rounded-2xl overflow-hidden">
              <img src={allImgs[idx]} alt={work.title} className="w-full max-h-[70vh] object-contain" />
              {allImgs.length > 1 && (
                <>
                  <button onClick={() => setIdx((idx - 1 + allImgs.length) % allImgs.length)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full w-10 h-10 flex items-center justify-center"><ChevronLeft className="w-5 h-5" /></button>
                  <button onClick={() => setIdx((idx + 1) % allImgs.length)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full w-10 h-10 flex items-center justify-center"><ChevronRight className="w-5 h-5" /></button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">{idx + 1}/{allImgs.length}</div>
                </>
              )}
            </div>
          ) : (
            <div className="aspect-video bg-muted rounded-2xl flex items-center justify-center"><ImageIcon className="w-10 h-10 text-muted-foreground" /></div>
          )}

          {work.before_image_url && work.after_image_url && (
            <div className="grid grid-cols-2 gap-3">
              <figure><figcaption className="text-xs font-semibold mb-1">Before</figcaption><img src={work.before_image_url} className="w-full h-40 object-cover rounded border" /></figure>
              <figure><figcaption className="text-xs font-semibold mb-1">After</figcaption><img src={work.after_image_url} className="w-full h-40 object-cover rounded border" /></figure>
            </div>
          )}

          {work.description && <div className="prose prose-sm max-w-none whitespace-pre-wrap">{work.description}</div>}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {work.beneficiaries && <Stat icon={<Users className="w-3 h-3" />} label="Beneficiaries" value={Number(work.beneficiaries).toLocaleString()} />}
            {work.cost_amount && <Stat icon={<IndianRupee className="w-3 h-3" />} label="Investment" value={`₹${Number(work.cost_amount).toLocaleString()}`} />}
            {work.completed_on && <Stat icon={<Calendar className="w-3 h-3" />} label="Completed" value={new Date(work.completed_on).toLocaleDateString('en-IN')} />}
            {dep && <Stat icon={<>{dep.icon}</>} label="Department" value={dep.en} />}
          </div>

          {work.problem_id && (
            <div className="rounded-xl border bg-card p-3 text-sm">
              <div className="font-semibold mb-1">Origin Report</div>
              <Link to={`/track?q=${work.problem_id}`} className="text-primary hover:underline">View original citizen report →</Link>
            </div>
          )}

          {reviews.length > 0 && (
            <section>
              <h2 className="font-bold text-base mb-2">Citizen Reviews</h2>
              <div className="space-y-2">
                {reviews.map((r, i) => (
                  <div key={i} className="bg-muted/40 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <div className="font-semibold text-sm">{r.name || 'Anonymous'}</div>
                      <div className="flex">{Array.from({ length: 5 }).map((_, j) => <Star key={j} className={`w-3 h-3 ${j < (r.rating || 0) ? 'fill-yellow-500 text-yellow-500' : 'text-muted'}`} />)}</div>
                    </div>
                    {r.comment && <p className="text-xs text-muted-foreground mt-1">{r.comment}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </article>
      </main>
    </div>
  );
};

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
  <div className="bg-muted/40 rounded p-2">
    <div className="text-[10px] text-muted-foreground inline-flex items-center gap-1">{icon}{label}</div>
    <div className="font-semibold">{value}</div>
  </div>
);

export default CompletedWorkDetail;
