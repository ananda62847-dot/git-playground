import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  X, MapPin, Phone, User as UserIcon, Clock, Image as ImageIcon, Upload, Loader2,
  AlertTriangle, CheckCircle2, Circle, Camera, Video, FileText, Mic, ShieldAlert,
  Activity, Layers, History, Send, ArrowUpCircle, Workflow,
} from 'lucide-react';
import { STATUS_STAGES, DEPARTMENTS } from '@/lib/departments';
import { toast } from 'sonner';
import MediaPreviewModal from '@/components/MediaPreviewModal';
import ResolutionBlueprintPanel from '@/components/blueprint/ResolutionBlueprintPanel';
import BlueprintProgressStrip from '@/components/blueprint/BlueprintProgressStrip';
import { fmtIST } from '@/lib/datetime';

const fmt = (v?: string | null) => v ? new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata',
}).format(new Date(v)) : '';

const ACTION_TYPES = [
  { id: 'field_visit', label: 'Field Visit Done', icon: '👣' },
  { id: 'contractor', label: 'Contractor Assigned', icon: '🛠' },
  { id: 'work_started', label: 'Work Started', icon: '⚙️' },
  { id: 'waiting_dept', label: 'Waiting for Department', icon: '⏳' },
  { id: 'resolved', label: 'Resolved', icon: '✅' },
  { id: 'rejected', label: 'Rejected', icon: '🚫' },
  { id: 'need_info', label: 'Need More Info', icon: '❓' },
];

const EVIDENCE_KINDS = [
  { id: 'site', label: 'Site Visit Photo', icon: Camera },
  { id: 'progress', label: 'Work in Progress', icon: Camera },
  { id: 'final', label: 'Final Resolution Photo', icon: CheckCircle2 },
  { id: 'video', label: 'Video Proof', icon: Video },
  { id: 'doc', label: 'Official Document', icon: FileText },
  { id: 'voice', label: 'Voice Note', icon: Mic },
];

const ESCALATION_REASONS = [
  'No response from department',
  'High public urgency',
  'Accident risk',
  'Political sensitivity',
  'Citizen repeated complaint',
  'Deadline exceeded',
  'Other',
];

const ESCALATION_TARGETS = [
  { id: 'ward_secretary', label: 'Ward Secretary' },
  { id: 'constituency_admin', label: 'Constituency Admin' },
  { id: 'district_officer', label: 'District Officer' },
  { id: 'department_officer', label: 'Department Officer' },
  { id: 'mla_office', label: 'MLA Office' },
];

interface Props {
  problem: any;
  assignment: any;
  cadreId: string;
  viewOnly?: boolean;
  onClose: () => void;
}

