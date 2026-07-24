import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Building2, Search, AlertTriangle, LayoutGrid, List } from 'lucide-react';
import { WELFARE_SCHEMES, WELFARE_STATUS } from '@/lib/welfareSchemes';
import WelfareDetailModal from './WelfareDetailModal';
import CadreFiledBadge from '@/components/CadreFiledBadge';

interface Props {
  /** undefined = super admin (all). string[] = constituency scope. {department} = department scope. */
  scope?: { allowedConstituencies?: string[]; department?: string };
  canEdit?: boolean;
  /** When provided, only show welfare rows whose id is in this list. Empty array => show nothing. */
  idsFilter?: string[] | null;
}

const WelfareManagement: React.FC<Props> = ({ scope, canEdit = true, idsFilter }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [schemeFilter, setSchemeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [open, setOpen] = useState<any>(null);
  const [view, setView] = useState<'list' | 'grid'>(() => (localStorage.getItem('welfView') as any) || 'list');
  useEffect(() => { localStorage.setItem('welfView', view); }, [view]);

  const load = async () => {
    setLoading(true);
    if (idsFilter && idsFilter.length === 0) { setRows([]); setLoading(false); return; }
    let q = supabase.from('welfare_issues').select('*').is('deleted_at', null).order('created_at', { ascending: false }).limit(1000);
    if (scope?.allowedConstituencies?.length) q = q.in('constituency', scope.allowedConstituencies);
    if (scope?.department) q = q.eq('department', scope.department);
    if (idsFilter && idsFilter.length) q = q.in('id', idsFilter);
    const { data } = await q;
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [scope?.department, (scope?.allowedConstituencies || []).join(','), (idsFilter || []).join(',')]);

  const filtered = useMemo(() => rows.filter(r => {
    if (schemeFilter !== 'all' && r.scheme_type !== schemeFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search) {
      const t = search.toLowerCase();
      return r.ticket_no.toLowerCase().includes(t)
        || r.title?.toLowerCase().includes(t)
        || r.reporter_name?.toLowerCase().includes(t)
        || r.reporter_phone?.includes(t);
    }
    return true;
  }), [rows, search, schemeFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = rows.length;
    const open = rows.filter(r => !['resolved', 'citizen_confirmed'].includes(r.status)).length;
    const resolved = total - open;
    const pending30 = rows.filter(r => {
      if (['resolved', 'citizen_confirmed'].includes(r.status)) return false;
      const days = (Date.now() - new Date(r.created_at).getTime()) / 86400000;
      return days > 30;
    }).length;
    const emergency = rows.filter(r => r.urgency === 'emergency').length;
    return { total, open, resolved, pending30, emergency };
  }, [rows]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          { l: 'Total Welfare', v: stats.total, c: 'bg-blue-100 text-blue-700' },
          { l: 'Open', v: stats.open, c: 'bg-orange-100 text-orange-700' },
          { l: 'Resolved', v: stats.resolved, c: 'bg-green-100 text-green-700' },
          { l: 'Pending >30d', v: stats.pending30, c: 'bg-red-100 text-red-700' },
          { l: 'Emergency', v: stats.emergency, c: 'bg-rose-100 text-rose-700' },
        ].map((k, i) => (
          <Card key={i}><CardContent className="p-3 text-center">
            <div className={`inline-block px-2 py-0.5 rounded text-[10px] mb-1 ${k.c}`}>{k.l}</div>
            <div className="text-xl font-bold">{k.v}</div>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4" />Welfare / Scheme Issues
            <div className="flex items-center bg-muted rounded-md p-0.5 ml-auto">
              <button onClick={() => setView('list')} className={`p-1.5 rounded ${view === 'list' ? 'bg-card shadow' : ''}`} title="List view"><List className="w-3.5 h-3.5" /></button>
              <button onClick={() => setView('grid')} className={`p-1.5 rounded ${view === 'grid' ? 'bg-card shadow' : ''}`} title="Grid view"><LayoutGrid className="w-3.5 h-3.5" /></button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-3 gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Ticket / name / phone" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
            </div>
            <Select value={schemeFilter} onValueChange={setSchemeFilter}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Scheme" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All schemes</SelectItem>
                {WELFARE_SCHEMES.map(s => <SelectItem key={s.id} value={s.id}>{s.icon} {s.en}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {WELFARE_STATUS.map(s => <SelectItem key={s.id} value={s.id}>{s.en}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading && <div className="text-center text-xs text-muted-foreground py-6">Loading…</div>}
          {!loading && filtered.length === 0 && <div className="text-center text-xs text-muted-foreground py-6">No welfare issues</div>}

          <div className={view === 'grid' ? 'grid sm:grid-cols-2 lg:grid-cols-3 gap-2' : 'space-y-2'}>
            {filtered.map(w => {
              const scheme = WELFARE_SCHEMES.find(s => s.id === w.scheme_type);
              const stage = WELFARE_STATUS.find(s => s.id === w.status);
              const days = Math.floor((Date.now() - new Date(w.created_at).getTime()) / 86400000);
              const overdue = days > 30 && !['resolved', 'citizen_confirmed'].includes(w.status);
              return (
                <button key={w.id} type="button" onClick={() => setOpen(w)}
                  className="w-full text-left bg-card border rounded-lg p-3 hover:border-primary transition h-full flex flex-col">
                  <div className="flex flex-wrap gap-1 mb-1 items-center">
                    <span className="font-mono text-[10px] bg-muted px-1.5 rounded">{w.ticket_no}</span>
                    <Badge variant="outline" className="text-[10px]">{scheme?.icon} {scheme?.en}</Badge>
                    <Badge className={`text-[10px] ${stage?.color || ''}`}>{stage?.en || w.status}</Badge>
                    {w.urgency === 'emergency' && <Badge className="bg-red-600 text-white text-[10px]">EMERGENCY</Badge>}
                    {overdue && <Badge className="bg-red-100 text-red-700 text-[10px]"><AlertTriangle className="w-3 h-3 mr-0.5" />{days}d pending</Badge>}
                    {w.is_cadre_filed && <CadreFiledBadge compact />}
                  </div>
                  <div className="font-semibold text-sm break-words flex-1">{w.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-1 break-words">
                    {w.reporter_name} · {w.reporter_phone} · {[w.area, w.constituency, w.city].filter(Boolean).join(' · ')}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {open && <WelfareDetailModal welfare={open} onClose={() => setOpen(null)} canEdit={canEdit} onChanged={load} />}
    </div>
  );
};

export default WelfareManagement;
