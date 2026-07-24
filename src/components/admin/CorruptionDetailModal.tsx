import React, { useState, useEffect } from 'react';
import { X, MapPin, Clock, Building2, User, Banknote, FileText, Shield, UserPlus } from 'lucide-react';
import AIActionPlanPanel from '@/components/admin/AIActionPlanPanel';
import AssignModal from '@/components/admin/AssignModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DEPARTMENTS } from '@/lib/departments';
import { useLockBodyScroll } from '@/hooks/use-lock-body-scroll';
import MediaPreviewModal from '@/components/MediaPreviewModal';
import { fmtIST } from '@/lib/datetime';
import { isReportClosed, closedBadgeLabel } from '@/lib/reportStatus';
import { Lock } from 'lucide-react';
import CadreFiledBadge from '@/components/CadreFiledBadge';
import AttachmentLink from '@/components/AttachmentLink';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';
import CorruptionInternalNotes from '@/components/admin/CorruptionInternalNotes';
import FalseCloseControl from '@/components/admin/FalseCloseControl';

const STATES = ['submitted', 'under_review', 'verified', 'escalated', 'closed', 'rejected'];

interface Props {
  report: any;
  onClose: () => void;
  onChanged: () => void;
}

const CorruptionDetailModal: React.FC<Props> = ({ report, onClose, onChanged }) => {
  useLockBodyScroll(true);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState(report.status);
  const [showAssign, setShowAssign] = useState(false);
  const [filedBy, setFiledBy] = useState<{ name: string; phone?: string; level?: string } | null>(null);
  useEffect(() => {
    if (report.is_cadre_filed && report.reported_by_cadre_id) {
      supabase.from('cadres').select('name,phone,level').eq('id', report.reported_by_cadre_id).maybeSingle()
        .then(({ data }) => data && setFiledBy(data as any));
    }
  }, [report.id]);
  const locked = isReportClosed({ status }) || status === 'closed';
  const evidence: string[] = report.evidence_urls?.length ? report.evidence_urls : (report.evidence_url ? [report.evidence_url] : []);
  const dep = DEPARTMENTS.find(d => d.id === report.department);
  const translate = useAutoTranslate([{ id: 'd', text: report.description }]);

  const updateStatus = async (s: string) => {
    setStatus(s);
    const { error } = await supabase.from('corruption_reports').update({ status: s }).eq('id', report.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Status updated');
    onChanged();
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/70 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
        <div className="bg-card border border-border rounded-t-2xl md:rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="sticky top-0 bg-card border-b border-border p-4 flex items-start justify-between gap-2 z-10">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-1 mb-1">
                <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{report.ticket_no}</span>
                <Badge variant="outline" className="text-[10px] capitalize">{status.replace(/_/g, ' ')}</Badge>
                {report.incident_type && <Badge variant="secondary" className="text-[10px]">{report.incident_type.replace(/_/g, ' ')}</Badge>}
                {report.is_cadre_filed && <CadreFiledBadge cadreName={filedBy?.name} />}
              </div>
              <h2 className="font-bold text-base md:text-lg break-words inline-flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> Anonymous Corruption Report
              </h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>

          <div className="p-4 space-y-4">
            {report.is_cadre_filed && filedBy && (
              <div className="text-[11px] bg-amber-50 border border-amber-300 rounded p-2 text-amber-900">
                <b>Filed by cadre:</b> {filedBy.name}{filedBy.level ? ` · ${filedBy.level}` : ''}{filedBy.phone ? ` · ${filedBy.phone}` : ''}
              </div>
            )}
            <p className="text-sm whitespace-pre-wrap break-words bg-muted/40 rounded p-3 border tamil-safe">
              {translate('d', report.description)}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-muted/40 rounded p-3 space-y-1.5">
                <div className="font-semibold text-sm mb-1 inline-flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />Location & Office</div>
                {dep && <div><b>Dept:</b> {dep.en}</div>}
                {report.office_location && <div><b>Office:</b> {report.office_location}</div>}
                <div className="inline-flex items-start gap-1"><MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>{[report.area, report.constituency, report.city].filter(Boolean).join(' · ') || '—'}</span>
                </div>
              </div>

              <div className="bg-muted/40 rounded p-3 space-y-1.5">
                <div className="font-semibold text-sm mb-1 inline-flex items-center gap-1"><User className="w-3.5 h-3.5" />Person Involved</div>
                <div><b>Role:</b> {report.person_involved || '—'}</div>
                <div><b>Name:</b> {report.person_name || '—'}</div>
              </div>

              <div className="bg-muted/40 rounded p-3 space-y-1.5">
                <div className="font-semibold text-sm mb-1 inline-flex items-center gap-1"><Banknote className="w-3.5 h-3.5" />Amount</div>
                <div className="text-lg font-bold text-primary">{report.amount_demanded ? `₹${Number(report.amount_demanded).toLocaleString('en-IN')}` : '—'}</div>
              </div>

              <div className="bg-muted/40 rounded p-3 space-y-1.5">
                <div className="font-semibold text-sm mb-1 inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />When</div>
                <div>{report.incident_date || '—'}{report.incident_time ? ` · ${report.incident_time}` : ''}</div>
                <div className="text-[10px] text-muted-foreground">Reported {fmtIST(report.created_at)}</div>
              </div>
            </div>

            {evidence.length > 0 && (
              <div>
                <div className="font-semibold text-sm mb-2 inline-flex items-center gap-1"><FileText className="w-3.5 h-3.5" />Evidence ({evidence.length})</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {evidence.map((url, i) => {
                    const u = url.toLowerCase();
                    const isImg = /\.(png|jpe?g|webp|gif)$/.test(u.split('?')[0]);
                    const isVid = /\.(mp4|webm|mov)$/.test(u.split('?')[0]);
                    return (
                      <button key={i} type="button" onClick={() => setPreview(url)}
                        className="aspect-square rounded border overflow-hidden block bg-muted hover:opacity-80 transition group relative">
                        {isImg && <img src={url} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />}
                        {isVid && <video src={url} className="w-full h-full object-cover" />}
                        {!isImg && !isVid && (
                          <div className="flex flex-col items-center justify-center h-full text-xs text-muted-foreground p-2">
                            <FileText className="w-6 h-6 mb-1" />
                            <span>File #{i + 1}</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <AIActionPlanPanel kind="corruption" id={report.id} initialPlan={report.ai_action_plan} initialAt={report.ai_action_plan_at} autoGenerate={!locked} />

            {locked ? (
              <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-lg p-3 text-sm flex items-center gap-2">
                <Lock className="w-4 h-4" /> {closedBadgeLabel(status)}
              </div>
            ) : (
              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-semibold">Update Status</div>
                  <Button size="sm" variant="outline" onClick={() => setShowAssign(true)} className="h-7 text-[11px]">
                    <UserPlus className="w-3 h-3 mr-1" />Assign
                  </Button>
                </div>
                <Select value={status} onValueChange={updateStatus}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {report.confirmed_good_faith && (
              <div className="text-[11px] text-muted-foreground bg-green-50 border border-green-200 rounded p-2">
                ✓ Reporter confirmed this report is submitted in good faith.
              </div>
            )}

            <CorruptionInternalNotes corruptionId={report.id} />
            <FalseCloseControl table="corruption_reports" row={report} onDone={() => { onChanged(); onClose(); }} />
          </div>
        </div>
      </div>
      {preview && <MediaPreviewModal url={preview} onClose={() => setPreview(null)} />}
      {showAssign && <AssignModal kind="corruption" item={report} onClose={() => setShowAssign(false)} onAssigned={onChanged} />}
    </>
  );
};

export default CorruptionDetailModal;
