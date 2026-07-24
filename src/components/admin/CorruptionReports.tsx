import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DEPARTMENTS } from '@/lib/departments';
import { Shield, RefreshCw, Image as ImageIcon, LayoutGrid, List, Search } from 'lucide-react';
import { toast } from 'sonner';
import CorruptionDetailModal from './CorruptionDetailModal';
import { fmtISTDate } from '@/lib/datetime';
import CadreFiledBadge from '@/components/CadreFiledBadge';

const STATUS_STYLES: Record<string, string> = {
  submitted: 'bg-slate-100 text-slate-700 border-slate-300',
  under_review: 'bg-amber-100 text-amber-800 border-amber-300',
  verified: 'bg-blue-100 text-blue-700 border-blue-300',
  escalated: 'bg-purple-100 text-purple-700 border-purple-300',
  closed: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  rejected: 'bg-rose-100 text-rose-700 border-rose-300',
};

const statusBadge = (s: string) => STATUS_STYLES[s] || 'bg-muted text-foreground';

const CorruptionReports: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<any>(null);
  const [view, setView] = useState<'list' | 'grid'>(() => (localStorage.getItem('corrView') as any) || 'list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('corruption_reports').select('*').is('deleted_at', null).order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    setRows(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  useEffect(() => { localStorage.setItem('corrView', view); }, [view]);

  const filtered = useMemo(() => rows.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search) {
      const t = search.toLowerCase();
      return r.ticket_no?.toLowerCase().includes(t) || r.description?.toLowerCase().includes(t)
        || r.area?.toLowerCase().includes(t) || r.constituency?.toLowerCase().includes(t);
    }
    return true;
  }), [rows, search, statusFilter]);

  const renderCard = (r: any) => {
    const evCount = (r.evidence_urls?.length || (r.evidence_url ? 1 : 0));
    const depName = DEPARTMENTS.find(d => d.id === r.department)?.en || r.department;
    return (
      <button key={r.id} onClick={() => setOpen(r)}
        className="w-full text-left bg-card border border-border rounded-lg p-3 hover:border-primary transition-colors h-full flex flex-col">
        <div className="flex flex-wrap gap-1.5 items-center mb-1.5">
          <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">{r.ticket_no}</span>
          <Badge variant="outline" className={`text-[10px] capitalize border ${statusBadge(r.status)}`}>{r.status.replace(/_/g, ' ')}</Badge>
          {depName && <Badge className="text-[10px] bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border border-indigo-200">{depName}</Badge>}
          {evCount > 0 && <Badge className="bg-blue-600 text-white text-[10px]"><ImageIcon className="w-3 h-3 mr-0.5" />{evCount}</Badge>}
          {r.is_cadre_filed && <CadreFiledBadge compact />}
          <span className="text-[10px] text-muted-foreground ml-auto">{fmtISTDate(r.created_at)}</span>
        </div>
        <p className="text-sm line-clamp-2 break-words flex-1">{r.description}</p>
        <div className="text-[11px] text-muted-foreground mt-1.5 flex flex-wrap gap-2">
          {[r.office_location, r.constituency, r.city].filter(Boolean).join(' · ')}
          {r.amount_demanded && <span>· ₹{Number(r.amount_demanded).toLocaleString('en-IN')}</span>}
        </div>
      </button>
    );
  };

  const statuses = Object.keys(STATUS_STYLES);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Shield className="w-5 h-5 text-primary" />
        <h2 className="font-bold">Anonymous Corruption Reports</h2>
        <div className="flex items-center gap-1 ml-auto">
          <div className="flex items-center bg-muted rounded-md p-0.5 mr-1">
            <button onClick={() => setView('list')}
              className={`p-1.5 rounded ${view === 'list' ? 'bg-card shadow' : ''}`} title="List view">
              <List className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setView('grid')}
              className={`p-1.5 rounded ${view === 'grid' ? 'bg-card shadow' : ''}`} title="Grid view">
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Ticket / description / area" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="h-9 rounded border border-input bg-background px-2 text-sm capitalize">
          <option value="all">All statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {loading ? <div className="text-sm text-muted-foreground text-center py-6">Loading…</div> :
       filtered.length === 0 ? <div className="text-sm text-muted-foreground text-center py-6">No reports</div> :
       view === 'grid' ? (
         <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">{filtered.map(renderCard)}</div>
       ) : (
         <div className="space-y-2">{filtered.map(renderCard)}</div>
       )}

      {open && <CorruptionDetailModal report={open} onClose={() => setOpen(null)} onChanged={load} />}
    </div>
  );
};
export default CorruptionReports;
