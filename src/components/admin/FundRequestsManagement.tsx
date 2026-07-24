import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AttachmentLink from '@/components/AttachmentLink';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { HeartPulse, Phone, MapPin, IndianRupee, Clock, FileText, RefreshCw, Filter, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { FUND_CATEGORIES } from '@/components/FundAssistanceForm';
import CadreFiledBadge from '@/components/CadreFiledBadge';
import { fmtIST } from '@/lib/datetime';
import { downloadComplaintPdf } from '@/lib/complaintPdf';
import { downloadTamilComplaintPdf } from '@/lib/tamilComplaintPdf';
import ReportInternalNotes from '@/components/admin/ReportInternalNotes';
import FalseCloseControl from '@/components/admin/FalseCloseControl';

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  disbursed: 'bg-green-600 text-white',
  rejected: 'bg-rose-100 text-rose-700',
};
const STATUS_OPTIONS = ['submitted', 'under_review', 'approved', 'disbursed', 'rejected'];

const FundRequestsManagement: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [detail, setDetail] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('fund_assistance_requests').select('*, cadres!fund_assistance_requests_filed_by_cadre_id_fkey(name)').is('deleted_at', null).order('created_at', { ascending: false }).limit(500);
    if (error) toast.error(error.message);
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r =>
    (statusFilter === 'all' || r.status === statusFilter) &&
    (categoryFilter === 'all' || r.category === categoryFilter)
  );

  const catLabel = (id: string) => FUND_CATEGORIES.find(c => c.id === id)?.label || id;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <HeartPulse className="w-5 h-5 text-red-600" />
        <h2 className="font-bold text-lg">Fund Assistance Requests</h2>
        <Badge variant="outline" className="text-xs">{filtered.length}</Badge>
        <div className="ml-auto flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {FUND_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-3 h-3 mr-1" />Refresh</Button>
        </div>
      </div>

      {loading ? <div className="text-sm text-muted-foreground py-10 text-center">Loading…</div> :
        filtered.length === 0 ? <div className="text-sm text-muted-foreground py-10 text-center">No fund requests</div> :
        <div className="grid gap-2">
          {filtered.map(r => (
            <div key={r.id} onClick={() => setDetail(r)}
              className="bg-card border rounded-lg p-3 cursor-pointer hover:border-primary transition-colors">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{r.ticket_no}</span>
                  <Badge className={`text-[10px] ${STATUS_COLORS[r.status] || 'bg-muted'}`}>{r.status.replace('_', ' ')}</Badge>
                  <Badge variant="outline" className="text-[10px]">{catLabel(r.category)}</Badge>
                  {r.urgency === 'critical' && <Badge className="bg-red-600 text-white text-[10px]">CRITICAL</Badge>}
                  {r.is_cadre_filed && <CadreFiledBadge cadreName={r.cadres?.name} />}
                </div>
                <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1"><Clock className="w-3 h-3" />{fmtIST(r.created_at)}</span>
              </div>
              <div className="mt-2 font-semibold text-sm">{r.beneficiary_name}{r.beneficiary_age ? ` · ${r.beneficiary_age}y` : ''}</div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.purpose}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{r.beneficiary_phone}</span>
                {r.constituency && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{r.constituency}</span>}
                {r.amount_requested && <span className="inline-flex items-center gap-1 font-semibold text-foreground"><IndianRupee className="w-3 h-3" />{Number(r.amount_requested).toLocaleString('en-IN')}</span>}
              </div>
            </div>
          ))}
        </div>
      }

      {detail && <FundDetailModal request={detail} onClose={() => setDetail(null)} onChanged={load} />}
    </div>
  );
};

