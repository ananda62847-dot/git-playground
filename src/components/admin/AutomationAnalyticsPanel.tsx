import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { Bot, CheckCircle2, AlertTriangle, RotateCcw, Sparkles, Download, Info } from 'lucide-react';
import { fmtIST } from '@/lib/datetime';
import DecisionTraceDrawer from './DecisionTraceDrawer';


const AGENT_LABEL: Record<string, string> = {
  smart_assignment: 'Smart Assignment',
  follow_up: 'Follow-up',
  escalation: 'Escalation',
  prediction: 'Prediction',
  verification: 'Verification',
  sentiment: 'Sentiment',
};

const STATUS_COLORS: Record<string, string> = {
  auto_applied: '#10b981',
  pending_review: '#f59e0b',
  approved: '#3b82f6',
  overridden: '#a855f7',
  rejected: '#ef4444',
};

const AutomationAnalyticsPanel: React.FC = () => {
  const { data: decisions = [] } = useQuery({
    queryKey: ['ai_decisions_analytics'],
    queryFn: async () => {
      const { data } = await supabase.from('ai_decisions' as any)
        .select('id,agent_type,action,status,confidence,reason,metadata,created_at,applied_at,reviewed_at,override_reason')
        .order('created_at', { ascending: false }).limit(1000);
      return data || [];
    },
    refetchInterval: 60_000,
  });

  const { data: policies = [] } = useQuery({
    queryKey: ['agent_policies'],
    queryFn: async () => {
      const { data } = await supabase.from('agent_policies' as any).select('*');
      return data || [];
    },
  });

  const now = Date.now();
  const since24 = now - 86400_000;
  const since7d = now - 7 * 86400_000;
  const within = (iso: string, t: number) => new Date(iso).getTime() >= t;

  const kpis = useMemo(() => {
    const d24 = decisions.filter((d: any) => within(d.created_at, since24));
    const d7 = decisions.filter((d: any) => within(d.created_at, since7d));
    const auto24 = d24.filter((d: any) => d.status === 'auto_applied').length;
    const escal24 = d24.filter((d: any) => d.action?.includes('escalat')).length;
    const overrides7 = d7.filter((d: any) => d.status === 'overridden' || d.status === 'rejected').length;
    const reversals = d7.filter((d: any) => d.status === 'overridden' && d.applied_at && d.reviewed_at
      && (new Date(d.reviewed_at).getTime() - new Date(d.applied_at).getTime() < 15 * 60_000)).length;
    const confs = d7.filter((d: any) => typeof d.confidence === 'number').map((d: any) => d.confidence);
    const avgConf = confs.length ? Math.round(confs.reduce((a: number, b: number) => a + b, 0) / confs.length) : 0;
    return { auto24, escal24, overrides7, reversals, avgConf };
  }, [decisions]);

  const byAgent = useMemo(() => {
    const m: Record<string, { agent: string; auto: number; manual: number; suggest: number }> = {};
    decisions.forEach((d: any) => {
      const k = d.agent_type || 'other';
      if (!m[k]) m[k] = { agent: AGENT_LABEL[k] || k, auto: 0, manual: 0, suggest: 0 };
      if (d.status === 'auto_applied') m[k].auto++;
      else if (d.status === 'overridden' || d.status === 'rejected' || d.status === 'approved') m[k].manual++;
      else m[k].suggest++;
    });
    return Object.values(m);
  }, [decisions]);

  const outcomePie = useMemo(() => {
    const m: Record<string, number> = {};
    decisions.forEach((d: any) => { m[d.status] = (m[d.status] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [decisions]);

  const recentAuto = decisions.filter((d: any) => d.status === 'auto_applied').slice(0, 15);

  const [drill, setDrill] = useState<{ open: boolean; title: string; rows: any[] }>({ open: false, title: '', rows: [] });
  const openDrill = (title: string, rows: any[]) => setDrill({ open: true, title, rows });


  const exportCsv = () => {
    const rows = [['created', 'agent', 'action', 'status', 'confidence', 'reason']];
    decisions.forEach((d: any) => rows.push([
      d.created_at, d.agent_type, d.action, d.status, String(d.confidence ?? ''), (d.reason || '').replace(/\n/g, ' '),
    ]));
    const csv = rows.map(r => r.map(c => `"${(c ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `automation-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-bold text-base flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />Automation Insights</h3>
        <Button size="sm" variant="outline" onClick={exportCsv}><Download className="w-3.5 h-3.5 mr-1" />CSV</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <KPI icon={CheckCircle2} label="Auto-accepted (24h)" val={kpis.auto24} color="text-emerald-600 bg-emerald-100"
          onClick={() => openDrill('Auto-accepted (24h)', decisions.filter((d: any) => within(d.created_at, since24) && d.status === 'auto_applied'))} />
        <KPI icon={AlertTriangle} label="Auto-escalated (24h)" val={kpis.escal24} color="text-orange-600 bg-orange-100"
          onClick={() => openDrill('Auto-escalated (24h)', decisions.filter((d: any) => within(d.created_at, since24) && d.action?.includes('escalat')))} />
        <KPI icon={Bot} label="Manual overrides (7d)" val={kpis.overrides7} color="text-purple-600 bg-purple-100"
          onClick={() => openDrill('Manual overrides (7d)', decisions.filter((d: any) => within(d.created_at, since7d) && (d.status === 'overridden' || d.status === 'rejected')))} />
        <KPI icon={RotateCcw} label="Reversed <15m (7d)" val={kpis.reversals} color="text-rose-600 bg-rose-100"
          onClick={() => openDrill('Reversed within 15 min (7d)', decisions.filter((d: any) => within(d.created_at, since7d) && d.status === 'overridden' && d.applied_at && d.reviewed_at && (new Date(d.reviewed_at).getTime() - new Date(d.applied_at).getTime() < 15 * 60_000)))} />
        <KPI icon={Sparkles} label="Avg confidence (7d)" val={`${kpis.avgConf}%`} color="text-blue-600 bg-blue-100"
          onClick={() => openDrill('Decisions (7d)', decisions.filter((d: any) => within(d.created_at, since7d)))} />
      </div>


      <div className="grid md:grid-cols-2 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-xs font-bold uppercase text-muted-foreground mb-2">Decisions by agent</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byAgent}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="agent" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="auto" stackId="a" fill="#10b981" name="Auto-applied" />
                <Bar dataKey="manual" stackId="a" fill="#a855f7" name="Manual / override" />
                <Bar dataKey="suggest" stackId="a" fill="#f59e0b" name="Pending / suggest" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <div className="text-xs font-bold uppercase text-muted-foreground mb-2">Outcome mix</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={outcomePie} dataKey="value" nameKey="name" innerRadius={40} outerRadius={75}>
                  {outcomePie.map((p, i) => <Cell key={i} fill={STATUS_COLORS[p.name] || '#94a3b8'} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent></Card>
      </div>

      {/* Smart decision rule cards */}
      <Card><CardContent className="p-4 space-y-3">
        <div className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1"><Info className="w-3.5 h-3.5" />Smart decision rules</div>
        {policies.length === 0 ? (
          <div className="text-xs text-muted-foreground">No agent policies configured yet — visit the Autonomy tab to enable smart automation.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-2">
            {policies.map((p: any) => (
              <div key={p.id} className="border rounded-lg p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">{AGENT_LABEL[p.agent_type] || p.agent_type}</span>
                  <Badge className={
                    p.mode === 'auto' ? 'bg-emerald-600 text-white' :
                    p.mode === 'suggest' ? 'bg-amber-500 text-white' : 'bg-slate-500 text-white'
                  }>{p.mode}</Badge>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {p.mode === 'auto' ? (
                    <>Runs in <b>Auto</b> mode. Decisions at <b>≥ {p.confidence_threshold}%</b> confidence are applied automatically, capped at <b>{p.daily_cap || '∞'} / day</b>. Below threshold are queued for review.</>
                  ) : p.mode === 'suggest' ? (
                    <>Runs in <b>Suggest</b> mode — every decision is queued for admin approval regardless of confidence.</>
                  ) : (
                    <>Disabled. Agent is off until set to Suggest or Auto.</>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent></Card>

      {/* Recent automated actions with explanation */}
      <Card><CardContent className="p-4">
        <div className="text-xs font-bold uppercase text-muted-foreground mb-2">Recent automated actions</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground border-b">
              <tr><th className="py-1.5 pr-2">When</th><th className="pr-2">Agent</th><th className="pr-2">Action</th><th className="pr-2">Conf.</th><th>Why</th></tr>
            </thead>
            <tbody>
              {recentAuto.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No automated actions yet.</td></tr>
              )}
              {recentAuto.map((d: any) => (
                <tr key={d.id} className="border-b last:border-0 align-top hover:bg-muted/40 cursor-pointer"
                  onClick={() => openDrill(`${AGENT_LABEL[d.agent_type] || d.agent_type} · ${d.action}`, [d])}>
                  <td className="py-1.5 pr-2 whitespace-nowrap">{fmtIST(d.created_at)}</td>
                  <td className="pr-2">{AGENT_LABEL[d.agent_type] || d.agent_type}</td>
                  <td className="pr-2 font-mono text-[10px]">{d.action}</td>
                  <td className="pr-2">{d.confidence ?? '—'}%</td>
                  <td className="text-muted-foreground">{d.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent></Card>

      <DecisionTraceDrawer open={drill.open} title={drill.title} decisions={drill.rows} policies={policies}
        onClose={() => setDrill(s => ({ ...s, open: false }))} />
    </div>
  );
};

const KPI: React.FC<{ icon: any; label: string; val: any; color: string; onClick?: () => void }> = ({ icon: Icon, label, val, color, onClick }) => (
  <Card className={onClick ? 'cursor-pointer hover:shadow-md transition' : ''} onClick={onClick}>
    <CardContent className="p-3 flex items-center gap-2">
      <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center shrink-0`}><Icon className="w-4 h-4" /></div>
      <div className="min-w-0"><div className="text-lg font-bold leading-none">{val}</div><div className="text-[10px] text-muted-foreground">{label}</div></div>
    </CardContent>
  </Card>
);


export default AutomationAnalyticsPanel;
