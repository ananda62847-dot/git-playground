import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Loader2, UserPlus2, Trash2, Trophy, Star, ListChecks, Users2, ChevronRight, Crown, Shield, Clock, CheckCircle2, AlertTriangle, TrendingUp, Building2, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DEPARTMENTS } from '@/lib/departments';
import { constituenciesByCity as CONSTITUENCIES } from '@/lib/constituencies';

const TEAM_ROLES = [
  { id: 'lead', label: 'Team Lead', icon: Crown, color: 'bg-yellow-500' },
  { id: 'coordinator', label: 'Coordinator', icon: Shield, color: 'bg-blue-500' },
  { id: 'member', label: 'Member', icon: Users2, color: 'bg-muted' },
];

const TeamManagement: React.FC<{ allowedConstituencies?: string[]; isAdmin: boolean }> = ({ allowedConstituencies, isAdmin }) => {
  const [teams, setTeams] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [cadres, setCadres] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name:'', description:'', city:'', constituency:'', department:'' });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const [activeTeam, setActiveTeam] = useState<any | null>(null);
  const [activeMembers, setActiveMembers] = useState<any[]>([]);
  const [activeStats, setActiveStats] = useState<{
    assigned: number; resolved: number; open: number; overdue: number;
    avgResolutionDays: number | null; welfareAssigned: number; welfareResolved: number;
  }>({ assigned: 0, resolved: 0, open: 0, overdue: 0, avgResolutionDays: null, welfareAssigned: 0, welfareResolved: 0 });
  const [ongoing, setOngoing] = useState<any[]>([]);
  const [resolved, setResolved] = useState<any[]>([]);
  const [memberWorkload, setMemberWorkload] = useState<Record<string, { open: number; resolved: number }>>({});
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [pickedCadre, setPickedCadre] = useState('');

  const load = async () => {
    const { data: t } = await supabase.from('teams').select('*').order('created_at', { ascending: false });
    setTeams(t || []);
    if (t?.length) {
      const { data: m } = await supabase.from('team_members').select('team_id').in('team_id', t.map(x => x.id));
      const grouped: Record<string, number> = {};
      (m || []).forEach((row: any) => { grouped[row.team_id] = (grouped[row.team_id] || 0) + 1; });
      setCounts(grouped);
    }
    const { data: c } = await supabase.from('cadres').select('id,name,phone,level,constituency,profile_photo_url').eq('active', true);
    setCadres(c || []);
  };
  useEffect(() => { load(); }, []);

  const openTeam = async (team: any) => {
    setActiveTeam(team);
    setLoadingDetail(true);
    const { data: tm } = await supabase.from('team_members').select('id,cadre_id,role_in_team,added_at').eq('team_id', team.id);
    const ids = (tm || []).map((x: any) => x.cadre_id);
    let withProfile: any[] = [];
    if (ids.length) {
      const { data: cs } = await supabase.from('cadres').select('id,name,phone,level,profile_photo_url,points,stars,resolved_count,rank_tier').in('id', ids);
      const byId = new Map((cs || []).map((c: any) => [c.id, c]));
      withProfile = (tm || []).map((row: any) => ({ ...row, cadre: byId.get(row.cadre_id) }));
    }
    setActiveMembers(withProfile);

    // Problem assignments (team-wide + per-member)
    const [{ data: teamPas }, { data: memberPas }] = await Promise.all([
      supabase.from('problem_assignments').select('problem_id,cadre_id,claimed_by_cadre_id,created_at').eq('team_id', team.id),
      ids.length
        ? supabase.from('problem_assignments').select('problem_id,cadre_id,claimed_by_cadre_id,created_at').in('cadre_id', ids)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const allPas = [...(teamPas || []), ...(memberPas || [])];
    const probIds = Array.from(new Set(allPas.map((p: any) => p.problem_id)));

    // Welfare assignments (team + per-member)
    const [{ data: teamWas }, { data: memberWas }] = await Promise.all([
      supabase.from('welfare_assignments').select('welfare_id,cadre_id').eq('team_id', team.id),
      ids.length
        ? supabase.from('welfare_assignments').select('welfare_id,cadre_id').in('cadre_id', ids)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const welfIds = Array.from(new Set([...(teamWas || []), ...(memberWas || [])].map((w: any) => w.welfare_id)));

    let problems: any[] = [];
    if (probIds.length) {
      const { data: ps } = await supabase
        .from('problems')
        .select('id,ticket_no,title,status,urgency,created_at,updated_at,resolved_at,constituency,area')
        .in('id', probIds)
        .order('updated_at', { ascending: false });
      problems = ps || [];
    }
    let welfare: any[] = [];
    if (welfIds.length) {
      const { data: ws } = await supabase
        .from('welfare_issues')
        .select('id,status')
        .in('id', welfIds);
      welfare = ws || [];
    }

    const isResolved = (s: string) => ['resolved', 'completed', 'citizen_confirmed'].includes(s);
    const resolvedList = problems.filter(p => isResolved(p.status));
    const openList = problems.filter(p => !isResolved(p.status));
    const overdue = openList.filter(p => {
      const days = (Date.now() - new Date(p.created_at).getTime()) / 86400000;
      return days > 7;
    }).length;
    // Avg resolution days
    const durations = resolvedList
      .filter(p => p.resolved_at)
      .map(p => (new Date(p.resolved_at).getTime() - new Date(p.created_at).getTime()) / 86400000);
    const avg = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;

    setActiveStats({
      assigned: problems.length,
      resolved: resolvedList.length,
      open: openList.length,
      overdue,
      avgResolutionDays: avg,
      welfareAssigned: welfare.length,
      welfareResolved: welfare.filter(w => isResolved(w.status)).length,
    });
    setOngoing(openList.slice(0, 8));
    setResolved(resolvedList.slice(0, 8));

    // Per-member workload
    const workload: Record<string, { open: number; resolved: number }> = {};
    for (const id of ids) workload[id] = { open: 0, resolved: 0 };
    const problemById = new Map(problems.map(p => [p.id, p]));
    for (const pa of allPas) {
      const cid = (pa as any).claimed_by_cadre_id || (pa as any).cadre_id;
      if (!cid || !workload[cid]) continue;
      const prob = problemById.get(pa.problem_id);
      if (!prob) continue;
      if (isResolved(prob.status)) workload[cid].resolved += 1;
      else workload[cid].open += 1;
    }
    setMemberWorkload(workload);
    setLoadingDetail(false);
  };

  const submit = async () => {
    if (!form.name) return toast.error('Name required');
    setSaving(true);
    const { error } = await supabase.from('teams').insert({
      name: form.name, description: form.description || null,
      city: form.city || null, constituency: form.constituency || null,
      department: form.department || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Team created'); setOpen(false);
    setForm({ name:'', description:'', city:'', constituency:'', department:'' });
    load();
  };

  const addMember = async () => {
    if (!activeTeam || !pickedCadre) return;
    const { error } = await supabase.from('team_members').insert({ team_id: activeTeam.id, cadre_id: pickedCadre, role_in_team: 'member' });
    if (error) return toast.error(error.message);
    setPickedCadre(''); openTeam(activeTeam); load();
  };

  const removeMember = async (id: string) => {
    await supabase.from('team_members').delete().eq('id', id);
    if (activeTeam) openTeam(activeTeam);
    load();
  };

  const setRole = async (id: string, role: string) => {
    const { error } = await supabase.from('team_members').update({ role_in_team: role }).eq('id', id);
    if (error) return toast.error(error.message);
    if (activeTeam) openTeam(activeTeam);
  };

  // When a team is open, render the dedicated detail page only (replaces the grid)
  if (activeTeam) {
    return (
      <div className="space-y-3">
        <Button variant="outline" size="sm" onClick={() => setActiveTeam(null)}>← Back to teams</Button>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="bg-card border-b border-border p-4 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-bold text-base md:text-lg truncate">{activeTeam.name}</h2>
              <div className="text-[11px] text-muted-foreground truncate">{[activeTeam.constituency, activeTeam.city, DEPARTMENTS.find(d=>d.id===activeTeam.department)?.en].filter(Boolean).join(' · ') || '—'}</div>
            </div>
            <Badge variant={activeTeam.active ? 'default' : 'secondary'} className="text-[10px]">{activeTeam.active ? 'active' : 'inactive'}</Badge>
          </div>

          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
              {[
                { label: 'Members', val: activeMembers.length, icon: Users2, color: 'text-blue-700 bg-blue-100' },
                { label: 'Assigned', val: activeStats.assigned, icon: ListChecks, color: 'text-indigo-700 bg-indigo-100' },
                { label: 'Ongoing', val: activeStats.open, icon: Activity, color: 'text-orange-700 bg-orange-100' },
                { label: 'Resolved', val: activeStats.resolved, icon: CheckCircle2, color: 'text-green-700 bg-green-100' },
                { label: 'Overdue', val: activeStats.overdue, icon: AlertTriangle, color: 'text-red-700 bg-red-100' },
                { label: 'Avg Days', val: activeStats.avgResolutionDays != null ? activeStats.avgResolutionDays.toFixed(1) : '—', icon: Clock, color: 'text-purple-700 bg-purple-100' },
                { label: 'Welfare', val: `${activeStats.welfareResolved}/${activeStats.welfareAssigned}`, icon: Building2, color: 'text-cyan-700 bg-cyan-100' },
                { label: 'Points', val: activeTeam.points || 0, icon: Star, color: 'text-yellow-700 bg-yellow-100' },
              ].map((k, i) => {
                const Icon = k.icon;
                return (
                  <div key={i} className="bg-muted/40 rounded-lg p-2 flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full ${k.color} flex items-center justify-center shrink-0`}><Icon className="w-4 h-4" /></div>
                    <div className="min-w-0"><div className="text-base font-bold leading-none truncate">{k.val}</div><div className="text-[10px] text-muted-foreground">{k.label}</div></div>
                  </div>
                );
              })}
            </div>

            {activeTeam.description && <p className="text-sm text-muted-foreground">{activeTeam.description}</p>}

            <div className="bg-muted/40 rounded-lg p-3">
              <div className="flex justify-between text-xs mb-1"><span className="font-semibold">Resolution rate</span><span>{activeStats.assigned ? Math.round((activeStats.resolved / activeStats.assigned) * 100) : 0}%</span></div>
              <div className="h-2 bg-background rounded-full overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: `${activeStats.assigned ? (activeStats.resolved / activeStats.assigned) * 100 : 0}%` }} />
              </div>
            </div>

            {/* Ongoing reports */}
            <div className="grid md:grid-cols-2 gap-3">
              <div className="bg-muted/40 rounded-lg p-3">
                <div className="font-semibold text-sm mb-2 inline-flex items-center gap-1">
                  <Activity className="w-4 h-4 text-orange-600" />Ongoing reports ({activeStats.open})
                </div>
                {loadingDetail ? <div className="text-xs text-muted-foreground py-3 text-center">Loading…</div>
                : ongoing.length === 0 ? <div className="text-xs text-muted-foreground italic text-center py-3">No open items</div>
                : (
                  <div className="space-y-1.5">
                    {ongoing.map(p => {
                      const days = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000);
                      return (
                        <div key={p.id} className="bg-card border border-border rounded p-2 text-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[10px] bg-muted px-1.5 rounded">{p.ticket_no}</span>
                            <Badge variant="outline" className="text-[9px] uppercase">{p.status}</Badge>
                            {p.urgency && <Badge className={`text-[9px] ${p.urgency === 'critical' || p.urgency === 'high' ? 'bg-red-500' : 'bg-slate-500'} text-white`}>{p.urgency}</Badge>}
                            <span className="text-[10px] text-muted-foreground ml-auto">{days}d</span>
                          </div>
                          <div className="font-medium truncate mt-1">{p.title}</div>
                          {(p.area || p.constituency) && <div className="text-[10px] text-muted-foreground truncate">{[p.area, p.constituency].filter(Boolean).join(' · ')}</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-muted/40 rounded-lg p-3">
                <div className="font-semibold text-sm mb-2 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />Recently resolved ({activeStats.resolved})
                </div>
                {loadingDetail ? <div className="text-xs text-muted-foreground py-3 text-center">Loading…</div>
                : resolved.length === 0 ? <div className="text-xs text-muted-foreground italic text-center py-3">Nothing resolved yet</div>
                : (
                  <div className="space-y-1.5">
                    {resolved.map(p => {
                      const took = p.resolved_at
                        ? Math.floor((new Date(p.resolved_at).getTime() - new Date(p.created_at).getTime()) / 86400000)
                        : null;
                      return (
                        <div key={p.id} className="bg-card border border-border rounded p-2 text-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[10px] bg-muted px-1.5 rounded">{p.ticket_no}</span>
                            <Badge className="text-[9px] bg-green-600 text-white uppercase">{p.status}</Badge>
                            {took != null && <span className="text-[10px] text-muted-foreground ml-auto inline-flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{took}d</span>}
                          </div>
                          <div className="font-medium truncate mt-1">{p.title}</div>
                          {(p.area || p.constituency) && <div className="text-[10px] text-muted-foreground truncate">{[p.area, p.constituency].filter(Boolean).join(' · ')}</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2"><div className="font-semibold text-sm">Members ({activeMembers.length})</div></div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {activeMembers.map(m => {
                  const role = TEAM_ROLES.find(r => r.id === (m.role_in_team || 'member')) || TEAM_ROLES[2];
                  const wl = memberWorkload[m.cadre_id] || { open: 0, resolved: 0 };
                  const total = wl.open + wl.resolved;
                  const rate = total ? Math.round((wl.resolved / total) * 100) : 0;
                  return (
                    <div key={m.id} className="bg-muted/40 rounded-lg p-3 flex flex-col items-center text-center">
                      {m.cadre?.profile_photo_url
                        ? <img src={m.cadre.profile_photo_url} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-primary/30" />
                        : <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">{m.cadre?.name?.[0] || '?'}</div>}
                      <div className="text-sm font-semibold truncate w-full mt-2">{m.cadre?.name}</div>
                      <div className="text-[10px] text-muted-foreground capitalize">{m.cadre?.rank_tier || 'bronze'} · {m.cadre?.points || 0}p</div>
                      <Badge className={`${role.color} text-white text-[10px] mt-1`}>{role.label}</Badge>

                      <div className="grid grid-cols-3 gap-1 w-full mt-2 text-[10px]">
                        <div className="bg-orange-100 text-orange-800 rounded py-0.5"><b>{wl.open}</b><div className="text-[9px]">open</div></div>
                        <div className="bg-green-100 text-green-800 rounded py-0.5"><b>{wl.resolved}</b><div className="text-[9px]">done</div></div>
                        <div className="bg-blue-100 text-blue-800 rounded py-0.5 inline-flex flex-col items-center justify-center"><b>{rate}%</b><div className="text-[9px]">rate</div></div>
                      </div>
                      <div className="flex gap-2 text-[10px] text-muted-foreground mt-1">
                        <span className="inline-flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-yellow-500 text-yellow-500" />{m.cadre?.stars || 0}</span>
                        <span className="inline-flex items-center gap-0.5"><Trophy className="w-2.5 h-2.5 text-emerald-600" />{m.cadre?.resolved_count || 0}</span>
                      </div>

                      <Select value={m.role_in_team || 'member'} onValueChange={(v) => setRole(m.id, v)}>
                        <SelectTrigger className="h-7 text-[11px] mt-2"><SelectValue /></SelectTrigger>
                        <SelectContent position="popper">{TEAM_ROLES.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <button onClick={() => removeMember(m.id)} className="text-[10px] text-red-600 hover:underline mt-1 inline-flex items-center gap-1"><Trash2 className="w-3 h-3" />Remove</button>
                    </div>
                  );
                })}
                {activeMembers.length === 0 && <div className="col-span-full text-xs text-muted-foreground italic text-center py-4">No members yet</div>}
              </div>
            </div>

            <div className="bg-muted/40 rounded-lg p-3">
              <div className="font-semibold text-sm mb-2 inline-flex items-center gap-1"><UserPlus2 className="w-4 h-4" />Add member</div>
              <div className="flex gap-2">
                <Select value={pickedCadre} onValueChange={setPickedCadre}>
                  <SelectTrigger className="h-9 flex-1"><SelectValue placeholder="Choose a cadre…" /></SelectTrigger>
                  <SelectContent position="popper" className="max-h-[60vh]">
                    {cadres.filter(c => !activeMembers.some(m => m.cadre_id === c.id)).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name} · {c.level}{c.constituency ? ` · ${c.constituency}` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={addMember} disabled={!pickedCadre}>Add</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-xs text-muted-foreground">{teams.length} teams</div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" />Create Team</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {teams.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center col-span-full">No teams yet</div>}
        {teams.map(t => (
          <button key={t.id} onClick={() => openTeam(t)} className="bg-card border border-border rounded-lg p-3 text-left hover:shadow-md hover:-translate-y-0.5 transition group">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{t.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">{[t.constituency, t.city, DEPARTMENTS.find(d=>d.id===t.department)?.en].filter(Boolean).join(' · ') || '—'}</div>
              </div>
              <Badge variant={t.active ? 'default' : 'secondary'} className="text-[10px]">{t.active ? 'active' : 'inactive'}</Badge>
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className="inline-flex items-center gap-1"><Users2 className="w-3 h-3 text-muted-foreground" /><b>{counts[t.id] || 0}</b></span>
              <span className="inline-flex items-center gap-1"><Trophy className="w-3 h-3 text-yellow-600" /><b>{t.points || 0}</b></span>
              <span className="inline-flex items-center gap-1"><Star className="w-3 h-3 fill-yellow-500 text-yellow-500" /><b>{t.stars || 0}</b></span>
              <span className="inline-flex items-center gap-1"><ListChecks className="w-3 h-3 text-green-600" /><b>{t.resolved_count || 0}</b></span>
              <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-primary transition" />
            </div>
          </button>
        ))}
      </div>

      {/* Create Team */}
      {open && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-3" onClick={() => setOpen(false)}>
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-5" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3"><h3 className="font-bold">Create Team</h3><Button variant="ghost" size="sm" onClick={() => setOpen(false)}><X className="w-4 h-4" /></Button></div>
            <div className="space-y-3">
              <div><Label>Name *</Label><Input value={form.name} onChange={e => set('name', e.target.value)} /></div>
              <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>City</Label>
                  <Select value={form.city} onValueChange={(v) => { set('city', v); set('constituency',''); }}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="--" /></SelectTrigger>
                    <SelectContent className="max-h-[60vh]">{Object.keys(CONSTITUENCIES).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Constituency</Label>
                  <Select value={form.constituency} onValueChange={(v) => set('constituency', v)} disabled={!form.city}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="--" /></SelectTrigger>
                    <SelectContent className="max-h-[60vh]">{(CONSTITUENCIES[form.city]||[]).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Focus Department</Label>
                <Select value={form.department} onValueChange={(v) => set('department', v)}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="--" /></SelectTrigger>
                  <SelectContent className="max-h-[60vh]">{DEPARTMENTS.map(d => <SelectItem key={d.id} value={d.id}>{d.en}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={submit} disabled={saving} className="w-full">{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Create</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default TeamManagement;