const CadreWorkspace: React.FC<Props> = ({ problem: initialProblem, assignment, cadreId, viewOnly: viewOnlyProp, onClose }) => {
  const [problem, setProblem] = useState<any>(initialProblem);
  // Force view-only when: admin toggled hold, admin recalled the assignment, or an escalation is active.
  const viewOnly = viewOnlyProp || !!assignment?.escalated_at || !!assignment?.recalled_at || !!problem?.on_hold;
  const [tab, setTab] = useState('plan');
  const [media, setMedia] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [escalations, setEscalations] = useState<any[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Progress update form
  const [stage, setStage] = useState<string>(problem.status);
  const [actionType, setActionType] = useState<string>('field_visit');
  const [updateTitle, setUpdateTitle] = useState('');
  const [observation, setObservation] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  // Evidence
  const [evidenceKind, setEvidenceKind] = useState<string>('site');
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);

  // Escalation
  const [escReason, setEscReason] = useState(ESCALATION_REASONS[0]);
  const [escNote, setEscNote] = useState('');
  const [escTarget, setEscTarget] = useState(ESCALATION_TARGETS[0].id);

  // ETA editor
  const [etaEditing, setEtaEditing] = useState(false);
  const [etaValue, setEtaValue] = useState<string>(
    assignment.estimated_completion_at
      ? new Date(assignment.estimated_completion_at).toISOString().slice(0, 16)
      : new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16)
  );

  const dep = DEPARTMENTS.find(d => d.id === problem.department);
  const currentStageIdx = STATUS_STAGES.findIndex(s => s.id === problem.status);

  const reloadAll = async () => {
    const [{ data: m }, { data: u }, { data: e }, { data: p }] = await Promise.all([
      supabase.from('problem_media').select('*').eq('problem_id', problem.id).order('created_at', { ascending: false }),
      supabase.from('problem_updates').select('*').eq('problem_id', problem.id).order('created_at', { ascending: false }),
      supabase.from('escalations').select('*').eq('problem_id', problem.id).order('created_at', { ascending: false }),
      supabase.from('problems').select('*').eq('id', problem.id).maybeSingle(),
    ]);
    setMedia(m || []); setUpdates(u || []); setEscalations(e || []);
    if (p) { setProblem(p); setStage(p.status); }
  };

  useEffect(() => { reloadAll(); }, [problem.id]);

  // SLA estimation
  const slaInfo = useMemo(() => {
    const created = new Date(problem.created_at).getTime();
    const ageH = (Date.now() - created) / 3600000;
    const target = problem.urgency === 'emergency' ? 12 : problem.urgency === 'high' ? 48 : 168;
    const remainingH = target - ageH;
    return { ageH, target, remainingH, breached: remainingH < 0 };
  }, [problem]);

  const upload = async (file: File, label: string) => {
    const path = `proof/${problem.id}/${label}-${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '_')}`;
    const { error } = await supabase.storage.from('problem-media').upload(path, file);
    if (error) throw error;
    return supabase.storage.from('problem-media').getPublicUrl(path).data.publicUrl;
  };

  const saveUpdate = async () => {
    if (viewOnly) return;
    setBusy(true);
    try {
      const checkLines = Object.entries(checks).filter(([, v]) => v).map(([k]) => `✔ ${k}`).join('\n');
      const parts = [
        updateTitle && `**${updateTitle}**`,
        observation && `Observation: ${observation}`,
        actionTaken && `Action: ${actionTaken}`,
        assignedTo && `Handled by: ${assignedTo}`,
        expectedDate && `Expected: ${fmtIST(expectedDate)}`,
        checkLines,
      ].filter(Boolean);
      const note = parts.join('\n');
      const { error } = await supabase.from('problem_updates').insert({
        problem_id: problem.id, status: stage, note: note || `Action: ${actionType}`,
      });
      if (error) throw error;
      if (stage !== problem.status) {
        const upd: any = { status: stage };
        if (stage === 'completed') upd.resolved_at = new Date().toISOString();
        await supabase.from('problems').update(upd).eq('id', problem.id);
        const { notifyStatusChange } = await import('@/lib/notify');
        notifyStatusChange(problem.id, stage);
      }
      toast.success('Update submitted');
      setUpdateTitle(''); setObservation(''); setActionTaken(''); setAssignedTo(''); setChecks({});
      reloadAll();
    } catch (err: any) { toast.error(err.message || 'Failed'); }
    finally { setBusy(false); }
  };

  const uploadEvidence = async () => {
    if (viewOnly || evidenceFiles.length === 0) return;
    setBusy(true);
    try {
      for (const f of evidenceFiles) {
        const url = await upload(f, evidenceKind);
        await supabase.from('problem_updates').insert({
          problem_id: problem.id, status: problem.status, note: `[${evidenceKind}] ${f.name}`,
          after_url: url,
        });
      }
      toast.success(`${evidenceFiles.length} evidence file(s) uploaded`);
      setEvidenceFiles([]);
      reloadAll();
    } catch (err: any) { toast.error(err.message || 'Upload failed'); }
    finally { setBusy(false); }
  };

  const submitEscalation = async () => {
    if (viewOnly) return;
    const reason = [escReason, escNote].filter(Boolean).join(' — ');
    if (reason.length < 5) return toast.error('Reason too short');
    setBusy(true);
    const { data: esc, error } = await supabase.from('escalations').insert({
      problem_id: problem.id, reason, to_level: escTarget, raised_by_cadre_id: cadreId,
    }).select('id').maybeSingle();
    if (error) { setBusy(false); return toast.error(error.message); }
    // Fan-out push + in-app notification to constituency admins.
    await supabase.functions.invoke('notify-escalation', {
      body: {
        problem_id: problem.id,
        escalation_id: esc?.id,
        reason,
        source: 'cadre',
        severity: problem.urgency === 'emergency' || problem.urgency === 'critical' ? 'critical' : 'high',
      },
    }).catch(() => {});
    setBusy(false);
    toast.success('Escalation raised — admins notified'); setEscNote('');
    reloadAll();
  };

  const saveEta = async () => {
    setBusy(true);
    const iso = new Date(etaValue).toISOString();
    const { error } = await supabase.from('problem_assignments')
      .update({ estimated_completion_at: iso }).eq('id', assignment.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    assignment.estimated_completion_at = iso;
    setEtaEditing(false);
    toast.success('ETA updated');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-stretch md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-none md:rounded-2xl w-full max-w-6xl h-full md:h-[92vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* HEADER */}
        <div className="border-b border-border bg-gradient-to-r from-card to-muted/40 px-4 py-3 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">{problem.ticket_no}</span>
              <Badge variant="outline" className="text-[10px]">{dep?.icon} {dep?.en}</Badge>
              {problem.urgency === 'emergency' && <Badge className="bg-red-600 text-white text-[10px]">EMERGENCY</Badge>}
              {problem.urgency === 'high' && <Badge className="bg-orange-500 text-white text-[10px]">HIGH</Badge>}
              {slaInfo.breached
                ? <Badge className="bg-red-100 text-red-700 text-[10px]"><AlertTriangle className="w-3 h-3 mr-0.5" />SLA breached</Badge>
                : <Badge variant="outline" className="text-[10px]"><Clock className="w-3 h-3 mr-0.5" />{Math.round(slaInfo.remainingH)}h left</Badge>}
            </div>
            <h2 className="font-bold text-base md:text-lg leading-tight break-words">{problem.title}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>

        {problem?.on_hold && (
          <div className="bg-amber-500/20 border-b border-amber-500/50 px-4 py-2 text-amber-900 dark:text-amber-100 text-xs font-medium flex items-center gap-2 shrink-0">
            <ShieldAlert className="w-4 h-4" />
            ⏸ This report has been paused by a super admin — read-only. {problem.hold_reason ? `Reason: ${problem.hold_reason}` : 'Wait for it to be resumed before taking any action.'}
          </div>
        )}
        {assignment?.recalled_at && (
          <div className="bg-orange-500/20 border-b border-orange-500/50 px-4 py-2 text-orange-900 dark:text-orange-100 text-xs font-medium flex items-center gap-2 shrink-0">
            <ShieldAlert className="w-4 h-4" />
            🔁 This assignment was <b>reverted by super admin</b> — you no longer own it and cannot make changes. {assignment.recalled_reason ? `Reason: ${assignment.recalled_reason}` : ''}
          </div>
        )}
        {assignment?.escalated_at && !assignment?.recalled_at && (
          <div className="bg-amber-500/15 border-b border-amber-500/40 px-4 py-2 text-amber-900 dark:text-amber-200 text-xs font-medium flex items-center gap-2 shrink-0">
            <ShieldAlert className="w-4 h-4" />
            🔒 This report has been escalated — your access is view-only. The constituency admin is now handling it.
          </div>
        )}

        {/* BLUEPRINT PROGRESS STRIP — unified overview of plan + checklist + evidence */}
        <div className="border-b border-border px-4 py-2 bg-background shrink-0">
          <BlueprintProgressStrip
            kind="problem"
            entityId={problem.id}
            onJumpToWorkflow={() => setTab('plan')}
          />
        </div>

        {/* PROGRESS STEPPER */}
        <div className="border-b border-border bg-muted/20 px-4 py-3 overflow-x-auto shrink-0">
          <div className="flex items-center gap-1 min-w-max">
            {STATUS_STAGES.map((s, i) => {
              const active = i === currentStageIdx;
              const done = i < currentStageIdx;
              return (
                <React.Fragment key={s.id}>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                    active ? 'bg-primary text-primary-foreground shadow' :
                    done ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
                  }`}>
                    {done ? <CheckCircle2 className="w-3 h-3" /> : active ? <Activity className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                    <span>{s.en}</span>
                  </div>
                  {i < STATUS_STAGES.length - 1 && <div className={`w-4 h-px ${done ? 'bg-green-400' : 'bg-border'}`} />}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* BODY: 3-col on desktop */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
          {/* LEFT: context */}
          <aside className="md:w-72 md:border-r border-border md:overflow-y-auto p-4 space-y-4 bg-muted/10 shrink-0">
            <section>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">Description</div>
              <p className="text-xs whitespace-pre-wrap leading-relaxed">{problem.description}</p>
            </section>
            <section className="space-y-1.5 text-xs">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Citizen</div>
              <div className="inline-flex items-center gap-1"><UserIcon className="w-3 h-3" />{problem.reporter_name}{problem.reporter_age ? ` · ${problem.reporter_age}y` : ''}</div>
              <div><a href={`tel:${problem.reporter_phone}`} className="inline-flex items-center gap-1 text-primary"><Phone className="w-3 h-3" />{problem.reporter_phone}</a></div>
              <div className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="w-3 h-3" />{fmt(problem.created_at)}</div>
            </section>
            <section className="space-y-1.5 text-xs">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Location</div>
              <div className="inline-flex items-start gap-1"><MapPin className="w-3 h-3 mt-0.5 shrink-0" /><span>{[problem.address_line, problem.area, problem.constituency, problem.city, problem.pincode].filter(Boolean).join(' · ')}</span></div>
              {problem.latitude && (
                <a href={`https://maps.google.com/?q=${problem.latitude},${problem.longitude}`} target="_blank" rel="noreferrer" className="text-[10px] text-primary underline">Open in Maps</a>
              )}
            </section>
            {assignment && (
              <section className="text-xs space-y-1.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Assignment</div>
                {assignment.claimed_at && <div>Claimed: <span className="font-medium">{fmt(assignment.claimed_at)}</span></div>}
                <div>
                  ETA: {assignment.estimated_completion_at
                    ? <span className="font-medium">{fmt(assignment.estimated_completion_at)}</span>
                    : <span className="text-amber-700">Not set</span>}
                  {!viewOnly && !etaEditing && (
                    <button className="ml-2 text-[10px] text-primary underline" onClick={() => setEtaEditing(true)}>edit</button>
                  )}
                </div>
                {etaEditing && (
                  <div className="flex gap-1 items-center">
                    <Input type="datetime-local" value={etaValue} min={new Date().toISOString().slice(0, 16)}
                      onChange={e => setEtaValue(e.target.value)} className="h-7 text-[11px]" />
                    <Button size="sm" className="h-7 text-[10px]" onClick={saveEta} disabled={busy}>Save</Button>
                  </div>
                )}
              </section>
            )}
          </aside>

          {/* CENTER: tabs */}
          <div className="flex-1 overflow-y-auto min-w-0">
            <Tabs value={tab} onValueChange={setTab} className="h-full flex flex-col">
              <TabsList className="grid grid-cols-5 mx-4 mt-3 shrink-0">
                <TabsTrigger value="plan" className="text-xs"><Workflow className="w-3 h-3 mr-1" />Plan & Checklist</TabsTrigger>
                <TabsTrigger value="progress" className="text-xs"><Activity className="w-3 h-3 mr-1" />Update</TabsTrigger>
                <TabsTrigger value="evidence" className="text-xs"><ImageIcon className="w-3 h-3 mr-1" />Evidence</TabsTrigger>
                <TabsTrigger value="escalation" className="text-xs"><ShieldAlert className="w-3 h-3 mr-1" />Escalate</TabsTrigger>
                <TabsTrigger value="timeline" className="text-xs"><History className="w-3 h-3 mr-1" />Timeline</TabsTrigger>
              </TabsList>

              {/* PLAN & CHECKLIST — unified blueprint with tasks + evidence + criteria gating */}
              <TabsContent value="plan" className="p-4 space-y-4">
                <ResolutionBlueprintPanel
                  kind="problem"
                  entity={problem}
                  isAdmin={false}
                />
                {media.length > 0 && (
                  <section>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">
                      Citizen Evidence ({media.length})
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {media.map(m => (
                        <button key={m.id} type="button" onClick={() => setPreviewUrl(m.url)}
                          className="aspect-square rounded-lg border overflow-hidden hover:border-primary transition">
                          {m.media_type === 'video'
                            ? <video src={m.url} className="w-full h-full object-cover" preload="metadata" />
                            : <img src={m.url} alt="" className="w-full h-full object-cover" loading="lazy" />}
                        </button>
                      ))}
                    </div>
                  </section>
                )}
                {(problem.voice_note_url || problem.voice_transcript) && (
                  <section>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">🎙 Voice Note</div>
                    {problem.voice_note_url && <audio controls src={problem.voice_note_url} className="w-full mb-2" />}
                    {problem.voice_transcript && <p className="text-xs italic bg-muted/40 rounded p-2">"{problem.voice_transcript}"</p>}
                  </section>
                )}
              </TabsContent>


              {/* PROGRESS */}
              <TabsContent value="progress" className="p-4 space-y-4">
                {viewOnly && (
                  <div className="text-xs bg-muted/50 rounded p-3">View-only — only the claimer can update.</div>
                )}
                {!viewOnly && (
                  <>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Move to Stage</Label>
                        <Select value={stage} onValueChange={setStage}>
                          <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>{STATUS_STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.en}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Action Type</Label>
                        <Select value={actionType} onValueChange={setActionType}>
                          <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>{ACTION_TYPES.map(a => <SelectItem key={a.id} value={a.id}>{a.icon} {a.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Update Title</Label>
                      <Input value={updateTitle} onChange={e => setUpdateTitle(e.target.value)} placeholder="e.g. Pothole measured & contractor informed" className="mt-1" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Field Observation</Label>
                        <Textarea rows={3} value={observation} onChange={e => setObservation(e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Action Taken</Label>
                        <Textarea rows={3} value={actionTaken} onChange={e => setActionTaken(e.target.value)} className="mt-1" />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Expected Resolution</Label>
                        <Input type="datetime-local" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Handled by (officer / contractor)</Label>
                        <Input value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className="mt-1" />
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/20 p-3">
                      <div className="text-xs font-semibold mb-2">Verification Checklist</div>
                      <div className="space-y-1.5">
                        {['Visited site', 'Citizen contacted', 'Department informed', 'Work completed', 'Citizen confirmation received'].map(c => (
                          <label key={c} className="flex items-center gap-2 text-xs cursor-pointer">
                            <Checkbox checked={!!checks[c]} onCheckedChange={v => setChecks(prev => ({ ...prev, [c]: !!v }))} />
                            {c}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-card border-t flex justify-end gap-2">
                      <Button onClick={saveUpdate} disabled={busy}>
                        {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        Submit Update
                      </Button>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* EVIDENCE */}
              <TabsContent value="evidence" className="p-4 space-y-4">
                {!viewOnly && (
                  <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3 space-y-3">
                    <div>
                      <Label className="text-xs">Evidence Type</Label>
                      <Select value={evidenceKind} onValueChange={setEvidenceKind}>
                        <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {EVIDENCE_KINDS.map(k => <SelectItem key={k.id} value={k.id}>{k.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Files</Label>
                      <Input type="file" multiple accept="image/*,video/*,application/pdf,audio/*"
                        onChange={e => setEvidenceFiles(Array.from(e.target.files || []))} className="mt-1" />
                      {evidenceFiles.length > 0 && (
                        <div className="text-[11px] text-muted-foreground mt-1">{evidenceFiles.length} file(s) selected</div>
                      )}
                    </div>
                    <Button onClick={uploadEvidence} disabled={busy || !evidenceFiles.length} size="sm">
                      {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                      Upload Evidence
                    </Button>
                  </div>
                )}
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">All Uploaded Proof</div>
                {updates.filter(u => u.before_url || u.after_url).length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-4">No proof uploaded yet</div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {updates.flatMap(u => [u.before_url, u.after_url].filter(Boolean).map((url: string, i) => (
                    <button key={u.id + i} type="button" onClick={() => setPreviewUrl(url)}
                      className="aspect-square rounded-lg border overflow-hidden hover:border-primary transition relative">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-1 py-0.5 truncate">{fmt(u.created_at)}</div>
                    </button>
                  )))}
                </div>
              </TabsContent>

              {/* ESCALATION */}
              <TabsContent value="escalation" className="p-4 space-y-4">
                {!viewOnly && (
                  <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-4 space-y-3">
                    <div>
                      <Label className="text-xs">Escalation Reason</Label>
                      <Select value={escReason} onValueChange={setEscReason}>
                        <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{ESCALATION_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Note</Label>
                      <Textarea rows={2} value={escNote} onChange={e => setEscNote(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Escalate To</Label>
                      <Select value={escTarget} onValueChange={setEscTarget}>
                        <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{ESCALATION_TARGETS.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button onClick={submitEscalation} disabled={busy} variant="destructive" size="sm">
                      <ArrowUpCircle className="w-4 h-4 mr-2" />Raise Escalation
                    </Button>
                  </div>
                )}
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Prior Escalations</div>
                {escalations.length === 0 && <div className="text-xs text-muted-foreground text-center py-4">None</div>}
                {escalations.map(e => (
                  <div key={e.id} className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold inline-flex items-center gap-1"><ArrowUpCircle className="w-4 h-4 text-orange-600" />→ {e.to_level}</span>
                      <Badge variant={e.status === 'open' ? 'destructive' : 'secondary'} className="text-[10px]">{e.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{e.reason}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{fmt(e.created_at)}</div>
                  </div>
                ))}
              </TabsContent>

              {/* TIMELINE */}
              <TabsContent value="timeline" className="p-4">
                <ol className="relative border-l-2 border-border ml-3 space-y-4">
                  <li className="ml-4 relative">
                    <span className="absolute -left-[26px] top-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center"><FileText className="w-3 h-3" /></span>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <div className="font-semibold text-sm">Complaint created</div>
                      <div className="text-[11px] text-muted-foreground mt-1">{fmt(problem.created_at)} · by {problem.reporter_name}</div>
                    </div>
                  </li>
                  {[...updates].reverse().map(u => {
                    const meta = STATUS_STAGES.find(s => s.id === u.status);
                    return (
                      <li key={u.id} className="ml-4 relative">
                        <span className="absolute -left-[26px] top-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Activity className="w-3 h-3" /></span>
                        <div className="bg-muted/30 rounded-lg p-3">
                          <div className="flex justify-between gap-2 flex-wrap">
                            <div className="font-semibold text-sm">{meta?.en || u.status}</div>
                            <div className="text-[10px] text-muted-foreground">{fmt(u.created_at)}</div>
                          </div>
                          {u.note && <div className="text-xs whitespace-pre-wrap mt-1">{u.note}</div>}
                          {(u.before_url || u.after_url) && (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              {u.before_url && (
                                <button onClick={() => setPreviewUrl(u.before_url)}>
                                  <div className="text-[10px] font-semibold text-muted-foreground mb-0.5 text-left">Before</div>
                                  <img src={u.before_url} className="w-full h-24 object-cover rounded border" />
                                </button>
                              )}
                              {u.after_url && (
                                <button onClick={() => setPreviewUrl(u.after_url)}>
                                  <div className="text-[10px] font-semibold text-green-700 mb-0.5 text-left">After</div>
                                  <img src={u.after_url} className="w-full h-24 object-cover rounded border" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                  {escalations.map(e => (
                    <li key={e.id} className="ml-4 relative">
                      <span className="absolute -left-[26px] top-0 w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center"><ArrowUpCircle className="w-3 h-3" /></span>
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <div className="flex justify-between gap-2 flex-wrap">
                          <div className="font-semibold text-sm">Escalated → {e.to_level}</div>
                          <div className="text-[10px] text-muted-foreground">{fmt(e.created_at)}</div>
                        </div>
                        <div className="text-xs mt-1">{e.reason}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              </TabsContent>
            </Tabs>
          </div>

          {/* RIGHT: intelligence (desktop only) */}
          <aside className="hidden lg:block w-60 border-l border-border overflow-y-auto p-4 space-y-3 bg-muted/10 shrink-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Intelligence</div>
            <div className="bg-card border rounded-lg p-3 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Priority</span><Badge className="text-[10px]">{problem.urgency}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Age</span><span className="font-medium">{Math.round(slaInfo.ageH)}h</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">SLA Target</span><span className="font-medium">{slaInfo.target}h</span></div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SLA Status</span>
                {slaInfo.breached
                  ? <span className="text-red-600 font-semibold">Breached</span>
                  : <span className="text-green-700 font-semibold">{Math.round(slaInfo.remainingH)}h left</span>}
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Support</span><span className="font-medium">{problem.support_count || 1}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Updates</span><span className="font-medium">{updates.length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Escalations</span><span className="font-medium">{escalations.length}</span></div>
            </div>
          </aside>
        </div>
      </div>
      {previewUrl && <MediaPreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />}
    </div>
  );
};

export default CadreWorkspace;
