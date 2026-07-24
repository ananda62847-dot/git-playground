import React, { useMemo, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ArrowUpRight, ArrowDownRight, Download, GitCompare, Sparkles, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';
import { toast } from 'sonner';

interface Props {
  suggestions: any[];
  grievances: any[];
  volunteers: any[];
}

const PRESETS = [
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', days: 30 },
  { id: '90d', label: 'Last 90 days', days: 90 },
];

const TIERS = ['recruit', 'volunteer', 'organizer', 'captain', 'leader', 'commander'];
const COLORS_A = ['#8B0000', '#b91c1c', '#f97316', '#f59e0b', '#84cc16', '#10b981'];
const COLORS_B = ['#1e3a8a', '#1d4ed8', '#0ea5e9', '#06b6d4', '#14b8a6', '#22c55e'];

const SCOPES = [
  { id: 'problems', label: 'Problems', table: 'problems', resolved: ['resolved', 'completed', 'citizen_confirmed'] },
  { id: 'welfare_issues', label: 'Welfare', table: 'welfare_issues', resolved: ['resolved', 'citizen_confirmed', 'closed'] },
  { id: 'corruption_reports', label: 'Corruption', table: 'corruption_reports', resolved: ['closed', 'resolved'] },
];

const ComparisonView: React.FC<Props> = ({ grievances }) => {
  const [scope, setScope] = useState<string>('problems');
  const [dataset, setDataset] = useState<any[]>(grievances || []);
  const [scopeLoading, setScopeLoading] = useState(false);
  const [preset, setPreset] = useState('30d');
  const [groupA, setGroupA] = useState<string>('__all__');
  const [groupB, setGroupB] = useState<string>('__previous_period__');
  const [tier, setTier] = useState<string>('all');
  const [insight, setInsight] = useState<string>('');
  const [insightLoading, setInsightLoading] = useState(false);

  const currentScope = SCOPES.find(s => s.id === scope)!;
  const grievancesData = dataset;

  // Load dataset when scope changes
  useEffect(() => {
    if (scope === 'problems' && grievances?.length) { setDataset(grievances); return; }
    (async () => {
      setScopeLoading(true);
      const { data } = await supabase.from(currentScope.table as any).select('*').order('created_at', { ascending: false }).limit(2000);
      setDataset((data as any[]) || []);
      setScopeLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  const constituencies = useMemo(
    () => Array.from(new Set(grievancesData.map((g: any) => g.constituency).filter(Boolean))).sort(),
    [grievancesData]
  );

  const days = PRESETS.find(p => p.id === preset)?.days ?? 30;

  const periodA = useMemo(() => {
    const end = endOfDay(new Date());
    const start = startOfDay(subDays(new Date(), days - 1));
    return { start, end };
  }, [days]);

  const periodB = useMemo(() => {
    if (groupB === '__previous_period__') {
      const end = startOfDay(subDays(new Date(), days));
      const start = startOfDay(subDays(new Date(), days * 2 - 1));
      return { start, end };
    }
    return periodA;
  }, [groupB, days, periodA]);

  const filterRows = (constituency: string, range: { start: Date; end: Date }) => {
    return grievancesData.filter((g: any) => {
      const d = new Date(g.created_at);
      if (d < range.start || d > range.end) return false;
      if (constituency !== '__all__' && constituency !== '__previous_period__' && g.constituency !== constituency) return false;
      return true;
    });
  };

  const rowsA = useMemo(() => filterRows(groupA, periodA), [grievancesData, groupA, periodA]);
  const rowsB = useMemo(() => {
    if (groupB === '__previous_period__') return filterRows(groupA, periodB);
    return filterRows(groupB, periodA);
  }, [grievancesData, groupA, groupB, periodA, periodB]);

  const summarize = (rows: any[]) => {
    const resolved = rows.filter(r => currentScope.resolved.includes(r.status)).length;
    const emergency = rows.filter(r => r.urgency === 'emergency').length;
    return {
      total: rows.length,
      resolved,
      pending: rows.length - resolved,
      resolutionRate: rows.length ? Math.round((resolved / rows.length) * 100) : 0,
      emergency,
    };
  };
  const sumA = summarize(rowsA);
  const sumB = summarize(rowsB);

  const dailyData = useMemo(() => {
    const out: any[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const s = startOfDay(d), e = endOfDay(d);
      out.push({
        date: format(d, 'MMM d'),
        A: rowsA.filter(r => new Date(r.created_at) >= s && new Date(r.created_at) <= e).length,
        B: rowsB.filter(r => new Date(r.created_at) >= s && new Date(r.created_at) <= e).length,
      });
    }
    return out;
  }, [rowsA, rowsB, days]);

  const categoryData = useMemo(() => {
    const cats = new Map<string, { name: string; A: number; B: number }>();
    rowsA.forEach(r => {
      const c = r.category || 'other';
      const row = cats.get(c) || { name: c, A: 0, B: 0 };
      row.A++; cats.set(c, row);
    });
    rowsB.forEach(r => {
      const c = r.category || 'other';
      const row = cats.get(c) || { name: c, A: 0, B: 0 };
      row.B++; cats.set(c, row);
    });
    return Array.from(cats.values()).sort((a, b) => (b.A + b.B) - (a.A + a.B)).slice(0, 8);
  }, [rowsA, rowsB]);

  const pieA = useMemo(() => {
    const m: Record<string, number> = {};
    rowsA.forEach(r => { m[r.status] = (m[r.status] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [rowsA]);
  const pieB = useMemo(() => {
    const m: Record<string, number> = {};
    rowsB.forEach(r => { m[r.status] = (m[r.status] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [rowsB]);

  const labelA = groupA === '__all__' ? 'All constituencies (current)' : `${groupA} (current)`;
  const labelB = groupB === '__previous_period__'
    ? `${groupA === '__all__' ? 'All' : groupA} (previous)`
    : `${groupB} (current)`;

  const generateInsight = async () => {
    setInsightLoading(true);
    try {
      const prompt = `Compare two cohorts of citizen grievances and give a 3-sentence insight summary highlighting differences in volume, resolution rate, SLA risk, and category mix. Be specific with numbers.

A — ${labelA}: ${JSON.stringify(sumA)} top categories: ${categoryData.slice(0,3).map(c => `${c.name}(${c.A})`).join(', ')}
B — ${labelB}: ${JSON.stringify(sumB)} top categories: ${categoryData.slice(0,3).map(c => `${c.name}(${c.B})`).join(', ')}`;
      const { data, error } = await supabase.functions.invoke('ai-copilot', {
        body: { message: prompt, history: [] },
      });
      if (error) throw error;
      setInsight(data?.reply || data?.text || JSON.stringify(data));
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate insight');
      setInsight('Insight unavailable. Compare the KPI cards manually.');
    } finally {
      setInsightLoading(false);
    }
  };

  const exportCsv = () => {
    const rows = [['cohort', 'ticket_no', 'created_at', 'status', 'category', 'urgency', 'constituency']];
    rowsA.forEach((r: any) => rows.push(['A', r.ticket_no, r.created_at, r.status, r.category, r.urgency, r.constituency]));
    rowsB.forEach((r: any) => rows.push(['B', r.ticket_no, r.created_at, r.status, r.category, r.urgency, r.constituency]));
    const csv = rows.map(r => r.map(c => `"${(c ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `comparison-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <Card><CardContent className="p-3 flex flex-wrap items-end gap-2">
        <div className="flex items-center gap-2 mr-auto">
          <GitCompare className="w-4 h-4 text-primary" />
          <span className="font-bold text-sm">Side-by-side comparison</span>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground mb-0.5">Data</div>
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{SCOPES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}{scopeLoading && s.id === scope ? '…' : ''}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground mb-0.5">Range</div>
          <Select value={preset} onValueChange={setPreset}>
            <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{PRESETS.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground mb-0.5">Cohort A</div>
          <Select value={groupA} onValueChange={setGroupA}>
            <SelectTrigger className="h-9 w-[180px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All constituencies</SelectItem>
              {constituencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground mb-0.5">Cohort B</div>
          <Select value={groupB} onValueChange={setGroupB}>
            <SelectTrigger className="h-9 w-[180px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__previous_period__">Previous period (A)</SelectItem>
              {constituencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground mb-0.5">Tier (cadres)</div>
          <Select value={tier} onValueChange={setTier}>
            <SelectTrigger className="h-9 w-[130px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tiers</SelectItem>
              {TIERS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" variant="outline" onClick={exportCsv}><Download className="w-3.5 h-3.5 mr-1" />CSV</Button>
      </CardContent></Card>

      {/* Insight card */}
      <Card className="border-primary/30 bg-primary/5"><CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="font-bold text-sm flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-primary" />AI Comparison Insight</div>
          <Button size="sm" onClick={generateInsight} disabled={insightLoading}>
            {insightLoading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
            Generate
          </Button>
        </div>
        <p className="text-sm leading-relaxed text-foreground/90">
          {insight || 'Click Generate to get an AI summary of the differences between Cohort A and B.'}
        </p>
      </CardContent></Card>

      {/* KPI grid side-by-side */}
      <div className="grid md:grid-cols-2 gap-3">
        <CohortPanel label={labelA} color="text-tvk-maroon" sum={sumA} compareTo={sumB} />
        <CohortPanel label={labelB} color="text-blue-700" sum={sumB} compareTo={sumA} />
      </div>

      {/* Volume side by side */}
      <Card><CardContent className="p-4">
        <div className="text-xs font-bold uppercase text-muted-foreground mb-2">Volume over time</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="A" stroke="#8B0000" strokeWidth={2} name={labelA} />
              <Line type="monotone" dataKey="B" stroke="#1d4ed8" strokeWidth={2} name={labelB} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent></Card>

      <div className="grid md:grid-cols-2 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs font-bold uppercase text-muted-foreground mb-2">Category mix</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="A" fill="#8B0000" name={labelA} />
                <Bar dataKey="B" fill="#1d4ed8" name={labelB} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <div className="text-xs font-bold uppercase text-muted-foreground mb-2">Status distribution</div>
          <div className="h-64 grid grid-cols-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieA} dataKey="value" nameKey="name" outerRadius={70}>
                  {pieA.map((_, i) => <Cell key={i} fill={COLORS_A[i % COLORS_A.length]} />)}
                </Pie>
                <Tooltip /><Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieB} dataKey="value" nameKey="name" outerRadius={70}>
                  {pieB.map((_, i) => <Cell key={i} fill={COLORS_B[i % COLORS_B.length]} />)}
                </Pie>
                <Tooltip /><Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 text-center text-[10px] text-muted-foreground"><span>A</span><span>B</span></div>
        </CardContent></Card>
      </div>
    </div>
  );
};

const CohortPanel: React.FC<{ label: string; color: string; sum: any; compareTo: any }> = ({ label, color, sum, compareTo }) => {
  const delta = (a: number, b: number) => b === 0 ? (a > 0 ? 100 : 0) : Math.round(((a - b) / b) * 100);
  const Arrow = ({ v }: { v: number }) => v === 0
    ? <span className="text-muted-foreground">—</span>
    : v > 0
      ? <span className="inline-flex items-center text-emerald-600"><ArrowUpRight className="w-3 h-3" />{v}%</span>
      : <span className="inline-flex items-center text-rose-600"><ArrowDownRight className="w-3 h-3" />{v}%</span>;

  return (
    <Card><CardContent className="p-4 space-y-3">
      <div className={`text-xs font-bold uppercase ${color}`}>{label}</div>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Total" v={sum.total} d={delta(sum.total, compareTo.total)} Arrow={Arrow} />
        <Stat label="Resolution rate" v={`${sum.resolutionRate}%`} d={sum.resolutionRate - compareTo.resolutionRate} Arrow={Arrow} suffix="pts" />
        <Stat label="Resolved" v={sum.resolved} d={delta(sum.resolved, compareTo.resolved)} Arrow={Arrow} />
        <Stat label="Emergency" v={sum.emergency} d={delta(sum.emergency, compareTo.emergency)} Arrow={Arrow} />
      </div>
    </CardContent></Card>
  );
};

const Stat: React.FC<{ label: string; v: any; d: number; Arrow: any; suffix?: string }> = ({ label, v, d, Arrow, suffix }) => (
  <div className="border rounded p-2">
    <div className="text-[10px] text-muted-foreground">{label}</div>
    <div className="flex items-baseline justify-between">
      <span className="font-bold text-lg">{v}</span>
      <span className="text-[11px]">{suffix === 'pts' ? <span className={d >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{d > 0 ? '+' : ''}{d} pts</span> : <Arrow v={d} />}</span>
    </div>
  </div>
);

export default ComparisonView;
