import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Sparkles } from 'lucide-react';
import EvidenceHistoryTimeline from './EvidenceHistoryTimeline';


interface Props {
  url: string;
  entityType?: string;
  entityId?: string | null;
  contextText?: string;
  cadreId?: string | null;
  alt?: string;
  className?: string;
  imgClassName?: string;
  onOpen?: () => void;
}

type Score = {
  overall_score: number;
  relevance: number;
  clarity: number;
  authenticity: number;
  context: string;
  remarks: string;
};

const colorFor = (s: number) =>
  s >= 7.5 ? 'bg-emerald-600' : s >= 5 ? 'bg-amber-500' : 'bg-rose-600';

const EvidenceTile: React.FC<Props> = ({
  url, entityType = 'problem', entityId, contextText, cadreId, alt = '',
  className = '', imgClassName = 'w-full h-24 object-cover', onOpen,
}) => {
  const cacheKey = `evi-score:${url}`;
  const [score, setScore] = useState<Score | null>(() => {
    try { const c = sessionStorage.getItem(cacheKey); return c ? JSON.parse(c) : null; } catch { return null; }
  });
  const [loading, setLoading] = useState(!score);

  useEffect(() => {
    let cancelled = false;
    if (score) return;
    (async () => {
      if (!url) return;
      const { data } = await supabase
        .from('evidence_scores')
        .select('overall_score,relevance,clarity,authenticity,context,remarks')
        .eq('file_url', url)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setScore(data as any); setLoading(false);
        try { sessionStorage.setItem(cacheKey, JSON.stringify(data)); } catch {}
        return;
      }

      // trigger scoring
      supabase.functions.invoke('ai-score-evidence', {
        body: { file_url: url, entity_type: entityType, entity_id: entityId, context_text: contextText, uploaded_by_cadre_id: cadreId },
      }).then(({ data: res }) => {
        if (cancelled) return;
        if (res?.score) {
          setScore(res.score as any);
          try { sessionStorage.setItem(cacheKey, JSON.stringify(res.score)); } catch {}
        }
        setLoading(false);
      }).catch(() => !cancelled && setLoading(false));
    })();
    return () => { cancelled = true; };
  }, [url]);

  // realtime subscribe — picks up score from any concurrent run
  useEffect(() => {
    if (!url || score) return;
    const ch = supabase.channel(`evi-${url}`).on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'evidence_scores', filter: `file_url=eq.${url}` },
      (payload: any) => { setScore(payload.new); setLoading(false); }
    ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [url, score]);

  const badge = (
    <span className={`absolute top-1 right-1 inline-flex items-center gap-0.5 text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full shadow ${
      score ? colorFor(score.overall_score) : 'bg-slate-500/80'
    }`}>
      {loading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
      {score ? `${score.overall_score.toFixed(1)}/10` : '…'}
    </span>
  );

  return (
    <div className={`relative group ${className}`}>
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <img src={url} alt={alt} loading="lazy" className={`${imgClassName} rounded border`} />
      </button>
      {score ? (
        <Popover>
          <PopoverTrigger asChild><button type="button">{badge}</button></PopoverTrigger>
          <PopoverContent className="w-80 text-xs p-3" align="end">
            <Tabs defaultValue="latest">
              <TabsList className="grid grid-cols-2 h-7">
                <TabsTrigger value="latest" className="text-[10px] h-5">Latest</TabsTrigger>
                <TabsTrigger value="history" className="text-[10px] h-5">History</TabsTrigger>
              </TabsList>
              <TabsContent value="latest" className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">AI Evidence Score</span>
                  <span className={`text-xs font-bold text-white px-2 py-0.5 rounded ${colorFor(score.overall_score)}`}>
                    {score.overall_score.toFixed(1)} / 10
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {(['relevance', 'clarity', 'authenticity'] as const).map(k => (
                    <div key={k} className="bg-muted/50 rounded p-1.5">
                      <div className="text-[9px] uppercase text-muted-foreground">{k}</div>
                      <div className="font-bold">{score[k].toFixed(1)}</div>
                    </div>
                  ))}
                </div>
                {score.context && <div><div className="text-[9px] uppercase text-muted-foreground mb-0.5">Context</div><div>{score.context}</div></div>}
                {score.remarks && <div><div className="text-[9px] uppercase text-muted-foreground mb-0.5">Remarks</div><div className="italic">{score.remarks}</div></div>}
              </TabsContent>
              <TabsContent value="history" className="pt-2">
                <EvidenceHistoryTimeline
                  fileUrl={url} entityType={entityType} entityId={entityId}
                  contextText={contextText} cadreId={cadreId}
                />
              </TabsContent>
            </Tabs>
          </PopoverContent>
        </Popover>
      ) : badge}

    </div>
  );
};

export default EvidenceTile;