const FundDetailModal: React.FC<{ request: any; onClose: () => void; onChanged: () => void }> = ({ request, onClose, onChanged }) => {
  const [status, setStatus] = useState(request.status);
  const [notes, setNotes] = useState(request.admin_notes || '');
  const [disbursed, setDisbursed] = useState(request.disbursed_amount?.toString() || '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const patch: any = { status, admin_notes: notes || null };
    if (status === 'disbursed') {
      patch.disbursed_amount = disbursed ? Number(disbursed) : null;
      patch.disbursed_at = new Date().toISOString();
    }
    const { error } = await supabase.from('fund_assistance_requests').update(patch).eq('id', request.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Updated');
    onChanged(); onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{request.ticket_no}</span>
            <span className="flex-1 min-w-0">{request.beneficiary_name}</span>
            <Button
              size="sm" variant="outline" className="h-7 text-[11px] ml-auto"
              onClick={async () => {
                try {
                  await downloadComplaintPdf({
                    ticket_no: request.ticket_no,
                    submitted_at: new Date(request.created_at),
                    status: request.status,
                    citizen: {
                      name: request.beneficiary_name, phone: request.beneficiary_phone, age: request.beneficiary_age,
                      constituency: request.constituency, city: request.city,
                    },
                    complaint: {
                      department: 'fund_assistance', department_label: 'Fund Assistance',
                      category: request.category, category_label: FUND_CATEGORIES.find(c => c.id === request.category)?.label || request.category,
                      urgency: request.urgency, title: `Assistance request: ${FUND_CATEGORIES.find(c => c.id === request.category)?.label || request.category}`,
                      description: request.purpose,
                    },
                    evidence_count: request.supporting_docs?.length || 0,
                  });
                } catch (e: any) { toast.error(e?.message || 'PDF failed'); }
              }}
            >
              <FileDown className="w-3 h-3 mr-1" />PDF
            </Button>
            <Button
              size="sm" variant="outline" className="h-7 text-[11px] ml-1"
              onClick={() => downloadTamilComplaintPdf('fund', request.id, request.ticket_no)}
            >
              <FileDown className="w-3 h-3 mr-1" />தமிழ்
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <Card><CardContent className="p-3 space-y-1 text-xs">
            <div><b>Category:</b> {FUND_CATEGORIES.find(c => c.id === request.category)?.label}</div>
            <div><b>Age:</b> {request.beneficiary_age || '—'}</div>
            <div><b>Phone:</b> <a href={`tel:${request.beneficiary_phone}`} className="text-primary">{request.beneficiary_phone}</a></div>
            <div><b>Address:</b> {request.beneficiary_address || '—'}</div>
            <div><b>Location:</b> {[request.constituency, request.city].filter(Boolean).join(' · ') || '—'}</div>
            <div><b>Amount requested:</b> ₹{request.amount_requested ? Number(request.amount_requested).toLocaleString('en-IN') : '—'}</div>
            <div><b>Urgency:</b> {request.urgency}</div>
            <div><b>Submitted:</b> {fmtIST(request.created_at)}</div>
          </CardContent></Card>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold mb-1">Purpose</div>
            <p className="whitespace-pre-wrap text-sm bg-muted/40 rounded p-2">{request.purpose}</p>
          </div>
          {request.bank_details && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold mb-1">Bank details</div>
              <p className="whitespace-pre-wrap text-xs bg-muted/40 rounded p-2 font-mono">{request.bank_details}</p>
            </div>
          )}
          {request.supporting_docs?.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold mb-1">Supporting documents</div>
              <div className="grid grid-cols-3 gap-2">
                {request.supporting_docs.map((u: string, i: number) => (
                  <AttachmentLink key={i} url={u}
                    className="border rounded overflow-hidden flex items-center justify-center bg-muted h-24 w-full">
                    {/\.(jpe?g|png|webp|gif)$/i.test(u)
                      ? <img src={u} className="w-full h-full object-cover" alt="doc" />
                      : <FileText className="w-6 h-6" />}
                  </AttachmentLink>
                ))}
              </div>
            </div>
          )}
          <div className="border-t pt-3 space-y-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Review</div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}</SelectContent>
            </Select>
            {status === 'disbursed' && (
              <Input type="number" placeholder="Disbursed amount (₹)" value={disbursed} onChange={e => setDisbursed(e.target.value)} />
            )}
            <Textarea rows={3} placeholder="Admin notes (visible to admins only)" value={notes} onChange={e => setNotes(e.target.value)} />
            <Button onClick={save} disabled={busy} className="w-full">{busy ? 'Saving…' : 'Save review'}</Button>
          </div>
          <ReportInternalNotes kind="fund" reportId={request.id} />
          <FalseCloseControl table="fund_assistance_requests" row={request} onDone={() => { onChanged(); onClose(); }} />
        </div>
      </DialogContent>
    </Dialog>
  );
};


export default FundRequestsManagement;