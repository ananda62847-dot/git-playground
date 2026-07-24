import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Phone, Clock, User, CheckCircle2, Circle, ArrowUpCircle, UserCheck, Wrench, FileImage, Hash, Calendar, Navigation, AlertTriangle, Workflow, Info, ListTree } from 'lucide-react';
import { DEPARTMENTS, STATUS_STAGES } from '@/lib/departments';
import MediaPreviewModal from '@/components/MediaPreviewModal';
import ResolutionBlueprintPanel from '@/components/blueprint/ResolutionBlueprintPanel';
import BlueprintProgressStrip from '@/components/blueprint/BlueprintProgressStrip';
import EvidenceTile from '@/components/admin/EvidenceTile';
import { fmtIST, fmtISTDate } from '@/lib/datetime';
import { isReportClosed, closedBadgeLabel } from '@/lib/reportStatus';
import { Lock, FileDown } from 'lucide-react';
import CadreFiledBadge from '@/components/CadreFiledBadge';
import AttachmentLink from '@/components/AttachmentLink';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';
import { Button } from '@/components/ui/button';
import { downloadComplaintPdf } from '@/lib/complaintPdf';
import { downloadTamilComplaintPdf } from '@/lib/tamilComplaintPdf';
import ReportInternalNotes from '@/components/admin/ReportInternalNotes';
import FalseCloseControl from '@/components/admin/FalseCloseControl';
import AdminIssueControls from '@/components/admin/AdminIssueControls';
import { toast } from 'sonner';

