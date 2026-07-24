import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DEPARTMENTS, STATUS_STAGES } from '@/lib/departments';
import { Search, RefreshCw, ExternalLink, MapPin, Phone, Clock, UserCheck, LayoutGrid, List, ImageOff } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import AssignProblemModal from './AssignProblemModal';
import ProblemDetailModal from './ProblemDetailModal';
import CadreFiledBadge from '@/components/CadreFiledBadge';
import BulkExtendDeadlinesButton from './BulkExtendDeadlinesButton';

interface Props { allowedConstituencies?: string[]; isAdmin: boolean; }

const ProblemsManagement: React.FC<Props> = ({ allowedConstituencies, isAdmin }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('all');
  const [status, setStatus] = useState('all');
  const [urgency, setUrgency] = useState('all');
  const [assignFor, setAssignFor] = useState<any>(null);
  const [detailFor, setDetailFor] = useState<any>(null);
  const [claims, setClaims] = useState<Record<string, any>>({});
  const [media, setMedia] = useState<Record<string, string>>({});
  const [view, setView] = useState<'list' | 'grid'>(() => (localStorage.getItem('tvk:problems-view') as 'list' | 'grid') || 'list');
  useEffect(() => { localStorage.setItem('tvk:problems-view', view); }, [view]);
  const VIEWED_KEY = 'tvk:viewed-problems';
  const [viewed, setViewed] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(VIEWED_KEY) || '[]')); } catch { return new Set(); }
  });
  const markViewed = (id: string) => {
    setViewed(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev); next.add(id);
      try { localStorage.setItem(VIEWED_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  };
  const openDetail = (p: any) => { setDetailFor(p); markViewed(p.id); };

  const formatIST = (value: string) => new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata',
  }).format(new Date(value));

  const load = async () => {
    setLoading(true);
    let q = supabase.from('problems').select('*').is('deleted_at', null).order('created_at', { ascending: false }).limit(500);
    if (!isAdmin && allowedConstituencies?.length) q = q.in('constituency', allowedConstituencies);
    const { data } = await q;
    setRows(data || []);
    const ids = (data || []).map((p: any) => p.id);
    if (ids.length) {
      const { data: assignmentRows } = await (supabase.from('problem_assignments' as any) as any)
        .select('problem_id,claimed_at,estimated_completion_at,claimed_by_cadre_id')
        .in('problem_id', ids)
        .not('claimed_by_cadre_id', 'is', null)
        .order('claimed_at', { ascending: false });
      const next: Record<string, any> = {};
      (assignmentRows || []).forEach((row: any) => { if (!next[row.problem_id]) next[row.problem_id] = row; });
      setClaims(next);
      const { data: mediaRows } = await supabase
        .from('problem_media')
        .select('problem_id,url,media_type,created_at')
        .in('problem_id', ids)
        .eq('is_after_proof', false)
        .order('created_at', { ascending: true });
      const mm: Record<string, string> = {};
      (mediaRows || []).forEach((m: any) => {
        if (mm[m.problem_id]) return;
        if (m.media_type && !String(m.media_type).startsWith('image')) return;
        mm[m.problem_id] = m.url;
      });
      setMedia(mm);
    } else { setClaims({}); setMedia({}); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const ch = supabase.channel('admin-problems').on('postgres_changes', { event: '*', schema: 'public', table: 'problems' }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => rows.filter(r =>
    (dept === 'all' || r.department === dept) &&
    (status === 'all' || r.status === status) &&
    (urgency === 'all' || r.urgency === urgency) &&
    (!search || `${r.ticket_no} ${r.title} ${r.reporter_name} ${r.constituency} ${r.area}`.toLowerCase().includes(search.toLowerCase()))
  ), [rows, dept, status, urgency, search]);

  const updateStatus = async (id: string, newStatus: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    const updates: any = { status: newStatus };
    if (newStatus === 'completed') updates.resolved_at = new Date().toISOString();
    const { error } = await supabase.from('problems').update(updates).eq('id', id);
    if (error) { toast.error(error.message); load(); return; }
    await supabase.from('problem_updates').insert({ problem_id: id, status: newStatus, note: `Status → ${newStatus}` });
    // Fire SMS + email notifications (non-blocking)
    const { notifyStatusChange } = await import('@/lib/notify');
    notifyStatusChange(id, newStatus);
    // Push notification to assigned cadres + constituency/department admins
    const prob = rows.find(r => r.id === id);
    if (prob) {
      const { sendPush, pushToCadre, pushToTeam } = await import('@/lib/push');
      const niceStatus = newStatus.replace(/_/g, ' ');
      const payload = {
        title: `Status: ${niceStatus} · ${prob.ticket_no}`,
        body: prob.title,
        severity: 'info' as const,
        type: 'status_change',
        url: '/admin/dashboard',
      };
      if (prob.constituency) sendPush({ ...payload, target: { role: 'constituency_admin', constituency: prob.constituency } });
      if (prob.department) sendPush({ ...payload, target: { role: 'department_admin', department: prob.department } });
      // Notify assignees
      const { data: assigns } = await supabase.from('problem_assignments').select('cadre_id,claimed_by_cadre_id,team_id').eq('problem_id', id).eq('active', true);
      (assigns || []).forEach((a: any) => {
        if (a.claimed_by_cadre_id) pushToCadre(a.claimed_by_cadre_id, payload);
        else if (a.cadre_id) pushToCadre(a.cadre_id, payload);
        if (a.team_id) pushToTeam(a.team_id, payload);
      });
    }
    toast.success('Updated');
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 absolute left-2 top-2.5 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="Search ticket / name / area" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={dept} onChange={e => setDept(e.target.value)} className="h-9 px-2 rounded border border-input bg-background text-sm">
          <option value="all">All Depts</option>
          {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.en}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} className="h-9 px-2 rounded border border-input bg-background text-sm">
          <option value="all">All Stages</option>
          {STATUS_STAGES.map(s => <option key={s.id} value={s.id}>{s.en}</option>)}
        </select>
        <select value={urgency} onChange={e => setUrgency(e.target.value)} className="h-9 px-2 rounded border border-input bg-background text-sm">
          <option value="all">All Urgency</option>
          {['low','medium','high','emergency'].map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-4 h-4 mr-1" />Refresh</Button>
        {isAdmin && <BulkExtendDeadlinesButton />}
        <div className="inline-flex rounded-md border border-input overflow-hidden ml-auto">
          <button
            type="button"
            onClick={() => setView('list')}
            className={`h-9 px-2 inline-flex items-center text-xs ${view === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
            title="List view"
          ><List className="w-4 h-4" /></button>
          <button
            type="button"
            onClick={() => setView('grid')}
            className={`h-9 px-2 inline-flex items-center text-xs ${view === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
            title="Grid view"
          ><LayoutGrid className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">{filtered.length} problems · live updating</div>

      <div className={view === 'grid' ? 'grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid gap-2'}>
        {loading ? <div className="text-center py-10 text-sm text-muted-foreground">Loading…</div> :
          filtered.length === 0 ? <div className="text-center py-10 text-sm text-muted-foreground">No problems found</div> :
          filtered.map(p => {
            const stage = STATUS_STAGES.find(s => s.id === p.status);
            const dep = DEPARTMENTS.find(d => d.id === p.department);
            const claim = claims[p.id];
            const isDone = p.status === 'completed' || p.status === 'citizen_confirmed' || p.status === 'closed';
            const isUnviewed = p.status === 'reported' && !viewed.has(p.id);
            const imgUrl = media[p.id];

            if (view === 'grid') {
              return (
                <div
                  key={p.id}
                  onClick={() => openDetail(p)}
                  className={`relative border rounded-lg overflow-hidden cursor-pointer transition-colors flex flex-col ${
                    isDone
                      ? 'bg-card/50 border-border opacity-70 hover:opacity-100'
                      : isUnviewed
                        ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 hover:border-blue-500'
                        : 'bg-card border-border hover:border-primary'
                  }`}
                >
                  <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
                    {imgUrl ? (
                      <img src={imgUrl} alt={p.title} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <ImageOff className="w-8 h-8 text-muted-foreground" />
                    )}
                    {isUnviewed && !isDone && (
                      <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-600 text-white px-1.5 py-0.5 rounded-full animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-white" /> NEW
                      </span>
                    )}
                    {p.urgency === 'emergency' && (
                      <span className="absolute top-1.5 right-1.5 text-[10px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded">EMERGENCY</span>
                    )}
                  {p.is_cadre_filed && (
                    <div className="absolute bottom-1.5 left-1.5"><CadreFiledBadge compact /></div>
                  )}
                  </div>
                  <div className="p-2.5 flex flex-col gap-1.5 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">{p.ticket_no}</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0">{dep?.icon}</Badge>
                      <Badge className={`text-[9px] px-1 py-0 ${stage?.color}`} variant="outline">{stage?.en}</Badge>
                    </div>
                    <h3 className="font-semibold text-sm line-clamp-2 break-words">{p.title}</h3>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 break-words">{p.description}</p>
                    <div className="text-[10px] text-muted-foreground inline-flex items-center gap-1 mt-auto">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{[p.area, p.constituency].filter(Boolean).join(' · ')}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 shrink-0" />{formatIST(p.created_at)}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={p.id}
                className={`relative border rounded-lg p-3 md:p-4 cursor-pointer transition-colors ${
                  isDone
                    ? 'bg-card/50 border-border opacity-60 hover:opacity-100'
                    : isUnviewed
                      ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 hover:border-blue-500 ring-1 ring-blue-300/40'
                      : 'bg-card border-border hover:border-primary'
                }`}
                onClick={() => openDetail(p)}
              >
                <div className="flex flex-wrap items-start gap-2 mb-2">
                  {isUnviewed && !isDone && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-600 text-white px-1.5 py-0.5 rounded-full animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" /> NEW
                    </span>
                  )}
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{p.ticket_no}</span>
                  <Badge variant="outline" className="text-[10px]">{dep?.icon} {dep?.en}</Badge>
                  <Badge className={`text-[10px] ${stage?.color}`} variant="outline">{stage?.en}</Badge>
                  {claim && <Badge className="bg-green-600 text-white text-[10px]">Claimed</Badge>}
                  {p.urgency === 'emergency' && <Badge className="bg-red-600 text-white text-[10px]">EMERGENCY</Badge>}
                  {p.urgency === 'high' && <Badge className="bg-orange-500 text-white text-[10px]">High</Badge>}
                  {p.is_cadre_filed && <CadreFiledBadge />}
                  <span className="text-[11px] text-muted-foreground ml-auto inline-flex items-center gap-1"><Clock className="w-3 h-3" />{formatIST(p.created_at)}</span>
                </div>
                <div className="flex gap-3">
                  {imgUrl && (
                    <img src={imgUrl} alt="" loading="lazy" className="w-20 h-20 md:w-24 md:h-24 object-cover rounded border shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm md:text-base break-words">{p.title}</h3>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1 line-clamp-2 break-words">{p.description}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{[p.area, p.constituency, p.city].filter(Boolean).join(' · ')}</span>
                      <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{p.reporter_name} · {p.reporter_phone}</span>
                      {p.support_count > 1 && <span className="text-primary font-semibold">+{p.support_count - 1} supporters</span>}
                      {claim?.estimated_completion_at && <span className="inline-flex items-center gap-1 text-primary font-semibold"><Clock className="w-3 h-3" />ETA {formatIST(claim.estimated_completion_at)}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3" onClick={e => e.stopPropagation()}>
                  <Select value={p.status} onValueChange={(v) => updateStatus(p.id, v)}>
                    <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS_STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.en}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={() => setAssignFor(p)}><UserCheck className="w-3 h-3 mr-1" />Assign</Button>
                  <a href={`/track?t=${p.ticket_no}`} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="ghost"><ExternalLink className="w-3 h-3 mr-1" />Public</Button>
                  </a>
                </div>
              </div>
            );
          })
        }
      </div>
      {assignFor && <AssignProblemModal problem={assignFor} onClose={() => setAssignFor(null)} />}
      {detailFor && <ProblemDetailModal problem={detailFor} onClose={() => setDetailFor(null)} />}
    </div>
  );
};
export default ProblemsManagement;
