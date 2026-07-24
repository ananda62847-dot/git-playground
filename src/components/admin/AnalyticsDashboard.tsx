import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Activity, AlertTriangle, CheckCircle2, Clock, Flame, Gauge, ListChecks,
  Radio, Shield, Sparkles, TrendingUp, TrendingDown, Trophy, Users, Users2,
  Zap, Building2, MapPin, FileText, ArrowUpRight, ArrowDownRight, Siren,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';
import { DEPARTMENTS } from '@/lib/departments';
import { fmtISTTime } from '@/lib/datetime';

export type AnalyticsScope =
  | { kind: 'super' }
  | { kind: 'constituency'; constituencies: string[] }
  | { kind: 'department'; department: string };

interface Props { scope: AnalyticsScope }

const RESOLVED = ['resolved', 'completed', 'citizen_confirmed'];
const DEFAULT_SLA_HOURS = 72; // fallback when no sla_targets row matches
const fmt = (n: number) => n.toLocaleString('en-IN');
const hoursBetween = (a: string | Date, b: string | Date = new Date()) =>
  (new Date(b).getTime() - new Date(a).getTime()) / 36e5;

const percentile = (arr: number[], p: number): number => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (s.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (idx - lo);
};

const KpiCard: React.FC<{ label: string; value: React.ReactNode; icon: any; tone?: string; sub?: string; trend?: number }> =
  ({ label, value, icon: Icon, tone = 'text-primary bg-primary/10', sub, trend }) => (
  <Card>
    <CardContent className="p-3 md:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">{label}</div>
          <div className="text-xl md:text-2xl font-bold leading-tight mt-0.5">{value}</div>
          {sub && <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</div>}
        </div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tone}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      {typeof trend === 'number' && (
        <div className={`mt-1 text-[10px] flex items-center gap-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(trend).toFixed(1)}% vs last week
        </div>
      )}
    </CardContent>
  </Card>
);

const SectionTitle: React.FC<{ icon: any; title: string; tone?: string; right?: React.ReactNode }> =
  ({ icon: Icon, title, tone = 'text-primary', right }) => (
  <div className="flex items-center justify-between mb-2 px-0.5">
    <div className="flex items-center gap-2">
      <Icon className={`w-4 h-4 ${tone}`} />
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
    {right}
  </div>
);

const AnalyticsDashboard: React.FC<Props> = ({ scope }) => {
  const [problems, setProblems] = useState<any[]>([]);
  const [escalations, setEscalations] = useState<any[]>([]);
  const [cadres, setCadres] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [feed, setFeed] = useState<Array<{ id: string; kind: string; text: string; ts: string; tone: string }>>([]);
  const [connected, setConnected] = useState(false);
  const [slaTargets, setSlaTargets] = useState<any[]>([]);

  const filterProblems = (q: any) => {
    if (scope.kind === 'constituency' && scope.constituencies.length) q = q.in('constituency', scope.constituencies);
    if (scope.kind === 'department') q = q.eq('department', scope.department);
    return q;
  };

  const load = async () => {
    const { data: probs } = await filterProblems(
      supabase.from('problems').select('*').order('created_at', { ascending: false }).limit(2000)
    );
    setProblems(probs || []);
    const ids = (probs || []).map((p: any) => p.id);

    const [escRes, updRes, survRes] = await Promise.all([
      ids.length ? supabase.from('escalations').select('*').in('problem_id', ids).order('created_at', { ascending: false }).limit(500) : Promise.resolve({ data: [] as any[] }),
      ids.length ? supabase.from('problem_updates').select('*').in('problem_id', ids).order('created_at', { ascending: false }).limit(500) : Promise.resolve({ data: [] as any[] }),
      ids.length ? supabase.from('satisfaction_surveys').select('*').in('problem_id', ids).limit(500) : Promise.resolve({ data: [] as any[] }),
    ]);
    setEscalations(escRes.data || []);
    setUpdates(updRes.data || []);
    setSurveys(survRes.data || []);

    let cadreQ = supabase.from('cadres').select('id,name,constituency,city,points,stars,resolved_count,rank_tier,level,active,profile_photo_url').eq('active', true).order('points', { ascending: false }).limit(200);
    if (scope.kind === 'constituency' && scope.constituencies.length) cadreQ = cadreQ.in('constituency', scope.constituencies);
    const { data: c } = await cadreQ;
    setCadres(c || []);

    let teamQ = supabase.from('teams').select('*').eq('active', true).order('points', { ascending: false }).limit(100);
    if (scope.kind === 'constituency' && scope.constituencies.length) teamQ = teamQ.in('constituency', scope.constituencies);
    if (scope.kind === 'department') teamQ = teamQ.eq('department', scope.department);
    const { data: t } = await teamQ;
    setTeams(t || []);

    const { data: sla } = await supabase.from('sla_targets').select('*');
    setSlaTargets(sla || []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [JSON.stringify(scope)]);

  // Resolve target hours for a problem from sla_targets (best match by dept+category+urgency).
  const targetHoursFor = (p: any): number => {
    if (!slaTargets.length) return DEFAULT_SLA_HOURS;
    const matches = slaTargets.filter((s: any) =>
      (!s.department || s.department === p.department) &&
      (!s.category || s.category === p.category) &&
      (!s.urgency || s.urgency === p.urgency)
    );
    if (!matches.length) return DEFAULT_SLA_HOURS;
    // most specific = fewest nulls
    matches.sort((a: any, b: any) => {
      const sa = [a.department, a.category, a.urgency].filter(Boolean).length;
      const sb = [b.department, b.category, b.urgency].filter(Boolean).length;
      return sb - sa;
    });
    return matches[0].hours_to_resolve || DEFAULT_SLA_HOURS;
  };

  // Realtime feed
  useEffect(() => {
    const inScope = (p: any) => {
      if (scope.kind === 'constituency') return scope.constituencies.includes(p.constituency);
      if (scope.kind === 'department') return p.department === scope.department;
      return true;
    };
    const ch = supabase.channel('analytics-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'problems' }, (payload: any) => {
        const p = payload.new || payload.old;
        if (!p || !inScope(p)) return;
        if (payload.eventType === 'INSERT') {
          pushFeed({ id: p.id + ':new', kind: 'report', tone: p.urgency === 'emergency' ? 'text-red-600' : 'text-blue-600',
            text: `${p.urgency === 'emergency' ? '🚨' : '🆕'} ${p.title || 'New report'} — ${p.area || p.constituency || p.city || ''}` });
          setProblems(prev => [p, ...prev].slice(0, 2000));
        } else if (payload.eventType === 'UPDATE') {
          const o = payload.old as any;
          if (RESOLVED.includes(p.status) && !RESOLVED.includes(o?.status)) {
            pushFeed({ id: p.id + ':res:' + Date.now(), kind: 'resolved', tone: 'text-green-600',
              text: `✅ Resolved — ${p.title || p.ticket_no} (${p.constituency || p.city || ''})` });
          }
          setProblems(prev => prev.map(x => x.id === p.id ? { ...x, ...p } : x));
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'escalations' }, (payload: any) => {
        const e = payload.new;
        pushFeed({ id: e.id, kind: 'esc', tone: 'text-orange-600', text: `⚠️ Escalation → ${e.to_level}: ${e.reason}` });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'problem_assignments' }, (payload: any) => {
        const a = payload.new;
        pushFeed({ id: a.id, kind: 'assign', tone: 'text-violet-600', text: `👷 Assignment created` });
      })
      .subscribe(s => setConnected(s === 'SUBSCRIBED'));
    return () => { supabase.removeChannel(ch); };
  }, [JSON.stringify(scope)]);

  const pushFeed = (item: { id: string; kind: string; text: string; tone: string }) =>
    setFeed(prev => [{ ...item, ts: new Date().toISOString() }, ...prev].slice(0, 30));

  // === Derived metrics ===
  const m = useMemo(() => {
    const now = Date.now();
    const today0 = new Date(); today0.setHours(0, 0, 0, 0);
    const weekAgo = now - 7 * 86400e3;
    const prevWeek = now - 14 * 86400e3;

    const open = problems.filter(p => !RESOLVED.includes(p.status));
    const resolved = problems.filter(p => RESOLVED.includes(p.status));
    const resolvedToday = resolved.filter(p => p.resolved_at && new Date(p.resolved_at) >= today0).length;
    const emergency = problems.filter(p => p.urgency === 'emergency');
    const emergencyOpen = emergency.filter(p => !RESOLVED.includes(p.status));
    const citizenConfirmed = problems.filter(p => p.citizen_confirmed).length;
    const awaitingConfirm = problems.filter(p => p.status === 'completed' && !p.citizen_confirmed).length;
    const repeat = (() => {
      const map = new Map<string, number>();
      problems.forEach(p => { const k = `${p.reporter_phone}|${p.category}`; map.set(k, (map.get(k) || 0) + 1); });
      return Array.from(map.values()).filter(v => v > 1).length;
    })();

    const resTimes = resolved.filter(p => p.resolved_at).map(p => hoursBetween(p.created_at, p.resolved_at));
    const avgRes = resTimes.length ? resTimes.reduce((a, b) => a + b, 0) / resTimes.length : 0;

    // First response: earliest update per problem
    const firstUpd = new Map<string, string>();
    updates.forEach(u => {
      const prev = firstUpd.get(u.problem_id);
      if (!prev || new Date(u.created_at) < new Date(prev)) firstUpd.set(u.problem_id, u.created_at);
    });
    const firstRespTimes = Array.from(firstUpd.entries()).map(([pid, ts]) => {
      const p = problems.find(x => x.id === pid); return p ? hoursBetween(p.created_at, ts) : 0;
    }).filter(v => v > 0);
    const avgFirstResp = firstRespTimes.length ? firstRespTimes.reduce((a, b) => a + b, 0) / firstRespTimes.length : 0;

    // Per-problem SLA from sla_targets
    const slaMet = resolved.filter(p => p.resolved_at && hoursBetween(p.created_at, p.resolved_at) <= targetHoursFor(p)).length;
    const slaRate = resolved.length ? (slaMet / resolved.length) * 100 : 0;
    const medRes = percentile(resTimes, 50);
    const p90Res = percentile(resTimes, 90);
    const medFirst = percentile(firstRespTimes, 50);

    const buckets = { lt12: 0, h24: 0, h48: 0, h72: 0 };
    open.forEach(p => {
      const h = hoursBetween(p.created_at);
      if (h < 12) buckets.lt12++;
      else if (h < 24) buckets.h24++;
      else if (h < 48) buckets.h48++;
      else buckets.h72++;
    });

    const escalationRate = problems.length ? (escalations.length / problems.length) * 100 : 0;

    // Trends (daily reports + resolutions, 14 days)
    const days = Array.from({ length: 14 }).map((_, i) => {
      const d = new Date(now - (13 - i) * 86400e3); d.setHours(0, 0, 0, 0);
      const next = d.getTime() + 86400e3;
      const created = problems.filter(p => { const t = new Date(p.created_at).getTime(); return t >= d.getTime() && t < next; }).length;
      const res = problems.filter(p => p.resolved_at && new Date(p.resolved_at).getTime() >= d.getTime() && new Date(p.resolved_at).getTime() < next).length;
      const emg = problems.filter(p => p.urgency === 'emergency' && new Date(p.created_at).getTime() >= d.getTime() && new Date(p.created_at).getTime() < next).length;
      return { day: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), Reports: created, Resolved: res, Emergency: emg };
    });
    const thisWeekReports = problems.filter(p => new Date(p.created_at).getTime() >= weekAgo).length;
    const lastWeekReports = problems.filter(p => { const t = new Date(p.created_at).getTime(); return t >= prevWeek && t < weekAgo; }).length;
    const reportsTrend = lastWeekReports ? ((thisWeekReports - lastWeekReports) / lastWeekReports) * 100 : 0;

    // Department breakdown
    const deptMap = new Map<string, { dept: string; total: number; open: number; resolved: number; escalated: number; times: number[] }>();
    problems.forEach(p => {
      const k = p.department || 'other';
      const e = deptMap.get(k) || { dept: k, total: 0, open: 0, resolved: 0, escalated: 0, times: [] };
      e.total++;
      if (RESOLVED.includes(p.status)) { e.resolved++; if (p.resolved_at) e.times.push(hoursBetween(p.created_at, p.resolved_at)); }
      else e.open++;
      deptMap.set(k, e);
    });
    escalations.forEach(es => {
      const p = problems.find(x => x.id === es.problem_id); if (!p) return;
      const e = deptMap.get(p.department || 'other'); if (e) e.escalated++;
    });
    const deptRows = Array.from(deptMap.values()).map(d => ({
      ...d,
      avgRes: d.times.length ? d.times.reduce((a, b) => a + b, 0) / d.times.length : 0,
    })).sort((a, b) => b.total - a.total);

    // Constituency leaderboard
    const conMap = new Map<string, { name: string; total: number; resolved: number; pending: number; times: number[] }>();
    problems.forEach(p => {
      const k = p.constituency || 'Unknown';
      const e = conMap.get(k) || { name: k, total: 0, resolved: 0, pending: 0, times: [] };
      e.total++;
      if (RESOLVED.includes(p.status)) { e.resolved++; if (p.resolved_at) e.times.push(hoursBetween(p.created_at, p.resolved_at)); }
      else e.pending++;
      conMap.set(k, e);
    });
    const conRows = Array.from(conMap.values()).map(c => ({
      ...c,
      rate: c.total ? (c.resolved / c.total) * 100 : 0,
      avgRes: c.times.length ? c.times.reduce((a, b) => a + b, 0) / c.times.length : 0,
    })).sort((a, b) => b.rate - a.rate);

    // Pending by department/constituency
    const pendingByDept = deptRows.map(d => ({ name: d.dept, value: d.open })).sort((a, b) => b.value - a.value).slice(0, 8);
    const pendingByCon = conRows.map(c => ({ name: c.name.split(' / ')[0], value: c.pending })).sort((a, b) => b.value - a.value).slice(0, 8);

    // Emergency hotspots
    const emgMap = new Map<string, number>();
    emergencyOpen.forEach(p => { const k = p.area || p.constituency || p.city || 'Unknown'; emgMap.set(k, (emgMap.get(k) || 0) + 1); });
    const emgHotspots = Array.from(emgMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
    const emgResTimes = emergency.filter(p => p.resolved_at).map(p => hoursBetween(p.created_at, p.resolved_at));
    const avgEmgRes = emgResTimes.length ? emgResTimes.reduce((a, b) => a + b, 0) / emgResTimes.length : 0;

    // Cadre perf — load counts from assignments? Use cadres table points/resolved_count
    const cadreLoad = new Map<string, number>();
    updates.forEach(u => { if (u.updated_by) cadreLoad.set(u.updated_by, (cadreLoad.get(u.updated_by) || 0) + 1); });

    const satisfaction = surveys.length ? (surveys.reduce((a, s) => a + (s.rating || 0), 0) / surveys.length) : 0;

    // AI-ish insights
    const insights: Array<{ tone: 'warn' | 'good' | 'info'; text: string }> = [];
    if (reportsTrend > 15) insights.push({ tone: 'warn', text: `Reports increased ${reportsTrend.toFixed(0)}% this week vs last.` });
    if (reportsTrend < -10) insights.push({ tone: 'good', text: `Reports dropped ${Math.abs(reportsTrend).toFixed(0)}% this week — situation improving.` });
    const topDept = deptRows[0]; if (topDept) insights.push({ tone: 'info', text: `${topDept.dept} leads with ${topDept.total} reports (${topDept.open} open).` });
    if (slaRate < 70 && resolved.length > 5) insights.push({ tone: 'warn', text: `SLA success at ${slaRate.toFixed(0)}% — below 70% target.` });
    if (slaRate >= 90 && resolved.length > 5) insights.push({ tone: 'good', text: `Excellent SLA performance: ${slaRate.toFixed(0)}%.` });
    if (emgHotspots[0]) insights.push({ tone: 'warn', text: `Emergency hotspot: ${emgHotspots[0].name} (${emgHotspots[0].value} active).` });
    if (buckets.h72 > 5) insights.push({ tone: 'warn', text: `${buckets.h72} reports pending over 72h — needs intervention.` });

    return {
      total: problems.length, open: open.length, resolved: resolved.length, resolvedToday,
      emergencyOpen: emergencyOpen.length, citizenConfirmed, awaitingConfirm, repeat,
      avgRes, avgFirstResp, medRes, p90Res, medFirst, slaRate, slaMet, buckets, escalationRate,
      days, reportsTrend, thisWeekReports,
      deptRows, conRows, pendingByDept, pendingByCon, emgHotspots, avgEmgRes,
      satisfaction, cadreLoad,
      insights,
    };
  }, [problems, escalations, updates, surveys, slaTargets]);

  const deptLabel = (id: string) => DEPARTMENTS.find(d => d.id === id)?.en || id;
  const showDeptSection = scope.kind !== 'department';
  const showConSection = scope.kind === 'super';

  return (
    <div className="space-y-4">
      {/* 1. OVERVIEW KPIs */}
      <div>
        <SectionTitle icon={Gauge} title="Command Center Snapshot"
          right={<div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/40'}`} />
            {connected ? 'Live' : 'Connecting…'}
          </div>}
        />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          <KpiCard label="Total Reports" value={fmt(m.total)} icon={ListChecks} tone="text-blue-600 bg-blue-100" trend={m.reportsTrend} />
          <KpiCard label="Open Issues" value={fmt(m.open)} icon={AlertTriangle} tone="text-orange-600 bg-orange-100" />
          <KpiCard label="Resolved Today" value={fmt(m.resolvedToday)} icon={CheckCircle2} tone="text-green-600 bg-green-100" />
          <KpiCard label="Emergency Open" value={fmt(m.emergencyOpen)} icon={Siren} tone="text-red-600 bg-red-100" />
          <KpiCard label="Avg Resolution" value={`${m.avgRes.toFixed(1)}h`} icon={Clock} tone="text-violet-600 bg-violet-100" />
          <KpiCard label="SLA Success" value={`${m.slaRate.toFixed(0)}%`} icon={Shield} tone="text-emerald-600 bg-emerald-100" sub={`${m.slaMet}/${m.resolved} within target · med ${m.medRes.toFixed(1)}h · p90 ${m.p90Res.toFixed(1)}h`} />

          <KpiCard label="Active Cadres" value={fmt(cadres.length)} icon={Users} tone="text-indigo-600 bg-indigo-100" />
          <KpiCard label="Active Teams" value={fmt(teams.length)} icon={Users2} tone="text-cyan-600 bg-cyan-100" />
          <KpiCard label="Escalated Cases" value={fmt(escalations.length)} icon={Flame} tone="text-amber-600 bg-amber-100" sub={`${m.escalationRate.toFixed(1)}% rate`} />
          <KpiCard label="Citizen Confirmed" value={`${m.total ? ((m.citizenConfirmed / m.total) * 100).toFixed(0) : 0}%`} icon={CheckCircle2} tone="text-teal-600 bg-teal-100" />
          <KpiCard label="Awaiting Confirm" value={fmt(m.awaitingConfirm)} icon={Clock} tone="text-yellow-600 bg-yellow-100" />
          <KpiCard label="Satisfaction" value={m.satisfaction ? `${m.satisfaction.toFixed(1)}/5` : '—'} icon={Trophy} tone="text-pink-600 bg-pink-100" sub="from surveys" />
        </div>
      </div>

      {/* 2. LIVE OPERATIONS PANEL */}
      <div>
        <SectionTitle icon={Radio} title="Live Operations" tone="text-red-600" />
        <div className="grid lg:grid-cols-3 gap-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-500" />Live Feed</CardTitle></CardHeader>
            <CardContent className="space-y-1.5 max-h-72 overflow-y-auto">
              {feed.length === 0 && <div className="text-xs text-muted-foreground text-center py-6">Listening for live events…</div>}
              {feed.map(f => (
                <div key={f.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/40 text-xs">
                  <div className={`truncate ${f.tone}`}>{f.text}</div>
                  <div className="text-[10px] text-muted-foreground shrink-0">{fmtISTTime(f.ts)}</div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-green-500" />Operational Stats</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                { l: 'Active Cadres', v: cadres.length },
                { l: 'Teams', v: teams.length },
                { l: 'Reports This Week', v: m.thisWeekReports },
                { l: 'Avg First Response', v: `${m.avgFirstResp.toFixed(1)}h` },
                { l: 'Open Escalations', v: escalations.filter(e => e.status === 'open').length },
              ].map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm border-b border-border/40 pb-1.5 last:border-0 last:pb-0">
                  <span className="text-muted-foreground">{r.l}</span>
                  <span className="font-semibold tabular-nums">{r.v}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 3. SLA & RESPONSE */}
      <div>
        <SectionTitle icon={Shield} title="SLA & Response Analysis" tone="text-emerald-600" />
        <div className="grid md:grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">SLA Success (per-category target)</span><span className="font-semibold">{m.slaRate.toFixed(0)}%</span></div>
                <Progress value={m.slaRate} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Citizen Confirmed</span><span className="font-semibold">{m.total ? ((m.citizenConfirmed / m.total) * 100).toFixed(0) : 0}%</span></div>
                <Progress value={m.total ? (m.citizenConfirmed / m.total) * 100 : 0} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Escalation Rate</span><span className="font-semibold">{m.escalationRate.toFixed(1)}%</span></div>
                <Progress value={Math.min(m.escalationRate, 100)} className="h-2" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs font-semibold mb-2">Pending by Age</div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { l: '<12h', v: m.buckets.lt12, c: 'bg-blue-100 text-blue-700' },
                  { l: '12-24h', v: m.buckets.h24, c: 'bg-yellow-100 text-yellow-700' },
                  { l: '24-48h', v: m.buckets.h48, c: 'bg-orange-100 text-orange-700' },
                  { l: '>72h', v: m.buckets.h72, c: 'bg-red-100 text-red-700' },
                ].map((b, i) => (
                  <div key={i} className={`rounded-lg p-3 ${b.c}`}>
                    <div className="text-2xl font-bold">{b.v}</div>
                    <div className="text-[10px] mt-0.5">{b.l}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3 text-center">
                <div><div className="text-lg font-bold">{m.avgFirstResp.toFixed(1)}h</div><div className="text-[10px] text-muted-foreground">Avg First Response</div></div>
                <div><div className="text-lg font-bold">{m.avgRes.toFixed(1)}h</div><div className="text-[10px] text-muted-foreground">Avg Resolution</div></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 4. CONSTITUENCY LEADERBOARD (super only) */}
      {showConSection && m.conRows.length > 0 && (
        <div>
          <SectionTitle icon={Trophy} title="Constituency Leaderboard" tone="text-yellow-600" />
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr><th className="text-left p-2">#</th><th className="text-left p-2">Constituency</th><th className="text-right p-2">Total</th><th className="text-right p-2">Pending</th><th className="text-right p-2">Resolution %</th><th className="text-right p-2">Avg Time</th></tr>
                  </thead>
                  <tbody>
                    {m.conRows.slice(0, 10).map((c, i) => (
                      <tr key={c.name} className="border-t border-border/40">
                        <td className="p-2 font-semibold">{i + 1}</td>
                        <td className="p-2 truncate max-w-[200px]">{c.name}</td>
                        <td className="p-2 text-right tabular-nums">{c.total}</td>
                        <td className="p-2 text-right tabular-nums">{c.pending}</td>
                        <td className={`p-2 text-right tabular-nums font-semibold ${c.rate >= 80 ? 'text-green-600' : c.rate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{c.rate.toFixed(0)}%</td>
                        <td className="p-2 text-right tabular-nums">{c.avgRes ? `${c.avgRes.toFixed(1)}h` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 5. DEPARTMENT PERFORMANCE */}
      {showDeptSection && m.deptRows.length > 0 && (
        <div>
          <SectionTitle icon={Building2} title="Department Performance" tone="text-violet-600" />
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr><th className="text-left p-2">Department</th><th className="text-right p-2">Total</th><th className="text-right p-2">Open</th><th className="text-right p-2">Resolved</th><th className="text-right p-2">Escalated</th><th className="text-right p-2">Avg Time</th></tr>
                  </thead>
                  <tbody>
                    {m.deptRows.map(d => (
                      <tr key={d.dept} className="border-t border-border/40">
                        <td className="p-2 font-medium">{deptLabel(d.dept)}</td>
                        <td className="p-2 text-right tabular-nums">{d.total}</td>
                        <td className="p-2 text-right tabular-nums text-orange-600">{d.open}</td>
                        <td className="p-2 text-right tabular-nums text-green-600">{d.resolved}</td>
                        <td className="p-2 text-right tabular-nums text-red-600">{d.escalated}</td>
                        <td className="p-2 text-right tabular-nums">{d.avgRes ? `${d.avgRes.toFixed(1)}h` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 6. PENDING ANALYSIS */}
      <div>
        <SectionTitle icon={Clock} title="Pending Analysis" tone="text-orange-600" />
        <div className="grid md:grid-cols-2 gap-3">
          {showDeptSection && (
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs">Pending by Department</CardTitle></CardHeader><CardContent className="p-3">
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer><BarChart data={m.pendingByDept.map(d => ({ ...d, name: deptLabel(d.name) }))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="value" fill="hsl(var(--primary))" />
                </BarChart></ResponsiveContainer>
              </div>
            </CardContent></Card>
          )}
          {showConSection && (
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs">Pending by Constituency</CardTitle></CardHeader><CardContent className="p-3">
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer><BarChart data={m.pendingByCon} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="value" fill="#f59e0b" />
                </BarChart></ResponsiveContainer>
              </div>
            </CardContent></Card>
          )}
        </div>
      </div>

      {/* 7. EMERGENCY CONTROL */}
      <div>
        <SectionTitle icon={Siren} title="Emergency Control Panel" tone="text-red-600" />
        <Card className="border-red-200 bg-red-50/40">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div className="text-center"><div className="text-2xl font-bold text-red-600 flex items-center justify-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-red-600 animate-pulse" />{m.emergencyOpen}</div><div className="text-[10px] text-muted-foreground">Active Emergencies</div></div>
              <div className="text-center"><div className="text-2xl font-bold">{m.avgEmgRes ? `${m.avgEmgRes.toFixed(1)}h` : '—'}</div><div className="text-[10px] text-muted-foreground">Avg Emergency Response</div></div>
              <div className="text-center"><div className="text-2xl font-bold">{problems.filter(p => p.urgency === 'emergency').length}</div><div className="text-[10px] text-muted-foreground">Total Emergencies</div></div>
              <div className="text-center"><div className="text-2xl font-bold">{m.emgHotspots.length}</div><div className="text-[10px] text-muted-foreground">Hotspots</div></div>
            </div>
            {m.emgHotspots.length > 0 && (
              <div>
                <div className="text-xs font-semibold mb-1.5">Emergency Hotspots</div>
                <div className="flex flex-wrap gap-1.5">
                  {m.emgHotspots.map(h => (
                    <Badge key={h.name} variant="destructive" className="text-[10px]">{h.name} · {h.value}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 8. CADRE PERFORMANCE */}
      {cadres.length > 0 && (
        <div>
          <SectionTitle icon={Users} title="Cadre Performance" tone="text-indigo-600" />
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr><th className="text-left p-2">Cadre</th><th className="text-left p-2">Constituency</th><th className="text-right p-2">Points</th><th className="text-right p-2">Stars</th><th className="text-right p-2">Resolved</th><th className="text-right p-2">Updates</th></tr>
                  </thead>
                  <tbody>
                    {cadres.slice(0, 10).map(c => (
                      <tr key={c.id} className="border-t border-border/40">
                        <td className="p-2 font-medium truncate max-w-[160px]">{c.name}</td>
                        <td className="p-2 truncate max-w-[140px] text-muted-foreground">{c.constituency || '—'}</td>
                        <td className="p-2 text-right tabular-nums">{c.points}</td>
                        <td className="p-2 text-right tabular-nums">{c.stars}</td>
                        <td className="p-2 text-right tabular-nums text-green-600">{c.resolved_count}</td>
                        <td className="p-2 text-right tabular-nums">{m.cadreLoad.get(c.user_id || '') || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 9. TRENDS */}
      <div>
        <SectionTitle icon={TrendingUp} title="Trend Analytics" tone="text-blue-600" />
        <div className="grid md:grid-cols-2 gap-3">
          <Card><CardHeader className="pb-2"><CardTitle className="text-xs">Reports vs Resolutions (14d)</CardTitle></CardHeader><CardContent className="p-3">
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer><AreaChart data={m.days}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5} /><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#16a34a" stopOpacity={0.5} /><stop offset="95%" stopColor="#16a34a" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" tick={{ fontSize: 9 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Legend wrapperStyle={{ fontSize: 10 }} />
                <Area type="monotone" dataKey="Reports" stroke="hsl(var(--primary))" fill="url(#g1)" />
                <Area type="monotone" dataKey="Resolved" stroke="#16a34a" fill="url(#g2)" />
              </AreaChart></ResponsiveContainer>
            </div>
          </CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-xs">Emergency Trend (14d)</CardTitle></CardHeader><CardContent className="p-3">
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer><LineChart data={m.days}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" tick={{ fontSize: 9 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Line type="monotone" dataKey="Emergency" stroke="#dc2626" strokeWidth={2} dot={false} />
              </LineChart></ResponsiveContainer>
            </div>
          </CardContent></Card>
        </div>
      </div>

      {/* 10. AI INSIGHTS */}
      {m.insights.length > 0 && (
        <div>
          <SectionTitle icon={Sparkles} title="Governance Insights" tone="text-fuchsia-600" />
          <Card><CardContent className="p-3 space-y-2">
            {m.insights.map((ins, i) => (
              <div key={i} className={`flex items-start gap-2 p-2 rounded-md text-xs ${
                ins.tone === 'warn' ? 'bg-orange-50 text-orange-800' : ins.tone === 'good' ? 'bg-green-50 text-green-800' : 'bg-blue-50 text-blue-800'
              }`}>
                <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{ins.text}</span>
              </div>
            ))}
          </CardContent></Card>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
