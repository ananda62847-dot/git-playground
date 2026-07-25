import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Loader2, RefreshCw, Plus, Trash2, Play, CheckCircle2, Clock, AlertTriangle, History, Workflow, Lock, Upload, FileText, X } from 'lucide-react';
import EvidenceProofUploader from './EvidenceProofUploader';
import { toast } from 'sonner';
import { fmtIST } from '@/lib/datetime';
import { isReportClosed, closedBadgeLabel } from '@/lib/reportStatus';
import { useT } from '@/lib/i18n/cadreT';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';

type Kind = 'problem' | 'welfare' | 'corruption';

interface Props {
  /** Backward-compatible: pass a problem object */
  problem?: any;
  /** New API */
  kind?: Kind;
  entity?: any;
  isAdmin?: boolean;
  /** Internal: which workflow track to render (used by tabbed wrapper). */
  track?: 'field' | 'online';
}

type EvidenceFile = { url: string; label: string; uploaded_by?: string | null; at: string; name?: string };
type CriterionState = Record<string, { checked: boolean; at?: string; by?: string | null }>;

type Task = {
  id: string;
  seq: number;
  title: string;
  objective: string | null;
  title_ta?: string | null;
  objective_ta?: string | null;
  owner_role: string | null;
  owner_cadre_id: string | null;
  owner_team_id: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  due_in_hours: number | null;
  due_at: string | null;
  depends_on: string[];
  evidence_required: string[];
  success_criteria: string[];
  evidence_files: EvidenceFile[];
  criteria_checked: CriterionState;
  status: 'pending' | 'in_progress' | 'blocked' | 'done' | 'skipped';
  started_at: string | null;
  completed_at: string | null;
  proof_urls: string[];
  notes: string | null;
};

type Blueprint = {
  id: string;
  version: number;
  title: string | null;
  case_summary: string | null;
  title_ta?: string | null;
  case_summary_ta?: string | null;
  responsible_department: string | null;
  estimated_days: number | null;
  created_at: string;
  model: string | null;
};

type AuditEntry = {
  id: string; action: string; actor_label: string | null;
  reason: string | null; created_at: string; task_id: string | null;
};

const PRIORITY_COLOR: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-slate-200 text-slate-700',
  in_progress: 'bg-amber-200 text-amber-900',
  blocked: 'bg-red-200 text-red-900',
  done: 'bg-green-200 text-green-900',
  skipped: 'bg-slate-100 text-slate-500 line-through',
};

const fkColumnFor = (kind: Kind) =>
  kind === 'problem' ? 'problem_id' : kind === 'welfare' ? 'welfare_id' : 'corruption_id';

const taskSatisfied = (t: Task) => {
  const reqOk = (t.evidence_required || []).every(label =>
    (t.evidence_files || []).some(f => f.label === label));
  const critOk = (t.success_criteria || []).every(label => !!t.criteria_checked?.[label]?.checked);
  return reqOk && critOk;
};

