import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertTriangle, Flame, Clock, MapPin, User as UserIcon, Phone, FileText,
  Send, CheckCircle2, ListChecks, MessageSquare, History, Activity,
  ArrowUpCircle, Sparkles, Loader2,
} from 'lucide-react';
import { fmtIST } from '@/lib/datetime';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const SEV: Record<string, string> = {
  critical: 'bg-red-600 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-amber-400 text-black',
  low: 'bg-blue-500/15 text-blue-700',
};

const LEVELS = ['ward', 'constituency', 'district', 'state'] as const;

interface Props {
  escalation: any;
  open: boolean;
  onClose: () => void;
}

const EscalationDetailModal: React.FC<Props> = ({ escalation, open, onClose }) => {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [closeNote, setCloseNote] = useState('');

  const { data: problem } = useQuery({
    queryKey: ['esc_problem', escalation?.problem_id],
    enabled: open && !!escalation?.problem_id,
    queryFn: async () => {
      const { data } = await supabase.from('problems').select('*').eq('id', escalation.problem_id).maybeSingle();
      return data;
    },
  });

  const { data: media = [] } = useQuery({
    queryKey: ['esc_media', escalation?.problem_id],
    enabled: open && !!escalation?.problem_id,
    queryFn: async () => {
      const { data } = await supabase.from('problem_media').select('*').eq('problem_id', escalation.problem_id);
      return data ?? [];
    },
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ['esc_full_timeline', escalation?.id],
    enabled: open && !!escalation?.id,
    queryFn: async () => {
      const [pu, ad, sms] = await Promise.all([
        supabase.from('problem_updates').select('*').eq('problem_id', escalation.problem_id).order('created_at'),
        supabase.from('ai_decisions' as any).select('*').eq('entity_id', escalation.id).order('created_at').limit(40),
        supabase.from('sms_log' as any).select('*').eq('problem_id', escalation.problem_id).order('created_at').limit(40),
      ]);
      const events: any[] = [];
      events.push({ at: escalation.created_at, kind: 'escalation', text: `Escalated to ${escalation.escalated_to_level || 'constituency'} — ${escalation.reason || 'SLA breach'}` });
      (escalation.status_history || []).forEach((h: any) => events.push({ at: h.at, kind: 'status', text: `Status: ${h.from} → ${h.to}` }));
      (pu.data || []).forEach((u: any) => events.push({ at: u.created_at, kind: 'update', text: `${u.status || 'Update'}${u.note ? ' — ' + u.note : ''}` }));
      (ad.data || []).forEach((d: any) => events.push({ at: d.created_at, kind: 'ai', text: `AI ${d.action}${d.reason ? ' — ' + d.reason : ''}` }));
      (sms.data || []).forEach((s: any) => events.push({ at: s.created_at, kind: 'sms', text: `SMS to ${s.to_phone || 'recipient'}` }));
      return events.sort((a, b) => +new Date(a.at) - +new Date(b.at));
    },
  });

  const { data: comms = [] } = useQuery({
    queryKey: ['esc_comms', escalation?.problem_id],
    enabled: open && !!escalation?.problem_id,
    queryFn: async () => {
      const [sms, email] = await Promise.all([
        supabase.from('sms_log' as any).select('*').eq('problem_id', escalation.problem_id).order('created_at', { ascending: false }).limit(20),
        supabase.from('email_outbox' as any).select('*').eq('problem_id', escalation.problem_id).order('created_at', { ascending: false }).limit(20),
      ]);
      return [
        ...(sms.data || []).map((s: any) => ({ ...s, channel: 'SMS', target: s.to_phone })),
        ...(email.data || []).map((e: any) => ({ ...e, channel: 'Email', target: e.to_email })),
      ].sort((a: any, b: any) => +new Date(b.created_at) - +new Date(a.created_at));
    },
  });

  const checklist: any[] = useMemo(
    () => Array.isArray(escalation?.checklist) ? escalation.checklist : [],
    [escalation?.checklist]
  );

  const completedCount = checklist.filter(c => c.done).length;
  const checklistComplete = checklist.length > 0 && completedCount === checklist.length;
  const sinceEscalation = escalation?.created_at ? formatDistanceToNow(new Date(escalation.created_at), { addSuffix: true }) : '';

  const toggleCheck = async (key: string, done: boolean) => {
    setBusy(true);
    try {
      const next = checklist.map((c: any) => c.key === key ? { ...c, done, by: 'admin', at: done ? new Date().toISOString() : null } : c);
      const { error } = await supabase.from('escalations' as any).update({ checklist: next }).eq('id', escalation.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['escalations_desk'] });
      toast.success(done ? 'Step completed' : 'Step reopened');
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const closeEscalation = async () => {
    if (!checklistComplete) { toast.error('Complete all checklist steps first'); return; }
    setBusy(true);
    try {
      const history = [...(escalation.status_history || []), { from: escalation.status, to: 'resolved', at: new Date().toISOString(), note: closeNote }];
      const { error } = await supabase.from('escalations' as any).update({
        status: 'resolved', resolved_at: new Date().toISOString(), status_history: history,
      }).eq('id', escalation.id);
      if (error) throw error;
      toast.success('Escalation closed');
      qc.invalidateQueries({ queryKey: ['escalations_desk'] });
      onClose();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const reEscalate = async () => {
    const idx = LEVELS.indexOf(escalation.escalated_to_level || 'constituency');
    const nextLevel = LEVELS[Math.min(idx + 1, LEVELS.length - 1)];
    setBusy(true);
    try {
      const { error } = await supabase.from('escalations' as any).update({
        escalated_to_level: nextLevel,
        status_history: [...(escalation.status_history || []), { from: escalation.status, to: 'reescalated', at: new Date().toISOString(), to_level: nextLevel }],
      }).eq('id', escalation.id);
      if (error) throw error;
      toast.success(`Re-escalated to ${nextLevel}`);
      qc.invalidateQueries({ queryKey: ['escalations_desk'] });
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const aiPlan = async () => {
    setBusy(true);
    try {
      await supabase.functions.invoke('ai-action-plan', { body: { problem_id: escalation.problem_id, kind: 'escalation' } });
      toast.success('AI plan generated');
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  if (!escalation) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0">
        {/* Header */}
        <DialogHeader className="sticky top-0 z-10 bg-background border-b px-5 py-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-1.5 min-w-0">
              <DialogTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Escalation · <span className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded">{problem?.ticket_no || escalation.problem_id?.slice(0, 8)}</span>
              </DialogTitle>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge className={`text-[10px] ${SEV[escalation.severity || 'medium']}`}>
                  {escalation.severity === 'critical' && <Flame className="w-3 h-3 mr-1" />}
                  {(escalation.severity || 'medium').toUpperCase()}
                </Badge>
                <Badge variant="outline" className="text-[10px] capitalize">{escalation.status}</Badge>
                <Badge variant="outline" className="text-[10px] capitalize">to {escalation.escalated_to_level || 'constituency'}</Badge>
                {escalation.auto_escalated && (
                  <Badge className="text-[10px] bg-purple-500/15 text-purple-700 border-purple-500/30 border">
                    <Sparkles className="w-3 h-3 mr-1" />Auto
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />{sinceEscalation}
                </span>
              </div>
            </div>
            <div className="text-right text-[10px] text-muted-foreground">
              <div>{completedCount}/{checklist.length} steps</div>
              <div className="w-24 h-1 bg-muted rounded-full overflow-hidden mt-1">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${checklist.length ? (completedCount / checklist.length) * 100 : 0}%` }} />
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="px-5 pb-5">
          <Tabs defaultValue="checklist" className="w-full">
            <TabsList className="grid grid-cols-5 w-full h-9">
              <TabsTrigger value="checklist" className="text-xs"><ListChecks className="w-3.5 h-3.5 mr-1" />Checklist</TabsTrigger>
              <TabsTrigger value="case" className="text-xs"><FileText className="w-3.5 h-3.5 mr-1" />Case</TabsTrigger>
              <TabsTrigger value="plan" className="text-xs"><Activity className="w-3.5 h-3.5 mr-1" />Plan</TabsTrigger>
              <TabsTrigger value="comms" className="text-xs"><MessageSquare className="w-3.5 h-3.5 mr-1" />Comms</TabsTrigger>
              <TabsTrigger value="timeline" className="text-xs"><History className="w-3.5 h-3.5 mr-1" />Timeline</TabsTrigger>
            </TabsList>

            {/* CHECKLIST */}
            <TabsContent value="checklist" className="mt-4 space-y-2">
              <div className="text-xs text-muted-foreground">All steps must be completed before this escalation can be closed.</div>
              {checklist.map((c: any) => (
                <div key={c.key} className={`flex items-start gap-3 p-3 rounded-lg border ${c.done ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300' : 'bg-card'}`}>
                  <Checkbox checked={c.done} onCheckedChange={(v) => toggleCheck(c.key, !!v)} disabled={busy} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${c.done ? 'line-through text-muted-foreground' : ''}`}>{c.label}</div>
                    {c.done && c.at && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">Completed {fmtIST(c.at)}</div>
                    )}
                  </div>
                  {c.done && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </div>
              ))}
              <div className="pt-3 border-t mt-4 space-y-2">
                <Textarea value={closeNote} onChange={e => setCloseNote(e.target.value)} placeholder="Closing note (optional)" rows={2} className="text-sm" />
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={closeEscalation} disabled={!checklistComplete || busy} className="flex-1 min-w-[140px]">
                    {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                    Close escalation
                  </Button>
                  <Button variant="outline" onClick={reEscalate} disabled={busy}>
                    <ArrowUpCircle className="w-4 h-4 mr-1" />Re-escalate
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* CASE */}
            <TabsContent value="case" className="mt-4 space-y-3">
              {problem ? (
                <>
                  <div className="space-y-1">
                    <div className="text-base font-semibold">{problem.title}</div>
                    <div className="text-sm text-muted-foreground">{problem.description}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <Info icon={MapPin} label="Location" value={`${problem.area || ''} · ${problem.constituency || ''}`} />
                    <Info icon={UserIcon} label="Reporter" value={problem.reporter_name || 'Anonymous'} />
                    <Info icon={Phone} label="Contact" value={problem.reporter_phone || '—'} />
                    <Info icon={FileText} label="Department" value={problem.department || '—'} />
                    <Info icon={Clock} label="Reported" value={fmtIST(problem.created_at)} />
                    <Info icon={AlertTriangle} label="Urgency" value={problem.urgency || 'normal'} />
                  </div>
                  {media.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold mb-1.5">Evidence ({media.length})</div>
                      <div className="grid grid-cols-3 gap-2">
                        {media.slice(0, 6).map((m: any) => (
                          <a key={m.id} href={m.url} target="_blank" rel="noreferrer" className="aspect-square bg-muted rounded overflow-hidden">
                            <img loading="lazy" src={m.url} alt="" className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-muted-foreground">Loading case…</div>
              )}
            </TabsContent>

            {/* PLAN */}
            <TabsContent value="plan" className="mt-4 space-y-2">
              <div className="text-xs text-muted-foreground">Trigger AI to generate or refresh the execution plan for this escalation.</div>
              <Button onClick={aiPlan} disabled={busy} size="sm">
                <Sparkles className="w-4 h-4 mr-1" />Generate AI action plan
              </Button>
              <div className="text-[11px] text-muted-foreground pt-2">
                Plans appear in the case's blueprint tasks and in the timeline.
              </div>
            </TabsContent>

            {/* COMMS */}
            <TabsContent value="comms" className="mt-4 space-y-2">
              {comms.length === 0 && <div className="text-sm text-muted-foreground">No communications logged yet.</div>}
              {comms.map((c: any, i: number) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded border text-xs">
                  <Badge variant="outline" className="text-[10px]">{c.channel}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.target}</div>
                    <div className="text-muted-foreground truncate">{c.message || c.body || c.subject || '—'}</div>
                  </div>
                  <div className="text-[10px] text-muted-foreground shrink-0">{fmtIST(c.created_at)}</div>
                </div>
              ))}
            </TabsContent>

            {/* TIMELINE */}
            <TabsContent value="timeline" className="mt-4 space-y-1.5">
              {timeline.length === 0 && <div className="text-xs text-muted-foreground">No events yet.</div>}
              {(timeline as any[]).map((e: any, i: number) => (
                <div key={i} className="text-xs flex gap-2">
                  <div className="shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                    {e.kind === 'escalation' ? <Flame className="w-3 h-3 text-red-600" /> :
                     e.kind === 'ai' ? <Sparkles className="w-3 h-3 text-primary" /> :
                     e.kind === 'sms' ? <Send className="w-3 h-3" /> :
                     e.kind === 'status' ? <Clock className="w-3 h-3" /> :
                     <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div>{e.text}</div>
                    <div className="text-[10px] text-muted-foreground">{fmtIST(e.at)}</div>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Info: React.FC<{ icon: any; label: string; value: string }> = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-1.5 p-2 rounded border bg-muted/30">
    <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
    <div className="min-w-0">
      <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</div>
      <div className="truncate">{value}</div>
    </div>
  </div>
);

export default EscalationDetailModal;
