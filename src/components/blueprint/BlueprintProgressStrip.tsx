import React, { useEffect, useState } from 'react';
import AttachmentLink from '@/components/AttachmentLink';
import { supabase } from '@/integrations/supabase/client';
import { Workflow, CheckCircle2, Clock, Paperclip, ListChecks, Sparkles, FileImage } from 'lucide-react';
import { useT } from '@/lib/i18n/cadreT';

type Kind = 'problem' | 'welfare' | 'corruption';
const fkColumnFor = (k: Kind) => k === 'problem' ? 'problem_id' : k === 'welfare' ? 'welfare_id' : 'corruption_id';

interface Props {
  kind?: Kind;
  entityId: string;
  onJumpToWorkflow?: () => void;
}

const BlueprintProgressStrip: React.FC<Props> = ({ kind = 'problem', entityId, onJumpToWorkflow }) => {
  const T = useT();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    total: number; done: number; inProgress: number; locked: number;
    evidenceCount: number; criteriaDone: number; criteriaTotal: number;
    nextTitle: string | null; latestEvidence: Array<{ url: string; label: string }>;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const fkCol = fkColumnFor(kind);
      // Aggregate progress across BOTH tracks (field + online) so the strip
      // still renders after we split blueprints per track. Prior version used
      // .maybeSingle() and silently returned null when two active blueprints
      // (one per track) existed for the same problem.
      const { data: bps } = await supabase
        .from('resolution_blueprints' as any)
        .select('id')
        .eq(fkCol, entityId)
        .eq('is_active', true);
      const bpIds = ((bps as any[]) || []).map(b => b.id);
      if (bpIds.length === 0) { if (!cancelled) { setStats(null); setLoading(false); } return; }
      const { data: tasks } = await supabase
        .from('blueprint_tasks' as any)
        .select('seq, title, status, evidence_required, success_criteria, evidence_files, criteria_checked, depends_on')
        .eq('blueprint_id', (bp as any).id)
        .order('seq');
      if (cancelled) return;
      const list = (tasks as any[]) || [];
      const done = list.filter(t => t.status === 'done' || t.status === 'skipped').length;
      const inProgress = list.filter(t => t.status === 'in_progress').length;
      const locked = list.filter(t => t.status === 'blocked').length;
      let evidenceCount = 0; let criteriaTotal = 0; let criteriaDone = 0;
      const latestEvidence: Array<{ url: string; label: string; at: string }> = [];
      list.forEach(t => {
        const files = (t.evidence_files || []) as any[];
        evidenceCount += files.length;
        files.forEach(f => latestEvidence.push({ url: f.url, label: f.label, at: f.at || '' }));
        criteriaTotal += (t.success_criteria || []).length;
        criteriaDone += (t.success_criteria || []).filter((l: string) => t.criteria_checked?.[l]?.checked).length;
      });
      const next = list.find(t => t.status === 'in_progress') || list.find(t => t.status === 'pending');
      latestEvidence.sort((a, b) => (b.at || '').localeCompare(a.at || ''));
      setStats({
        total: list.length, done, inProgress, locked,
        evidenceCount, criteriaDone, criteriaTotal,
        nextTitle: next ? `#${next.seq} ${next.title}` : null,
        latestEvidence: latestEvidence.slice(0, 4),
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [kind, entityId]);

  if (loading || !stats) return null;
  const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div className="rounded-lg border border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
          <Workflow className="w-3.5 h-3.5" /> {T.bp_workflow_title}
        </div>
        {onJumpToWorkflow && (
          <button onClick={onJumpToWorkflow} className="text-[10px] font-semibold text-primary hover:underline inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> {T.bp_open}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-green-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="text-xs font-bold tabular-nums">{pct}%</div>
      </div>

      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><ListChecks className="w-3 h-3" /> {T.bp_tasks_count(stats.done, stats.total)}</span>
        {stats.inProgress > 0 && <span className="inline-flex items-center gap-1 text-amber-700"><Clock className="w-3 h-3" /> {T.bp_active(stats.inProgress)}</span>}
        <span className="inline-flex items-center gap-1"><Paperclip className="w-3 h-3" /> {T.bp_evidence(stats.evidenceCount)}</span>
        {stats.criteriaTotal > 0 && (
          <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {T.bp_criteria(stats.criteriaDone, stats.criteriaTotal)}</span>
        )}
      </div>

      {stats.nextTitle && (
        <div className="text-[11px] truncate">
          <span className="text-muted-foreground">{T.bp_current} </span>
          <span className="font-medium">{stats.nextTitle}</span>
        </div>
      )}

      {stats.latestEvidence.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
            <FileImage className="w-3 h-3" /> {T.bp_latest_evidence}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {stats.latestEvidence.map((e, i) => {
              const isImg = /\.(png|jpe?g|webp|gif)$/i.test(e.url);
              return (
                <AttachmentLink key={i} url={e.url} title={e.label} className="block w-14 h-14 bg-muted rounded border overflow-hidden hover:border-primary">
                  {isImg ? <img src={e.url} alt={e.label} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground">FILE</div>}
                </AttachmentLink>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default BlueprintProgressStrip;
