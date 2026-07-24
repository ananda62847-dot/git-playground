import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Sparkles, History } from 'lucide-react';
import { fmtIST } from '@/lib/datetime';
import { toast } from 'sonner';

interface Props {
  fileUrl: string;
  entityType?: string;
  entityId?: string | null;
  contextText?: string;
  cadreId?: string | null;
}

const colorFor = (s: number) =>
  s >= 7.5 ? 'bg-emerald-600' : s >= 5 ? 'bg-amber-500' : 'bg-rose-600';

const EvidenceHistoryTimeline: React.FC<Props> = ({
  fileUrl, entityType = 'problem', entityId, contextText, cadreId,
}) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescoring, setRescoring] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from('evidence_scores')
      .select('*')
      .eq('file_url', fileUrl)
      .order('created_at', { ascending: false });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [fileUrl]);

  const rescore = async () => {
    setRescoring(true);
    try {
      const { error } = await supabase.functions.invoke('ai-score-evidence', {
        body: {
          file_url: fileUrl, entity_type: entityType, entity_id: entityId,
          context_text: contextText, uploaded_by_cadre_id: cadreId,
          force: true, run_reason: 'manual_rerun',
        },
      });
      if (error) throw error;
      toast.success('Re-scored');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Re-score failed');
    } finally { setRescoring(false); }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold uppercase text-muted-foreground inline-flex items-center gap-1">
          <History className="w-3 h-3" />Scoring history ({rows.length})
        </div>
        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={rescore} disabled={rescoring}>
          {rescoring ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          <span className="ml-1">Re-score</span>
        </Button>
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground py-2 inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-xs text-muted-foreground py-2">No scores yet.</div>
      ) : (
        <ol className="relative border-l border-border pl-3 space-y-2 max-h-72 overflow-y-auto">
          {rows.map((r, idx) => (
            <li key={r.id} className="relative">
              <span className={`absolute -left-[19px] top-1 w-3 h-3 rounded-full border-2 border-background ${colorFor(Number(r.overall_score))}`} />
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[10px] font-bold text-white px-1.5 py-0.5 rounded ${colorFor(Number(r.overall_score))}`}>
                  {Number(r.overall_score).toFixed(1)}/10
                </span>
                <span className="text-[10px] text-muted-foreground">{fmtIST(r.created_at)}</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {r.run_reason || 'initial'}{idx === 0 ? ' · latest' : ''} · {r.model || 'ai'}
              </div>
              {r.remarks && <div className="text-xs italic mt-0.5 leading-snug">{r.remarks}</div>}
              <div className="grid grid-cols-3 gap-1 mt-1 text-[10px] text-center">
                <span className="bg-muted/50 rounded px-1">R {Number(r.relevance).toFixed(1)}</span>
                <span className="bg-muted/50 rounded px-1">C {Number(r.clarity).toFixed(1)}</span>
                <span className="bg-muted/50 rounded px-1">A {Number(r.authenticity).toFixed(1)}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

export default EvidenceHistoryTimeline;
