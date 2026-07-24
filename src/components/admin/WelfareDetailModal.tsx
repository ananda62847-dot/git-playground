import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, Phone, MapPin, Calendar, FileText, Hash, Clock, Building2, Receipt, Lock, UserPlus, Workflow, Info, ListTree, FileDown, CheckCircle2 } from 'lucide-react';
import { downloadComplaintPdf } from '@/lib/complaintPdf';
import { WELFARE_SCHEMES, WELFARE_STATUS } from '@/lib/welfareSchemes';
import MediaPreviewModal from '@/components/MediaPreviewModal';
import ResolutionBlueprintPanel from '@/components/blueprint/ResolutionBlueprintPanel';
import BlueprintProgressStrip from '@/components/blueprint/BlueprintProgressStrip';
import AssignModal from '@/components/admin/AssignModal';
import { fmtIST } from '@/lib/datetime';
import { isReportClosed, closedBadgeLabel } from '@/lib/reportStatus';
import CadreFiledBadge from '@/components/CadreFiledBadge';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';
import { downloadTamilComplaintPdf } from '@/lib/tamilComplaintPdf';
import ReportInternalNotes from '@/components/admin/ReportInternalNotes';
import FalseCloseControl from '@/components/admin/FalseCloseControl';

interface Props {
  welfare: any;
  onClose: () => void;
  canEdit?: boolean;
  onChanged?: () => void;
}

const Row: React.FC<{ icon: any; label: string; value?: React.ReactNode }> = ({ icon: Icon, label, value }) =>
  value ? (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="font-medium break-words">{value}</div>
      </div>
    </div>
  ) : null;