const SingleTrackPanel: React.FC<Props> = ({ problem, kind: kindProp, entity, isAdmin = false, track = 'field' }) => {
  const T = useT();
  const { language } = useLanguage();
  const isTa = language === 'ta';
  const kind: Kind = kindProp || 'problem';
  const ent = entity || problem;
  const fkCol = fkColumnFor(kind);

  const [bp, setBp] = useState<Blueprint | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const locked = isReportClosed(ent);

  const load = useCallback(async () => {
    if (!hydrated) setLoading(true);
    const { data: bpRow } = await supabase
      .from('resolution_blueprints' as any)
      .select('*')
      .eq(fkCol, ent.id)
      .eq('track', track)
      .eq('is_active', true)
      .maybeSingle();
    if (!bpRow) { setBp(null); setTasks([]); setAudit([]); setLoading(false); setHydrated(true); return; }
    setBp(prev => (prev && prev.id === (bpRow as any).id ? { ...prev, ...(bpRow as any) } : (bpRow as any)));
    const [{ data: tRows }, { data: aRows }] = await Promise.all([
      supabase.from('blueprint_tasks' as any).select('*').eq('blueprint_id', (bpRow as any).id).order('seq'),
      supabase.from('blueprint_audit_log' as any).select('*').eq('blueprint_id', (bpRow as any).id).order('created_at', { ascending: false }).limit(100),
    ]);
    const newTasks = ((tRows as any) || []) as Task[];
    setTasks(prev => {
      if (prev.length === newTasks.length && prev.every((p, i) => p.id === newTasks[i].id)) {
        return newTasks.map((n, i) => ({ ...prev[i], ...n }));
      }
      return newTasks;
    });
    setAudit((aRows as any) || []);
    setLoading(false);
    setHydrated(true);
  }, [ent.id, fkCol, hydrated, track]);

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [ent.id, fkCol, track]);

  // Auto-translate missing Tamil fields when user is in Tamil mode.
  // Also detects missing Tamil translations for evidence_required[] / success_criteria[] arrays.
  const translateAttempted = useRef<string | null>(null);
  useEffect(() => {
    if (!isTa || !bp) return;
    const needsBp = (bp.title && !bp.title_ta) || (bp.case_summary && !bp.case_summary_ta);
    const needsTasks = tasks.some(t => {
      const t0: any = t;
      if (t.title && !t.title_ta) return true;
      if (t.objective && !t.objective_ta) return true;
      const evEn: string[] = t.evidence_required || [];
      const evTa: string[] = t0.evidence_required_ta || [];
      if (evEn.some((s, i) => s && !evTa[i])) return true;
      const scEn: string[] = t.success_criteria || [];
      const scTa: string[] = t0.success_criteria_ta || [];
      if (scEn.some((s, i) => s && !scTa[i])) return true;
      return false;
    });
    if (!needsBp && !needsTasks) return;
    // Recompute a signature so we retry when arrays change (new tasks / new labels).
    const sig = `${bp.id}::${tasks.map(t => `${t.id}:${(t.evidence_required || []).length}:${(t.success_criteria || []).length}`).join('|')}`;
    if (translateAttempted.current === sig) return;
    translateAttempted.current = sig;
    supabase.functions.invoke('translate-blueprint', { body: { blueprint_id: bp.id } })
      .then(({ error }) => { if (!error) load(); })
      .catch(() => {});
  }, [isTa, bp, tasks, load]);


  const generate = async (force = false) => {
    setGenerating(true);
    try {
      const body: any = { force, track };
      body[fkCol] = ent.id;
      const { data, error } = await supabase.functions.invoke('ai-resolution-blueprint', { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(force ? 'Blueprint regenerated' : 'Blueprint generated');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally { setGenerating(false); }
  };

  const tasksById = useMemo(() => new Map(tasks.map(t => [t.id, t])), [tasks]);
  const isTaskUnlocked = (t: Task) =>
    t.depends_on.length === 0 ||
    t.depends_on.every(id => {
      const dep = tasksById.get(id);
      if (!dep) return true;
      return (dep.status === 'done' || dep.status === 'skipped') && taskSatisfied(dep);
    });
  const blockedBy = (t: Task) =>
    t.depends_on.map(id => tasksById.get(id)).filter(Boolean).filter(d => !(d!.status === 'done' || d!.status === 'skipped') || !taskSatisfied(d!)) as Task[];

  if (loading) {
    return (
      <section className="border-t pt-4">
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin text-primary" /> {T.bp_loading}
        </div>
      </section>
    );
  }

  if (!bp) {
    return (
      <section className="border-t pt-4">
        <div className="flex items-center justify-between mb-2 gap-2">
          <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Workflow className="w-3.5 h-3.5 text-primary" /> {T.bp_workflow_title}
          </div>
        </div>
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="text-sm text-muted-foreground flex-1">
            {T.bp_none_desc}
          </div>
          <Button size="sm" onClick={() => generate(false)} disabled={generating || locked}>
            {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            <span className="ml-1">{T.bp_generate}</span>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="border-t pt-4">
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Workflow className="w-3.5 h-3.5 text-primary" /> {T.bp_workflow_title}
          <span className="text-[9px] font-normal text-muted-foreground/70 ml-1 px-1.5 py-0.5 bg-primary/10 rounded">Blueprint v{bp.version} · AI</span>
        </div>
        {isAdmin && !locked && (
          <Button size="sm" variant="ghost" onClick={() => generate(true)} disabled={generating} className="h-7 text-[11px]">
            {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            <span className="ml-1">{T.bp_regenerate}</span>
          </Button>
        )}
      </div>

      {locked && (
        <div className="mb-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg p-2.5 text-xs flex items-center gap-2">
          <Lock className="w-3.5 h-3.5" /> {closedBadgeLabel(ent.status)} — {T.bp_readonly}
        </div>
      )}

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <div className="mb-3">
          <div className="text-sm font-bold">{(isTa && bp.title_ta) || bp.title}</div>
          {(bp.case_summary || bp.case_summary_ta) && (
            <p className="text-xs text-muted-foreground mt-1">{(isTa && bp.case_summary_ta) || bp.case_summary}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-2 text-[10px]">
            {bp.responsible_department && <Badge variant="outline">{bp.responsible_department}</Badge>}
            {bp.estimated_days != null && <Badge variant="outline">~ {bp.estimated_days} {T.bp_days}</Badge>}
            <Badge variant="outline">{tasks.length} {T.bp_tasks}</Badge>
            <Badge variant="outline">{tasks.filter(t => t.status === 'done').length} {T.bp_done}</Badge>
          </div>
        </div>

        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid grid-cols-2 h-8">
            <TabsTrigger value="tasks" className="text-xs">{T.bp_tab_tasks}</TabsTrigger>
            <TabsTrigger value="audit" className="text-xs"><History className="w-3 h-3 mr-1" />{T.bp_tab_audit} ({audit.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-2 mt-3">
            {tasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                displayTitle={(isTa && t.title_ta) || t.title}
                displayObjective={(isTa && t.objective_ta) || t.objective}
                unlocked={isTaskUnlocked(t)}
                blockedBy={blockedBy(t)}
                locked={locked}
                isAdmin={isAdmin}
                entityId={ent.id}
                entityContext={[ent.title, ent.description?.slice(0, 200)].filter(Boolean).join(' — ')}
                onReload={load}
                onLocalPatch={(patch) => setTasks(prev => prev.map(x => x.id === t.id ? { ...x, ...patch } : x))}
              />
            ))}
            {isAdmin && !locked && <AddTaskInline blueprintId={bp.id} fkCol={fkCol} entityId={ent.id} nextSeq={tasks.length + 1} onAdded={load} />}
            {!isAdmin && !locked && tasks.length > 0 && tasks.every(t => t.status === 'done' || t.status === 'skipped') && !['pending_admin_confirmation','resolved','completed','citizen_confirmed'].includes(ent.status) && (
              <ConfirmSuccessButton kind={kind} entityId={ent.id} onDone={load} />
            )}
            {ent.status === 'pending_admin_confirmation' && (
              <div className="mt-2 rounded-lg border-2 border-amber-400 bg-amber-50 p-3 text-xs text-amber-900 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Awaiting admin confirmation — the cadre has marked this issue as resolved.</span>
              </div>
            )}
          </TabsContent>

          <TabsContent value="audit" className="space-y-1.5 mt-3 max-h-72 overflow-y-auto">
            {audit.length === 0 && <div className="text-xs text-muted-foreground italic">{T.bp_no_audit}</div>}
            {audit.map(a => (
              <div key={a.id} className="text-[11px] border-l-2 border-primary/30 pl-2 py-1">
                <div className="font-medium">{a.action.replace(/_/g, ' ')}{a.task_id ? ' · task' : ''}</div>
                <div className="text-muted-foreground">{a.actor_label || 'System'} · {fmtIST(a.created_at)}</div>
                {a.reason && <div className="text-muted-foreground italic">"{a.reason}"</div>}
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};

const TaskCard: React.FC<{
  task: Task; displayTitle?: string; displayObjective?: string | null;
  unlocked: boolean; blockedBy: Task[]; locked: boolean;
  isAdmin: boolean; entityId: string; entityContext?: string; onReload: () => void;
  onLocalPatch?: (patch: Partial<Task>) => void;
}> = ({ task, displayTitle, displayObjective, unlocked, blockedBy, locked, isAdmin, entityId, entityContext, onReload, onLocalPatch }) => {
  const T = useT();
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fileLabelRef = useRef<string>('');
  const statusLabel = ({ pending: T.bp_status_pending, in_progress: T.bp_status_in_progress, blocked: T.bp_status_blocked, done: T.bp_status_done, skipped: T.bp_status_skipped } as any)[task.status] || task.status;
  const statusColor = STATUS_COLOR[task.status];
  const priorityLabel = ({ low: T.bp_priority_low, medium: T.bp_priority_medium, high: T.bp_priority_high, critical: T.bp_priority_critical } as any)[task.priority] || task.priority;
  const overdue = task.due_at && new Date(task.due_at) < new Date() && task.status !== 'done' && task.status !== 'skipped';
  // Auto-translate the free-form label strings for evidence requirements and success criteria
  // so cadres in Tamil mode see everything in Tamil. Uses DB-stored `_ta` arrays first (populated
  // by translate-blueprint), and falls back to a live translate-text call for any missing slots.
  const { language } = useLanguage();
  const isTa = language === 'ta';
  const evTaArr: string[] = ((task as any).evidence_required_ta as string[]) || [];
  const scTaArr: string[] = ((task as any).success_criteria_ta as string[]) || [];
  const labelItems = React.useMemo(() => {
    const items: { id: string; text: string }[] = [];
    (task.evidence_required || []).forEach((l, i) => { if (!evTaArr[i]) items.push({ id: `ev:${task.id}:${i}`, text: l }); });
    (task.success_criteria || []).forEach((l, i) => { if (!scTaArr[i]) items.push({ id: `sc:${task.id}:${i}`, text: l }); });
    return items;
  }, [task.id, task.evidence_required, task.success_criteria, evTaArr.join('|'), scTaArr.join('|')]);
  const tLabel = useAutoTranslate(labelItems);
  const trEv = (l: string, i: number) => (isTa && evTaArr[i]) || tLabel(`ev:${task.id}:${i}`, l);
  const trSc = (l: string, i: number) => (isTa && scTaArr[i]) || tLabel(`sc:${task.id}:${i}`, l);

  const satisfied = taskSatisfied(task);

  const setStatus = async (status: Task['status']) => {
    setBusy(true);
    try {
      const patch: any = { status };
      if (status === 'in_progress' && !task.started_at) patch.started_at = new Date().toISOString();
      if (status === 'done') patch.completed_at = new Date().toISOString();
      const { error } = await supabase.from('blueprint_tasks' as any).update(patch).eq('id', task.id);
      if (error) throw error;
      // When ANY task moves to in_progress, flip parent report to work_started (once).
      if (status === 'in_progress') {
        try {
          const t: any = task as any;
          if (t.problem_id) {
            await supabase.from('problems').update({ status: 'work_started' }).eq('id', t.problem_id).in('status', ['submitted', 'under_review', 'verified', 'assigned', 'acknowledged']);
          } else if (t.welfare_id) {
            await supabase.from('welfare_issues').update({ status: 'work_started' }).eq('id', t.welfare_id).in('status', ['submitted', 'under_review', 'verified', 'assigned', 'acknowledged']);
          } else if (t.corruption_id) {
            await supabase.from('corruption_reports').update({ status: 'under_review' }).eq('id', t.corruption_id).eq('status', 'submitted');
          }
        } catch { /* non-blocking */ }
      }
      toast.success(`Task ${status.replace(/_/g, ' ')}`);
      onReload();
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!confirm(T.bp_remove_confirm)) return;
    setBusy(true);
    try {
      const { error } = await supabase.from('blueprint_tasks' as any).delete().eq('id', task.id);
      if (error) throw error;
      toast.success('Task removed');
      onReload();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  const openUpload = (label: string) => {
    fileLabelRef.current = label;
    fileRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const label = fileLabelRef.current;
    e.target.value = '';
    setUploading(label);
    try {
      const path = `blueprint-evidence/${entityId}/${task.id}/${Date.now()}-${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error: upErr } = await supabase.storage.from('problem-media').upload(path, f, { contentType: f.type, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('problem-media').getPublicUrl(path);
      const { data: { user } } = await supabase.auth.getUser();
      const next: EvidenceFile[] = [...(task.evidence_files || []), { url: pub.publicUrl, label, name: f.name, at: new Date().toISOString(), uploaded_by: user?.id || null }];
      const { error } = await supabase.from('blueprint_tasks' as any).update({ evidence_files: next }).eq('id', task.id);
      if (error) throw error;
      toast.success('Evidence uploaded');
      onReload();
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
    } finally { setUploading(null); }
  };

  const removeEvidence = async (idx: number) => {
    const next = (task.evidence_files || []).filter((_, i) => i !== idx);
    const { error } = await supabase.from('blueprint_tasks' as any).update({ evidence_files: next }).eq('id', task.id);
    if (error) toast.error(error.message); else { toast.success('Removed'); onReload(); }
  };

  const toggleCriterion = async (label: string, checked: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    const next: CriterionState = { ...(task.criteria_checked || {}) };
    if (checked) next[label] = { checked: true, at: new Date().toISOString(), by: user?.id || null };
    else delete next[label];
    onLocalPatch?.({ criteria_checked: next });
    const { error } = await supabase.from('blueprint_tasks' as any).update({ criteria_checked: next }).eq('id', task.id);
    if (error) { toast.error(error.message); onReload(); }
  };

  const canEdit = !locked && unlocked && task.status !== 'done' && task.status !== 'skipped';
  // Evidence and success criteria can only be modified once the task has been started.
  const canProof = canEdit && task.status === 'in_progress';
  const anyContact = (task as any).contact_point || (task as any).contact_point_ta;

  return (
    <div className={`rounded-lg border bg-card p-3 ${task.status === 'done' ? 'opacity-80' : ''} ${!unlocked ? 'opacity-60' : ''}`}>
      <input ref={fileRef} type="file" hidden onChange={handleFile} accept="image/*,application/pdf,video/*" />
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">#{task.seq}</span>
            <span className="font-semibold text-sm">{displayTitle || task.title}</span>
            <Badge className={`text-[9px] ${PRIORITY_COLOR[task.priority]}`} variant="outline">{priorityLabel}</Badge>
            <Badge className={`text-[9px] ${statusColor}`} variant="outline">{statusLabel}</Badge>
            {overdue && <Badge className="text-[9px] bg-red-600 text-white"><AlertTriangle className="w-2.5 h-2.5 mr-0.5" />{T.bp_overdue}</Badge>}
            {!unlocked && task.status === 'pending' && (
              <Badge variant="outline" className="text-[9px]" title={`Waiting on: ${blockedBy.map(b => `#${b.seq}`).join(', ')}`}>
                <Lock className="w-2.5 h-2.5 mr-0.5" />{T.bp_locked}
              </Badge>
            )}
          </div>
          {(displayObjective ?? task.objective) && (
            <p className="text-xs text-muted-foreground mt-1">{displayObjective ?? task.objective}</p>
          )}
          {anyContact && (
            <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5">
              <span className="font-semibold">{T.bp_contact}:</span>
              <span className="font-medium">{(task as any).contact_point_ta || (task as any).contact_point}</span>
            </div>
          )}
          <div className="text-[10px] text-muted-foreground mt-1.5 flex flex-wrap gap-x-3">
            {task.owner_role && <span>👤 {task.owner_role}</span>}
            {task.due_at && <span><Clock className="w-2.5 h-2.5 inline" /> {T.bp_due} {fmtIST(task.due_at)}</span>}
          </div>
          {!unlocked && blockedBy.length > 0 && (
            <div className="text-[10px] text-amber-700 mt-1 inline-flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" /> {T.bp_waiting_on(blockedBy.map(b => `#${b.seq}`).join(', '))}
            </div>
          )}

          {/* Evidence checklist */}
          {task.evidence_required?.length > 0 && (
            <div className="mt-2.5 border-t pt-2">
              <div className="text-[10px] font-semibold text-muted-foreground mb-1.5">{T.bp_evidence_required_title}</div>
              {!canProof && !locked && (
                <div className="text-[10px] text-amber-700 mb-1.5 inline-flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> {T.press_start_first}
                </div>
              )}
              <div className="space-y-3">
                {task.evidence_required.map((label, i) => {
                  const filesForLabel = (task.evidence_files || []).filter(f => f.label === label);
                  return (
                    <div key={label} className="text-[11px]">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-3 h-3 rounded-full ${filesForLabel.length ? 'bg-green-500' : 'bg-muted border'}`} />
                        <div className="font-medium">{trEv(label, i)}</div>

                      </div>
                      <EvidenceProofUploader
                        label={label}
                        entityId={entityId}
                        taskId={task.id}
                        contextText={`${entityContext || ''} · ${task.title}`}
                        files={filesForLabel}
                        canEdit={canProof}
                        onChange={async (nextForLabel) => {
                          const others = (task.evidence_files || []).filter(f => f.label !== label);
                          const merged = [...others, ...nextForLabel];
                          // Optimistic local update to avoid the whole blueprint flickering
                          onLocalPatch?.({ evidence_files: merged });
                          const { error } = await supabase.from('blueprint_tasks' as any)
                            .update({ evidence_files: merged }).eq('id', task.id);
                          if (error) { toast.error(error.message); throw error; }
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}


          {/* Success criteria */}
          {task.success_criteria?.length > 0 && (
            <div className="mt-2.5 border-t pt-2">
              <div className="text-[10px] font-semibold text-muted-foreground mb-1">{T.bp_success_criteria}</div>
              {!canProof && !locked && (
                <div className="text-[10px] text-amber-700 mb-1 inline-flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> {T.press_start_first}
                </div>
              )}
              <ul className="space-y-1">
                {task.success_criteria.map((label, i) => {
                  const checked = !!task.criteria_checked?.[label]?.checked;
                  return (
                    <li key={label} className="flex items-start gap-2 text-[11px]">
                      <Checkbox
                        checked={checked}
                        disabled={!canProof}
                        onCheckedChange={(c) => toggleCriterion(label, !!c)}
                        className="mt-0.5"
                      />
                      <span className={checked ? 'line-through text-muted-foreground' : ''}>{trSc(label, i)}</span>

                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {isAdmin && !locked && (
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive shrink-0" onClick={remove} disabled={busy} title="Remove task">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {canEdit && (
        <div className="flex gap-2 mt-3 pt-2 border-t flex-wrap">
          {task.status === 'pending' && (
            <Button size="sm" className="h-7 text-[11px]" onClick={() => setStatus('in_progress')} disabled={busy}>
              <Play className="w-3 h-3 mr-1" /> {T.bp_start}
            </Button>
          )}
          {task.status === 'in_progress' && (
            <Button size="sm" className="h-7 text-[11px]" onClick={() => setStatus('done')} disabled={busy || !satisfied}
              title={!satisfied ? T.bp_evidence_incomplete : ''}>
              <CheckCircle2 className="w-3 h-3 mr-1" /> {T.bp_mark_done}
            </Button>
          )}
          {task.status !== 'blocked' && task.status !== 'pending' && (
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setStatus('blocked')} disabled={busy}>
              {T.bp_block}
            </Button>
          )}
          {!satisfied && task.status === 'in_progress' && (
            <span className="text-[10px] text-amber-700 self-center">{T.bp_evidence_incomplete}</span>
          )}
        </div>
      )}
    </div>
  );
};

const AddTaskInline: React.FC<{ blueprintId: string; fkCol: string; entityId: string; nextSeq: number; onAdded: () => void }> = ({ blueprintId, fkCol, entityId, nextSeq, onAdded }) => {
  const T = useT();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [owner, setOwner] = useState('');
  const [hours, setHours] = useState(24);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim() || !reason.trim()) { toast.error('Title and reason required'); return; }
    setBusy(true);
    try {
      const row: any = {
        blueprint_id: blueprintId,
        seq: nextSeq,
        title: title.trim(),
        owner_role: owner.trim() || null,
        due_in_hours: hours,
        due_at: new Date(Date.now() + hours * 3600_000).toISOString(),
        notes: reason.trim(),
      };
      row[fkCol] = entityId;
      const { error } = await supabase.from('blueprint_tasks' as any).insert(row);
      if (error) throw error;
      toast.success('Task added');
      setOpen(false); setTitle(''); setOwner(''); setReason(''); setHours(24);
      onAdded();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  if (!open) return (
    <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => setOpen(true)}>
      <Plus className="w-3 h-3 mr-1" /> {T.bp_add_task}
    </Button>
  );

  return (
    <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
      <Input placeholder={T.bp_task_title} value={title} onChange={e => setTitle(e.target.value)} className="h-8 text-xs" />
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder={T.bp_owner_role} value={owner} onChange={e => setOwner(e.target.value)} className="h-8 text-xs" />
        <Input type="number" placeholder={T.bp_due_hours} value={hours} onChange={e => setHours(Number(e.target.value) || 24)} className="h-8 text-xs" />
      </div>
      <Textarea placeholder={T.bp_reason_ph} value={reason} onChange={e => setReason(e.target.value)} className="text-xs min-h-[60px]" />
      <div className="flex gap-2">
        <Button size="sm" className="h-7 text-xs" onClick={submit} disabled={busy}>{busy ? <Loader2 className="w-3 h-3 animate-spin" /> : T.bp_add}</Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setOpen(false)}>{T.bp_cancel}</Button>
      </div>
    </div>
  );
};

const ConfirmSuccessButton: React.FC<{ kind: Kind; entityId: string; onDone: () => void }> = ({ kind, entityId, onDone }) => {
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!confirm('Mark this issue as resolved and send it for admin confirmation?')) return;
    setBusy(true);
    try {
      const table = kind === 'problem' ? 'problems' : kind === 'welfare' ? 'welfare_issues' : 'corruption_reports';
      const { error } = await supabase.from(table as any).update({ status: 'pending_admin_confirmation' }).eq('id', entityId);
      if (error) throw error;
      if (kind === 'problem') {
        await supabase.from('problem_updates').insert({ problem_id: entityId, status: 'pending_admin_confirmation', note: 'Cadre confirmed resolution; awaiting admin confirmation.' } as any);
      } else if (kind === 'welfare') {
        await supabase.from('welfare_updates').insert({ welfare_issue_id: entityId, status: 'pending_admin_confirmation', note: 'Cadre confirmed resolution; awaiting admin confirmation.' } as any);
      }
      toast.success('Sent for admin confirmation');
      onDone();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
    finally { setBusy(false); }
  };
  return (
    <Button onClick={submit} disabled={busy} className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 mt-2">
      <CheckCircle2 className="w-4 h-4 mr-2" />
      {busy ? 'Submitting…' : 'Confirm Success — send to admin'}
    </Button>
  );
};

export default ResolutionBlueprintPanel;