const timeAgo = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} hr ago`;
  if (diff < 86400 * 7) return `${Math.round(diff / 86400)} days ago`;
  return fmtISTDate(iso);
};

const STATUS_META: Record<string, { label: string; tamil: string; icon: any; color: string }> = {
  submitted: { label: 'Report Submitted', tamil: 'புகார் பதிவு', icon: FileImage, color: 'bg-blue-500' },
  reported: { label: 'Report Submitted', tamil: 'புகார் பதிவு', icon: FileImage, color: 'bg-blue-500' },
  assigned: { label: 'Assigned to Team', tamil: 'குழுவுக்கு ஒதுக்கப்பட்டது', icon: UserCheck, color: 'bg-indigo-500' },
  claimed: { label: 'Claimed by Cadre', tamil: 'தொண்டர் ஏற்றார்', icon: UserCheck, color: 'bg-purple-500' },
  in_progress: { label: 'Work in Progress', tamil: 'பணி நடைபெறுகிறது', icon: Wrench, color: 'bg-amber-500' },
  work_started: { label: 'Work Started', tamil: 'பணி துவங்கியது', icon: Wrench, color: 'bg-amber-500' },
  completed: { label: 'Work Completed', tamil: 'பணி முடிந்தது', icon: CheckCircle2, color: 'bg-green-600' },
  resolved: { label: 'Resolved', tamil: 'தீர்க்கப்பட்டது', icon: CheckCircle2, color: 'bg-green-600' },
  citizen_confirmed: { label: 'Citizen Confirmed', tamil: 'குடிமகன் உறுதிப்படுத்தினார்', icon: CheckCircle2, color: 'bg-emerald-700' },
  escalated: { label: 'Escalated', tamil: 'மேல்நிலைக்கு', icon: ArrowUpCircle, color: 'bg-orange-500' },
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{children}</div>
);

const InfoRow: React.FC<{ icon: any; label: string; value?: React.ReactNode }> = ({ icon: Icon, label, value }) =>
  value ? (
    <div className="flex items-start gap-2.5 text-sm">
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="font-medium break-words">{value}</div>
      </div>
    </div>
  ) : null;

const ProblemDetailModal: React.FC<{ problem: any; onClose: () => void }> = ({ problem, onClose }) => {
  const [media, setMedia] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [escalations, setEscalations] = useState<any[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [filedByCadre, setFiledByCadre] = useState<{ name: string; phone?: string; level?: string } | null>(null);

  useEffect(() => {
    (async () => {
      const [m, u, a, e] = await Promise.all([
        supabase.from('problem_media').select('*').eq('problem_id', problem.id),
        supabase.from('problem_updates').select('*').eq('problem_id', problem.id).order('created_at', { ascending: false }),
        supabase.from('problem_assignments').select('*').eq('problem_id', problem.id),
        supabase.from('escalations').select('*').eq('problem_id', problem.id).order('created_at', { ascending: false }),
      ]);
      const aRows = a.data || [];
      const cadreIds = Array.from(new Set(aRows.flatMap((r: any) => [r.cadre_id, r.claimed_by_cadre_id]).filter(Boolean)));
      const teamIds = Array.from(new Set(aRows.map((r: any) => r.team_id).filter(Boolean)));
      const [{ data: cs }, { data: ts }] = await Promise.all([
        cadreIds.length ? supabase.from('cadres').select('id,name,phone,level').in('id', cadreIds) : Promise.resolve({ data: [] as any[] }),
        teamIds.length ? supabase.from('teams').select('id,name').in('id', teamIds) : Promise.resolve({ data: [] as any[] }),
      ]);
      const cMap = new Map((cs || []).map((x: any) => [x.id, x]));
      const tMap = new Map((ts || []).map((x: any) => [x.id, x]));
      const enriched = aRows.map((r: any) => ({
        ...r,
        cadres: r.cadre_id ? cMap.get(r.cadre_id) : null,
        claimed_by_cadre: r.claimed_by_cadre_id ? cMap.get(r.claimed_by_cadre_id) : null,
        teams: r.team_id ? tMap.get(r.team_id) : null,
      }));
      setMedia(m.data || []); setUpdates(u.data || []); setAssignments(enriched); setEscalations(e.data || []);
      if (problem.is_cadre_filed && problem.reported_by_cadre_id) {
        const { data: c } = await supabase.from('cadres').select('name,phone,level').eq('id', problem.reported_by_cadre_id).maybeSingle();
        if (c) setFiledByCadre(c as any);
      }
    })();
  }, [problem.id]);

  const dep = DEPARTMENTS.find(d => d.id === problem.department);
  const stage = STATUS_STAGES.find(s => s.id === problem.status);

  const translate = useAutoTranslate([
    { id: 'title', text: problem.title },
    { id: 'desc', text: problem.description },
  ]);
  const tTitle = translate('title', problem.title);
  const tDesc = translate('desc', problem.description);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0">
        {/* Header */}
        <DialogHeader className="sticky top-0 bg-card border-b z-10 px-5 py-4">
          <div className="flex flex-wrap gap-2 items-center mb-2">
            <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{problem.ticket_no}</span>
            <Badge variant="outline" className="text-[10px]">{dep?.icon} {dep?.en}</Badge>
            <Badge variant="outline" className={`text-[10px] ${stage?.color || ''}`}>{stage?.en || problem.status}</Badge>
            {problem.urgency === 'emergency' && <Badge className="bg-red-600 text-white text-[10px]">EMERGENCY</Badge>}
            {problem.urgency === 'high' && <Badge className="bg-orange-500 text-white text-[10px]">HIGH</Badge>}
            {problem.is_cadre_filed && <CadreFiledBadge cadreName={filedByCadre?.name} />}
          </div>
          <div className="flex items-start justify-between gap-2">
            <DialogTitle className="text-base md:text-lg break-words tamil-safe flex-1">{tTitle}</DialogTitle>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="sm" variant="outline" className="h-7 text-[11px]"
                onClick={async () => {
                  try {
                    await downloadComplaintPdf({
                      ticket_no: problem.ticket_no,
                      submitted_at: new Date(problem.created_at),
                      status: problem.status,
                      citizen: {
                        name: problem.reporter_name, phone: problem.reporter_phone, age: problem.reporter_age,
                        constituency: problem.constituency, city: problem.city, area: problem.area, pincode: problem.pincode,
                      },
                      complaint: {
                        department: problem.department, department_label: dep?.en,
                        category: problem.category, urgency: problem.urgency,
                        title: problem.title, description: problem.description,
                      },
                      location: { latitude: problem.latitude, longitude: problem.longitude },
                      evidence_count: media.length,
                      has_voice_note: !!problem.voice_note_url,
                    });
                  } catch (e: any) { toast.error(e?.message || 'PDF failed'); }
                }}
              >
                <FileDown className="w-3 h-3 mr-1" />PDF
              </Button>
              <Button
                size="sm" variant="outline" className="h-7 text-[11px]"
                onClick={() => downloadTamilComplaintPdf('problem', problem.id, problem.ticket_no)}
                title="Download Tamil PDF"
              >
                <FileDown className="w-3 h-3 mr-1" />தமிழ் PDF
              </Button>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-end">
            <AdminIssueControls
              kind="problem"
              id={problem.id}
              onHold={!!problem.on_hold}
              showLocation
              currentLat={problem.latitude}
              currentLng={problem.longitude}
              onChanged={onClose}
              onDeleted={onClose}
            />
          </div>
          {problem.status === 'pending_admin_confirmation' && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-amber-50 border-2 border-amber-400 px-3 py-2 text-xs text-amber-900">
              <span className="inline-flex items-center gap-1.5 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" />Cadre marked resolved — needs your confirmation</span>
              <Button
                size="sm" className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700"
                onClick={async () => {
                  const { error } = await supabase.from('problems').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', problem.id);
                  if (error) return toast.error(error.message);
                  await supabase.from('problem_updates').insert({ problem_id: problem.id, status: 'resolved', note: 'Admin confirmed resolution.' } as any);
                  toast.success('Confirmed. Marked as resolved.');
                  onClose();
                }}
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />Confirm Completion
              </Button>
            </div>
          )}
        </DialogHeader>

        <div className="px-5 pt-4 pb-2">
          {isReportClosed(problem) && (
            <div className="mb-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg p-3 text-sm flex items-center justify-between gap-3 flex-wrap">
              <span className="inline-flex items-center gap-2 font-medium"><Lock className="w-4 h-4" />{closedBadgeLabel(problem.status)}</span>
              {problem.completion_report_url && (
                <AttachmentLink url={problem.completion_report_url} filename="closure-report" className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-semibold">
                  <FileDown className="w-3 h-3" /> Download Closure Report
                </AttachmentLink>
              )}
            </div>
          )}
          <BlueprintProgressStrip kind="problem" entityId={problem.id} />
        </div>

        <Tabs defaultValue="workflow" className="w-full">
          <div className="px-5 border-b bg-card">
            <TabsList className="h-10 bg-transparent p-0 gap-1">
              <TabsTrigger value="workflow" className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary"><Workflow className="w-3.5 h-3.5 mr-1" />Workflow &amp; Evidence</TabsTrigger>
              <TabsTrigger value="overview" className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary"><Info className="w-3.5 h-3.5 mr-1" />Overview</TabsTrigger>
              <TabsTrigger value="updates" className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary"><ListTree className="w-3.5 h-3.5 mr-1" />Updates ({updates.length + escalations.length})</TabsTrigger>
              <TabsTrigger value="notes" className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">🗒 Internal Notes</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="workflow" className="px-5 py-5 mt-0">
            <ResolutionBlueprintPanel problem={problem} isAdmin={true} />
          </TabsContent>

          <TabsContent value="overview" className="px-5 py-5 mt-0 space-y-6">
            <section>
              <SectionTitle>Description</SectionTitle>
              <p className="text-sm whitespace-pre-wrap break-words bg-muted/30 rounded-lg p-3 leading-relaxed tamil-safe">{tDesc}</p>
            </section>

            <div className="grid md:grid-cols-2 gap-6">
              <section className="space-y-3">
                <SectionTitle>Reporter</SectionTitle>
                <InfoRow icon={User} label="Name" value={`${problem.reporter_name}${problem.reporter_age ? ` · ${problem.reporter_age} yrs` : ''}`} />
                <InfoRow icon={Phone} label="Phone" value={<a href={`tel:${problem.reporter_phone}`} className="text-primary">{problem.reporter_phone}</a>} />
                <InfoRow icon={Calendar} label="Reported on" value={fmtIST(problem.created_at)} />
                {problem.is_cadre_filed && (
                  <InfoRow icon={UserCheck} label="Filed by cadre" value={filedByCadre ? `${filedByCadre.name}${filedByCadre.level ? ` · ${filedByCadre.level}` : ''}${filedByCadre.phone ? ` · ${filedByCadre.phone}` : ''}` : '—'} />
                )}
              </section>
              <section className="space-y-3">
                <SectionTitle>Location</SectionTitle>
                <InfoRow icon={MapPin} label="Address" value={[problem.address_line, problem.area, problem.constituency, problem.city, problem.pincode].filter(Boolean).join(' · ')} />
                {problem.polling_booth && <InfoRow icon={Hash} label="Polling Booth" value={problem.polling_booth} />}
                {problem.latitude && (
                  <InfoRow icon={Navigation} label="GPS" value={
                    <a href={`https://maps.google.com/?q=${problem.latitude},${problem.longitude}`} target="_blank" rel="noreferrer" className="text-primary">
                      {Number(problem.latitude).toFixed(5)}, {Number(problem.longitude).toFixed(5)}
                    </a>
                  } />
                )}
              </section>
            </div>

            {(problem.voice_note_url || problem.voice_transcript) && (
              <section className="border-t pt-5">
                <SectionTitle>🎙 Voice Note (AI transcribed)</SectionTitle>
                {problem.voice_note_url && <audio controls src={problem.voice_note_url} className="w-full mb-2" />}
                {problem.voice_transcript && <p className="text-xs italic bg-muted/30 rounded p-2 whitespace-pre-wrap">"{problem.voice_transcript}"</p>}
              </section>
            )}

            {media.length > 0 && (
              <section className="border-t pt-5">
                <SectionTitle>Citizen Media ({media.length}) — AI scored</SectionTitle>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {media.map(m => (
                    <EvidenceTile
                      key={m.id}
                      url={m.url}
                      entityType="problem"
                      entityId={problem.id}
                      contextText={`${problem.title} — ${problem.description?.slice(0, 200)}`}
                      imgClassName="w-full h-32 object-cover"
                      onOpen={() => setPreviewUrl(m.url)}
                    />
                  ))}
                </div>
              </section>
            )}
          </TabsContent>

          <TabsContent value="updates" className="px-5 py-5 mt-0 space-y-6">
            {assignments.length > 0 && (
              <section>
                <SectionTitle>Assignments &amp; Claims</SectionTitle>
                <div className="space-y-2">
                  {assignments.map(a => {
                    const claimer = (a as any).claimed_by_cadre || a.cadres;
                    const claimedAt = a.claimed_at ? new Date(a.claimed_at) : null;
                    return (
                      <div key={a.id} className="border rounded-lg p-3 text-sm space-y-1">
                        {a.teams?.name && <div><span className="text-muted-foreground text-xs">Team:</span> <span className="font-medium">{a.teams.name}</span></div>}
                        {a.cadres?.name && <div><span className="text-muted-foreground text-xs">Assigned:</span> <span className="font-medium">{a.cadres.name}</span> <span className="text-xs text-muted-foreground">({a.cadres.level})</span></div>}
                        {claimer?.name ? (
                          <div className="text-green-700"><span className="text-xs">Claimed by:</span> <span className="font-medium">{claimer.name}</span>
                            {claimedAt && <span className="text-xs text-muted-foreground"> · {fmtIST(claimedAt)}</span>}
                          </div>
                        ) : a.team_id ? <div className="text-amber-700 text-xs">Open for team claim</div> : null}
                        {a.notes && <div className="text-xs text-muted-foreground italic">"{a.notes}"</div>}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {updates.length > 0 && (
              <section>
                <SectionTitle>Progress Timeline</SectionTitle>
                <ol className="relative border-l-2 border-border ml-3 space-y-4">
                  {[...updates].reverse().map((u, idx, arr) => {
                    const meta = STATUS_META[u.status] || { label: u.status?.replace(/_/g, ' '), tamil: '', icon: Circle, color: 'bg-muted-foreground' };
                    const Icon = meta.icon;
                    const isLatest = idx === arr.length - 1;
                    return (
                      <li key={u.id} className="ml-4 relative">
                        <span className={`absolute -left-[26px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-white shadow ${meta.color} ${isLatest ? 'ring-4 ring-primary/20' : ''}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <div className="bg-muted/30 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <div className="font-semibold text-sm">{meta.label}</div>
                              {meta.tamil && <div className="text-[11px] text-muted-foreground">{meta.tamil}</div>}
                            </div>
                            <div className="text-[10px] text-muted-foreground text-right">
                              <div>{timeAgo(u.created_at)}</div>
                              <div>{fmtIST(u.created_at)}</div>
                            </div>
                          </div>
                          {u.note && <div className="text-xs text-foreground/80 mt-2 italic">"{u.note}"</div>}
                          {(u.before_url || u.after_url) && (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              {u.before_url && (
                                <div>
                                  <div className="text-[10px] font-semibold text-muted-foreground mb-0.5">Before</div>
                                  <EvidenceTile url={u.before_url} entityType="problem" entityId={problem.id}
                                    contextText={`Before proof: ${u.note || problem.title}`} imgClassName="w-full h-24 object-cover"
                                    onOpen={() => setPreviewUrl(u.before_url)} />
                                </div>
                              )}
                              {u.after_url && (
                                <div>
                                  <div className="text-[10px] font-semibold text-green-700 mb-0.5">After</div>
                                  <EvidenceTile url={u.after_url} entityType="problem" entityId={problem.id}
                                    contextText={`After proof: ${u.note || problem.title}`} imgClassName="w-full h-24 object-cover"
                                    onOpen={() => setPreviewUrl(u.after_url)} />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            )}

            {escalations.length > 0 && (
              <section>
                <SectionTitle>Escalations</SectionTitle>
                <div className="space-y-2">
                  {escalations.map(e => (
                    <div key={e.id} className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold inline-flex items-center gap-1"><ArrowUpCircle className="w-4 h-4 text-orange-600" />→ {e.to_level}</span>
                        <Badge variant={e.status === 'open' ? 'destructive' : 'secondary'} className="text-[10px]">{e.status}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{e.reason}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {updates.length === 0 && assignments.length === 0 && escalations.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">No updates yet. Action flows through the Workflow tab.</div>
            )}
          </TabsContent>

          <TabsContent value="notes" className="px-5 py-5 mt-0">
            <ReportInternalNotes kind="problem" reportId={problem.id} />
            <FalseCloseControl table="problems" row={problem} onDone={onClose} />
          </TabsContent>
        </Tabs>
      </DialogContent>
      {previewUrl && <MediaPreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />}
    </Dialog>
  );
};
export default ProblemDetailModal;