const WelfareDetailModal: React.FC<Props> = ({ welfare, onClose, canEdit, onChanged }) => {
  const [updates, setUpdates] = useState<any[]>([]);
  const [note, setNote] = useState('');
  const [newStatus, setNewStatus] = useState(welfare.status);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [filedBy, setFiledBy] = useState<{ name: string; phone?: string; level?: string } | null>(null);

  useEffect(() => {
    if (welfare.is_cadre_filed && welfare.reported_by_cadre_id) {
      supabase.from('cadres').select('name,phone,level').eq('id', welfare.reported_by_cadre_id).maybeSingle()
        .then(({ data }) => data && setFiledBy(data as any));
    }
  }, [welfare.id]);

  const locked = isReportClosed(welfare) || welfare.status === 'closed';
  const editable = canEdit && !locked;

  useEffect(() => {
    supabase.from('welfare_updates').select('*').eq('welfare_issue_id', welfare.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setUpdates(data || []));
  }, [welfare.id]);

  const humanize = (s?: string | null) =>
    (s || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, m => m.toUpperCase()) || undefined;
  const scheme = WELFARE_SCHEMES.find(s => s.id === welfare.scheme_type);
  const sub = scheme?.subcategories.find(c => c.id === welfare.subcategory);
  const schemeLabel = scheme?.en || humanize(welfare.scheme_type) || '—';
  const subLabel = sub?.en || humanize(welfare.subcategory) || '—';
  const stage = WELFARE_STATUS.find(s => s.id === welfare.status);

  const saveStatus = async () => {
    setBusy(true);
    const upd: any = { status: newStatus };
    if (['resolved', 'citizen_confirmed'].includes(newStatus)) upd.resolved_at = new Date().toISOString();
    const { error } = await supabase.from('welfare_issues').update(upd).eq('id', welfare.id);
    if (!error) {
      await supabase.from('welfare_updates').insert({
        welfare_issue_id: welfare.id, status: newStatus, note: note || null,
      });
      const smsTrigger = newStatus === 'under_processing' || newStatus === 'dept_contacted'
        ? 'WELFARE_PROCESSING'
        : (newStatus === 'resolved' ? 'WELFARE_RESOLVED' : null);
      if (smsTrigger) {
        supabase.functions.invoke('send-sms', { body: { welfareId: welfare.id, trigger: smsTrigger } })
          .catch(e => console.warn('[welfare-sms]', e));
      }
      toast.success('Status updated');
      setNote('');
      onChanged?.();
      const { data } = await supabase.from('welfare_updates').select('*').eq('welfare_issue_id', welfare.id).order('created_at', { ascending: false });
      setUpdates(data || []);
    } else toast.error(error.message);
    setBusy(false);
  };

  const translate = useAutoTranslate([
    { id: 't', text: welfare.title },
    { id: 'd', text: welfare.description },
  ]);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 bg-card border-b z-10 px-5 py-4">
          <div className="flex flex-wrap gap-2 items-center mb-2">
            <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{welfare.ticket_no}</span>
            <Badge variant="outline" className="text-[10px]">{scheme?.icon || '🏛️'} {schemeLabel}</Badge>
            <Badge className={`text-[10px] ${stage?.color || ''}`}>{stage?.en || welfare.status}</Badge>
            {welfare.urgency === 'emergency' && <Badge className="bg-red-600 text-white text-[10px]">EMERGENCY</Badge>}
            {welfare.is_cadre_filed && <CadreFiledBadge cadreName={filedBy?.name} />}
          </div>
          <div className="flex items-start justify-between gap-2">
            <DialogTitle className="text-base md:text-lg break-words tamil-safe flex-1">{translate('t', welfare.title)}</DialogTitle>
            <Button
              size="sm" variant="outline" className="h-7 text-[11px] shrink-0"
              onClick={async () => {
                try {
                  await downloadComplaintPdf({
                    ticket_no: welfare.ticket_no,
                    submitted_at: new Date(welfare.created_at),
                    status: welfare.status,
                    citizen: {
                      name: welfare.reporter_name, phone: welfare.reporter_phone, age: welfare.reporter_age,
                      constituency: welfare.constituency, city: welfare.city, area: welfare.area, pincode: welfare.pincode,
                    },
                    complaint: {
                      department: scheme?.id, department_label: scheme?.en,
                      category: sub?.id, category_label: sub?.en || welfare.subcategory,
                      urgency: welfare.urgency, title: welfare.title, description: welfare.description,
                    },
                    evidence_count: welfare.proof_urls?.length || 0,
                    has_voice_note: !!welfare.voice_note_url,
                  });
                } catch (e: any) { toast.error(e?.message || 'PDF failed'); }
              }}
            >
              <FileDown className="w-3 h-3 mr-1" />PDF
            </Button>
            <Button
              size="sm" variant="outline" className="h-7 text-[11px]"
              onClick={() => downloadTamilComplaintPdf('welfare', welfare.id, welfare.ticket_no)}
            >
              <FileDown className="w-3 h-3 mr-1" />தமிழ் PDF
            </Button>
          </div>
          {welfare.status === 'pending_admin_confirmation' && canEdit && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-amber-50 border-2 border-amber-400 px-3 py-2 text-xs text-amber-900">
              <span className="inline-flex items-center gap-1.5 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" />Cadre marked resolved — needs confirmation</span>
              <Button
                size="sm" className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700"
                onClick={async () => {
                  const { error } = await supabase.from('welfare_issues').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', welfare.id);
                  if (error) return toast.error(error.message);
                  await supabase.from('welfare_updates').insert({ welfare_issue_id: welfare.id, status: 'resolved', note: 'Admin confirmed resolution.' });
                  toast.success('Confirmed. Marked as resolved.');
                  onChanged?.(); onClose();
                }}
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />Confirm Completion
              </Button>
            </div>
          )}
        </DialogHeader>

        <div className="px-5 pt-4 pb-2">
          {locked && (
            <div className="mb-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg p-3 text-sm flex items-center gap-2">
              <Lock className="w-4 h-4" /> {closedBadgeLabel(welfare.status)}
            </div>
          )}
          <BlueprintProgressStrip kind="welfare" entityId={welfare.id} />
        </div>

        <Tabs defaultValue="workflow" className="w-full">
          <div className="px-5 border-b bg-card">
            <TabsList className="h-10 bg-transparent p-0 gap-1">
              <TabsTrigger value="workflow" className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary"><Workflow className="w-3.5 h-3.5 mr-1" />Workflow &amp; Evidence</TabsTrigger>
              <TabsTrigger value="overview" className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary"><Info className="w-3.5 h-3.5 mr-1" />Overview</TabsTrigger>
              <TabsTrigger value="voice" className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">🎙 Voice {welfare.voice_note_url ? '' : '(missing)'}</TabsTrigger>
              <TabsTrigger value="updates" className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary"><ListTree className="w-3.5 h-3.5 mr-1" />Updates ({updates.length})</TabsTrigger>
              <TabsTrigger value="notes" className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">🗒 Notes</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="workflow" className="px-5 py-5 mt-0 space-y-4">
            <ResolutionBlueprintPanel kind="welfare" entity={welfare} isAdmin={!!canEdit} />
            {editable && (
              <section className="border-t pt-4 space-y-2 bg-primary/5 -mx-5 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold">Admin: override status</div>
                  <Button size="sm" variant="outline" onClick={() => setShowAssign(true)} className="h-7 text-[11px]">
                    <UserPlus className="w-3 h-3 mr-1" />Assign Team
                  </Button>
                </div>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WELFARE_STATUS.map(s => <SelectItem key={s.id} value={s.id}>{s.en}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Textarea placeholder="Add a note (optional)" value={note} onChange={e => setNote(e.target.value)} rows={2} />
                <Button onClick={saveStatus} disabled={busy} className="w-full">Save update</Button>
              </section>
            )}
          </TabsContent>

          <TabsContent value="overview" className="px-5 py-5 mt-0 space-y-5">
            <section>
              <div className="text-xs font-semibold text-muted-foreground mb-1.5">DESCRIPTION</div>
              <p className="text-sm whitespace-pre-wrap break-words bg-muted/30 rounded-lg p-3 tamil-safe">{translate('d', welfare.description)}</p>
            </section>

            <div className="grid md:grid-cols-2 gap-5">
              <section className="space-y-2.5">
                <div className="text-xs font-semibold text-muted-foreground">REPORTER</div>
                <Row icon={User} label="Name" value={`${welfare.reporter_name}${welfare.reporter_age ? ` · ${welfare.reporter_age} yrs` : ''}`} />
                <Row icon={Phone} label="Phone" value={<a href={`tel:${welfare.reporter_phone}`} className="text-primary">{welfare.reporter_phone}</a>} />
                <Row icon={Calendar} label="Reported" value={fmtIST(welfare.created_at)} />
                {welfare.is_cadre_filed && (
                  <Row icon={User} label="Filed by cadre" value={filedBy ? `${filedBy.name}${filedBy.level ? ` · ${filedBy.level}` : ''}${filedBy.phone ? ` · ${filedBy.phone}` : ''}` : '—'} />
                )}
              </section>
              <section className="space-y-2.5">
                <div className="text-xs font-semibold text-muted-foreground">LOCATION</div>
                <Row icon={MapPin} label="Address" value={[welfare.address_line, welfare.area, welfare.constituency, welfare.city, welfare.pincode].filter(Boolean).join(' · ')} />
              </section>
            </div>

            <section className="space-y-2.5 border-t pt-4">
              <div className="text-xs font-semibold text-muted-foreground">SCHEME DETAILS</div>
              <div className="grid md:grid-cols-2 gap-2.5">
                <Row icon={Building2} label="Scheme Type" value={schemeLabel} />
                <Row icon={FileText} label="Subcategory" value={subLabel} />
                <Row icon={Receipt} label="Scheme Name" value={welfare.scheme_name} />
                <Row icon={Hash} label="Application ID" value={welfare.application_id} />
                <Row icon={Clock} label="Pending" value={welfare.months_pending} />
                <Row icon={Building2} label="Routed Dept" value={welfare.department} />
              </div>
            </section>

            {(welfare.voice_note_url || welfare.voice_transcript) && (
              <section className="border-t pt-4">
                <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                  VOICE NOTE
                  <Badge variant="secondary" className="text-[10px]">🎙 AI transcribed</Badge>
                </div>
                {welfare.voice_note_url && <audio controls src={welfare.voice_note_url} className="w-full mb-2" />}
                {welfare.voice_transcript && <p className="text-xs italic bg-muted/30 rounded p-2 whitespace-pre-wrap">"{welfare.voice_transcript}"</p>}
              </section>
            )}

            {welfare.proof_urls?.length > 0 && (
              <section className="border-t pt-4">
                <div className="text-xs font-semibold text-muted-foreground mb-2">CITIZEN PROOF ({welfare.proof_urls.length})</div>
                <div className="grid grid-cols-3 gap-2">
                  {welfare.proof_urls.map((u: string, i: number) => (
                    <button key={i} type="button" onClick={() => setPreview(u)} className="rounded overflow-hidden border hover:border-primary">
                      <img src={u} alt="" className="w-full h-24 object-cover" />
                    </button>
                  ))}
                </div>
              </section>
            )}
          </TabsContent>

          <TabsContent value="voice" className="px-5 py-5 mt-0 space-y-3">
            {welfare.voice_note_url ? (
              <>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" /> Voice note attached
                </div>
                <audio controls src={welfare.voice_note_url} className="w-full" />
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline" className="h-7 text-[11px]">
                    <a href={welfare.voice_note_url} target="_blank" rel="noreferrer">Open in new tab</a>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="h-7 text-[11px]">
                    <a href={welfare.voice_note_url} download>Download audio</a>
                  </Button>
                </div>
                {welfare.voice_transcript ? (
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">AI transcript</div>
                    <p className="text-sm italic bg-muted/30 rounded p-3 whitespace-pre-wrap tamil-safe">"{welfare.voice_transcript}"</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No transcript yet — the AI transcription may still be processing.</p>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-4 space-y-2 text-sm text-amber-900">
                <div className="font-semibold">No voice note attached</div>
                <p className="text-xs">
                  The reporter did not record a voice note when this welfare issue was filed
                  {welfare.is_cadre_filed ? ' (cadre-filed submission).' : '.'} If the citizen or filing cadre
                  intended to attach audio, ask them to re-open the report through the cadre workspace and add a voice
                  note — audio must be uploaded at submission time to be included in tracking exports.
                </p>
                {welfare.voice_transcript && (
                  <div className="mt-2">
                    <div className="text-[10px] uppercase tracking-wide">Transcript on file</div>
                    <p className="italic mt-1 tamil-safe">"{welfare.voice_transcript}"</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>


          <TabsContent value="updates" className="px-5 py-5 mt-0">
            {updates.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">No status updates yet. Action flows through the Workflow tab.</div>
            ) : (
              <ol className="space-y-2">
                {updates.map(u => {
                  const meta = WELFARE_STATUS.find(s => s.id === u.status);
                  return (
                    <li key={u.id} className="bg-muted/30 rounded-lg p-3 text-sm">
                      <div className="flex justify-between gap-2">
                        <Badge className={`text-[10px] ${meta?.color || ''}`}>{meta?.en || u.status}</Badge>
                        <span className="text-[10px] text-muted-foreground">{fmtIST(u.created_at)}</span>
                      </div>
                      {u.note && <p className="mt-1 text-xs italic">"{u.note}"</p>}
                    </li>
                  );
                })}
              </ol>
            )}
          </TabsContent>

          <TabsContent value="notes" className="px-5 py-5 mt-0">
            <ReportInternalNotes kind="welfare" reportId={welfare.id} />
            <FalseCloseControl table="welfare_issues" row={welfare} onDone={() => { onChanged?.(); onClose(); }} />
          </TabsContent>
        </Tabs>
      </DialogContent>
      {preview && <MediaPreviewModal url={preview} onClose={() => setPreview(null)} />}
      {showAssign && <AssignModal kind="welfare" item={welfare} onClose={() => setShowAssign(false)} onAssigned={onChanged} />}
    </Dialog>
  );
};

export default WelfareDetailModal;
