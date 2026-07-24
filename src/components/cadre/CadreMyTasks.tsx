import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Workflow, Clock, AlertTriangle, Lock, ChevronRight } from 'lucide-react';
import { fmtIST } from '@/lib/datetime';
import { useT } from '@/lib/i18n/cadreT';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';

interface Props {
  problemIds: string[];
  welfareIds: string[];
  onOpenProblem?: (problemId: string) => void;
}

type Row = {
  id: string; seq: number; title: string; status: string; priority: string;
  due_at: string | null; problem_id: string | null; welfare_id: string | null;
  evidence_required: string[]; success_criteria: string[];
  evidence_files: any[]; criteria_checked: Record<string, any>;
  depends_on: string[];
};

const PRIORITY_COLOR: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const CadreMyTasks: React.FC<Props> = ({ problemIds, welfareIds, onOpenProblem }) => {
  const T = useT();
  const [tasks, setTasks] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const allFilters: string[] = [];
      if (problemIds.length) allFilters.push(`problem_id.in.(${problemIds.join(',')})`);
      if (welfareIds.length) allFilters.push(`welfare_id.in.(${welfareIds.join(',')})`);
      if (allFilters.length === 0) { if (!cancelled) { setTasks([]); setLoading(false); } return; }
      const { data } = await supabase
        .from('blueprint_tasks' as any)
        .select('id, seq, title, status, priority, due_at, problem_id, welfare_id, evidence_required, success_criteria, evidence_files, criteria_checked, depends_on')
        .or(allFilters.join(','))
        .in('status', ['pending', 'in_progress', 'blocked'])
        .order('due_at', { ascending: true, nullsFirst: false })
        .limit(20);
      if (!cancelled) { setTasks((data as any) || []); setLoading(false); }
      // Fetch ticket numbers for the problems referenced by these tasks
      const pids = Array.from(new Set(((data as any) || []).map((t: any) => t.problem_id).filter(Boolean))) as string[];
      if (pids.length && !cancelled) {
        const { data: probs } = await supabase.from('problems').select('id,ticket_no').in('id', pids);
        const map: Record<string, string> = {};
        (probs || []).forEach((p: any) => { map[p.id] = p.ticket_no; });
        setTickets(map);
      }
    })();
    return () => { cancelled = true; };
  }, [problemIds.join(','), welfareIds.join(',')]);

  const tt = useAutoTranslate(tasks.map(t => ({ id: t.id, text: t.title })));

  if (loading) return null;
  if (tasks.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
        <Workflow className="w-3.5 h-3.5" /> {T.tasks_next} ({tasks.length})
      </div>
      <div className="space-y-1.5">
        {tasks.slice(0, 6).map(t => {
          const overdue = t.due_at && new Date(t.due_at) < new Date();
          const evidenceMissing = (t.evidence_required || []).filter(l => !(t.evidence_files || []).some((f: any) => f.label === l)).length;
          const critMissing = (t.success_criteria || []).filter(l => !t.criteria_checked?.[l]?.checked).length;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => t.problem_id && onOpenProblem?.(t.problem_id)}
              className="w-full text-left bg-card border rounded-md p-2 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] font-mono bg-muted px-1 rounded">#{t.seq}</span>
                    {t.problem_id && tickets[t.problem_id] && (
                      <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">{tickets[t.problem_id]}</span>
                    )}
                    <span className="text-sm font-medium truncate">{tt(t.id, t.title)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1 text-[10px]">
                    <Badge variant="outline" className={`text-[9px] ${PRIORITY_COLOR[t.priority] || ''}`}>{t.priority}</Badge>
                    <Badge variant="outline" className="text-[9px]">{t.status.replace('_', ' ')}</Badge>
                    {t.welfare_id && <Badge variant="outline" className="text-[9px]">{T.badge_welfare}</Badge>}
                    {overdue && <Badge className="text-[9px] bg-red-600 text-white"><AlertTriangle className="w-2.5 h-2.5 mr-0.5" />{T.badge_overdue}</Badge>}
                    {t.due_at && !overdue && (
                      <span className="text-muted-foreground inline-flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />{fmtIST(t.due_at)}
                      </span>
                    )}
                    {(evidenceMissing > 0 || critMissing > 0) && (
                      <span className="text-amber-700 inline-flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" />
                        {evidenceMissing > 0 && `${evidenceMissing} ${T.label_evidence}`}
                        {evidenceMissing > 0 && critMissing > 0 && ' · '}
                        {critMissing > 0 && `${critMissing} ${T.label_criteria}`}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              </div>
            </button>
          );
        })}
        {tasks.length > 6 && (
          <div className="text-[10px] text-center text-muted-foreground pt-1">{T.tasks_more(tasks.length - 6)}</div>
        )}
      </div>
    </div>
  );
};

export default CadreMyTasks;
