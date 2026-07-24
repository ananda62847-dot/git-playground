import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Activity, Brain, ShieldCheck, AlertTriangle, CheckCircle2, Clock,
  TrendingUp, ListChecks, Sparkles, ScrollText, Loader2, Flame, BellRing, Zap, MessageSquare, Bot, Play, Search,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import WorkforceHeatmap from './WorkforceHeatmap';
import EscalationDesk from './EscalationDesk';
import AICopilotChat from './AICopilotChat';
import AIAutonomyPanel from './AIAutonomyPanel';
import AutomationAnalyticsPanel from './AutomationAnalyticsPanel';
import { fmtIST } from '@/lib/datetime';

type Decision = {
  id: string;
  agent_type: string;
  entity_type: string;
  entity_id: string;
  action: string;
  reason: string | null;
  score_breakdown: Record<string, number>;
  alternatives: any[];
  confidence: number | null;
  status: string;
  metadata: any;
  applied_at: string | null;
  reviewed_at: string | null;
  override_reason: string | null;
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  auto_applied: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  pending_review: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  overridden: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
  rejected: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  approved: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
};

const AGENT_LABEL: Record<string, string> = {
  smart_assignment: 'Smart Assignment',
  follow_up: 'Follow-up',
  escalation: 'Escalation',
  prediction: 'Prediction',
  verification: 'Verification',
  sentiment: 'Sentiment',
};

const AIOperationsCenter: React.FC = () => {
  const [selected, setSelected] = useState<Decision | null>(null);
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: decisions = [], refetch, isLoading } = useQuery({
    queryKey: ['ai_decisions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_decisions' as any)
        .select('id, agent_type, entity_type, entity_id, action, reason, score_breakdown, alternatives, confidence, status, metadata, applied_at, reviewed_at, override_reason, created_at')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as Decision[];
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  // KPIs
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todays = decisions.filter(d => new Date(d.created_at) >= today);
  const totalToday = todays.length;
  const autoToday = todays.filter(d => d.status === 'auto_applied').length;
  const pending = decisions.filter(d => d.status === 'pending_review').length;
  const overrides = decisions.filter(d => d.status === 'overridden').length;
  const successRate = totalToday > 0 ? Math.round((autoToday / totalToday) * 100) : 0;

  // 7-day spark series
  const sparkSeries = useMemo(() => {
    const days: number[] = [];
    const now = Date.now();
    for (let i = 6; i >= 0; i--) {
      const start = now - i * 86400_000; const s = new Date(start); s.setHours(0,0,0,0);
      const e = s.getTime() + 86400_000;
      days.push(decisions.filter(d => { const t = new Date(d.created_at).getTime(); return t >= s.getTime() && t < e; }).length);
    }
    return days;
  }, [decisions]);

  // Filtered list (Live + Audit reuse)
  const filtered = useMemo(() => decisions.filter(d => {
    if (filterAgent !== 'all' && d.agent_type !== filterAgent) return false;
    if (filterStatus !== 'all' && d.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const md = JSON.stringify(d.metadata || {}).toLowerCase();
      if (!d.action.toLowerCase().includes(q) && !(d.reason || '').toLowerCase().includes(q) && !d.entity_id.toLowerCase().includes(q) && !md.includes(q)) return false;
    }
    return true;
  }), [decisions, filterAgent, filterStatus, search]);

  // Agent health derived from last 1h
  const oneHourAgo = Date.now() - 3600_000;
  const agents = Object.keys(AGENT_LABEL).map(k => {
    const recent = decisions.filter(d => d.agent_type === k && new Date(d.created_at).getTime() > oneHourAgo);
    return {
      key: k,
      label: AGENT_LABEL[k],
      count: recent.length,
      health: recent.length === 0 ? 'idle' : 'healthy',
    };
  });

  const runAgent = async (fn: 'ai-follow-up' | 'ai-escalation' | 'ai-predict-delay' | 'ai-citizen-pulse', label: string) => {
    toast.loading(`Running ${label}…`, { id: fn });
    const { data, error } = await supabase.functions.invoke(fn, { body: {} });
    if (error) toast.error(`${label} failed`, { id: fn, description: error.message });
    else toast.success(`${label} done`, { id: fn, description: JSON.stringify(data) });
    refetch();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const bulkAction = async (action: 'approved' | 'rejected') => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    toast.loading(`${action === 'approved' ? 'Approving' : 'Rejecting'} ${ids.length}…`, { id: 'bulk' });
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from('ai_decisions' as any).update({
      status: action, reviewed_by: u.user?.id ?? null, reviewed_at: new Date().toISOString(),
      override_reason: action === 'rejected' ? 'Bulk admin reject' : null,
      applied_at: action === 'approved' ? new Date().toISOString() : null,
    }).in('id', ids);
    if (error) toast.error(error.message, { id: 'bulk' });
    else { toast.success(`${ids.length} decisions ${action}`, { id: 'bulk' }); setSelectedIds(new Set()); refetch(); }
  };


  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" /> AI Operations Center
          </h2>
          <p className="text-xs text-muted-foreground">Autonomous governance · scoring, follow-ups, escalations, audit trail</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={async () => {
              toast.loading('Running AI orchestrator cycle…', { id: 'orch' });
              const { data, error } = await supabase.functions.invoke('ai-orchestrator', { body: { trigger: 'manual' } });
              if (error || data?.error) toast.error(error?.message || data?.error || 'Failed', { id: 'orch' });
              else { toast.success(`Cycle complete · ${data?.run?.decisions_created ?? 0} decisions · ${data?.run?.tasks_dispatched ?? 0} tasks`, { id: 'orch' }); refetch(); }
            }}
          >
            <Play className="w-3.5 h-3.5 mr-1" />Run AI Cycle
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {isLoading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Activity className="w-3.5 h-3.5 mr-1" />} Refresh
          </Button>
        </div>
      </div>

      {/* PENDING REVIEW HERO BANNER */}
      {pending > 0 && (
        <Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
          <CardContent className="p-4 flex items-center gap-3 flex-wrap">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-base">{pending} AI recommendation{pending > 1 ? 's' : ''} need review</div>
              <div className="text-xs text-muted-foreground">Use filters on the Live tab to triage. Bulk approve / reject from there.</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MANUAL AGENT TRIGGERS */}
      <Card>
        <CardContent className="p-3 flex gap-2 flex-wrap items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">Run agent now:</span>
          <Button variant="outline" size="sm" onClick={() => runAgent('ai-follow-up', 'Follow-up agent')}>
            <BellRing className="w-3.5 h-3.5 mr-1" /> Follow-ups
          </Button>
          <Button variant="outline" size="sm" onClick={() => runAgent('ai-escalation', 'Escalation agent')}>
            <Flame className="w-3.5 h-3.5 mr-1" /> Escalations
          </Button>
          <Button variant="outline" size="sm" onClick={() => runAgent('ai-predict-delay', 'Predict delay')}>
            <TrendingUp className="w-3.5 h-3.5 mr-1" /> Predict
          </Button>
          <Button variant="outline" size="sm" onClick={() => runAgent('ai-citizen-pulse', 'Citizen pulse')}>
            <Sparkles className="w-3.5 h-3.5 mr-1" /> Pulse
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        {/* Grouped scrollable chip tabs — no more 9-cell cramped grid */}
        <div className="overflow-x-auto -mx-1 px-1 pb-1">
          <TabsList className="inline-flex w-auto gap-1 h-auto p-1">
            <TabsTrigger value="overview" className="text-xs h-8"><TrendingUp className="w-3.5 h-3.5 mr-1" />Overview</TabsTrigger>
            <TabsTrigger value="live" className="text-xs h-8"><Activity className="w-3.5 h-3.5 mr-1" />Live {pending > 0 && <span className="ml-1 bg-amber-500 text-white text-[10px] rounded-full px-1.5">{pending}</span>}</TabsTrigger>
            <TabsTrigger value="audit" className="text-xs h-8"><ScrollText className="w-3.5 h-3.5 mr-1" />Audit</TabsTrigger>
            <span className="w-px bg-border mx-1 self-stretch" />
            <TabsTrigger value="copilot" className="text-xs h-8"><Bot className="w-3.5 h-3.5 mr-1" />Copilot</TabsTrigger>
            <TabsTrigger value="heatmap" className="text-xs h-8"><Zap className="w-3.5 h-3.5 mr-1" />Workforce</TabsTrigger>
            <TabsTrigger value="predict" className="text-xs h-8"><TrendingUp className="w-3.5 h-3.5 mr-1" />Predict</TabsTrigger>
            <TabsTrigger value="pulse" className="text-xs h-8"><Sparkles className="w-3.5 h-3.5 mr-1" />Pulse</TabsTrigger>
            <TabsTrigger value="insights" className="text-xs h-8"><ShieldCheck className="w-3.5 h-3.5 mr-1" />Insights</TabsTrigger>
            <span className="w-px bg-border mx-1 self-stretch" />
            <TabsTrigger value="escalations" className="text-xs h-8"><AlertTriangle className="w-3.5 h-3.5 mr-1" />Escalations</TabsTrigger>
            <TabsTrigger value="autonomy" className="text-xs h-8"><Bot className="w-3.5 h-3.5 mr-1" />Autonomy</TabsTrigger>
            <TabsTrigger value="automation" className="text-xs h-8"><Sparkles className="w-3.5 h-3.5 mr-1" />Automation</TabsTrigger>
          </TabsList>

        </div>

        <TabsContent value="automation" className="mt-4">
          <AutomationAnalyticsPanel />
        </TabsContent>



        <TabsContent value="copilot" className="mt-4">
          <AICopilotChat />
        </TabsContent>

        <TabsContent value="escalations" className="mt-4">
          <EscalationDesk />
        </TabsContent>

        <TabsContent value="autonomy" className="mt-4">
          <AIAutonomyPanel />
        </TabsContent>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPI icon={Sparkles} label="AI decisions today" val={totalToday} color="text-violet-600 bg-violet-100" spark={sparkSeries} />
            <KPI icon={CheckCircle2} label="Auto-applied" val={autoToday} color="text-emerald-600 bg-emerald-100" />
            <KPI icon={Clock} label="Pending review" val={pending} color="text-amber-600 bg-amber-100" />
            <KPI icon={ShieldCheck} label="Auto-success rate" val={`${successRate}%`} color="text-blue-600 bg-blue-100" />
          </div>

          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><ListChecks className="w-4 h-4" /> Agent health</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {agents.map(a => (
                  <div key={a.key} className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
                    <div>
                      <div className="text-sm font-medium">{a.label}</div>
                      <div className="text-[10px] text-muted-foreground">{a.count} actions last hour</div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.health === 'healthy' ? 'bg-emerald-500/15 text-emerald-700' : 'bg-slate-500/15 text-slate-600'}`}>
                      {a.health === 'healthy' ? '🟢 Healthy' : '⚪ Idle'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-2">How it works</h3>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Smart Assignment scores eligible cadres (availability 35 · performance 20 · proximity 20 · speed 15 · success 10).</li>
                <li>Confidence ≥ 80 → auto-applied. Below 80 → flagged for admin review on Live Activity.</li>
                <li>Every decision is immutable and explorable in Audit Logs.</li>
                <li>Escalations are always manual until you opt-in (settings coming in a later phase).</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LIVE ACTIVITY */}
        <TabsContent value="live" className="space-y-3 mt-4">
          <FilterBar
            filterAgent={filterAgent} setFilterAgent={setFilterAgent}
            filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            search={search} setSearch={setSearch}
            selectedCount={selectedIds.size}
            onBulkApprove={() => bulkAction('approved')}
            onBulkReject={() => bulkAction('rejected')}
            onClearSelection={() => setSelectedIds(new Set())}
          />
          <div className="space-y-2">
            {filtered.slice(0, 60).map(d => (
              <ActivityRow
                key={d.id}
                d={d}
                onOpen={() => setSelected(d)}
                selected={selectedIds.has(d.id)}
                onToggleSelect={() => toggleSelect(d.id)}
              />
            ))}
            {filtered.length === 0 && (
              <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
                {decisions.length === 0
                  ? 'No AI activity yet. Trigger an agent above to see decisions appear here.'
                  : 'No decisions match the current filters.'}
              </CardContent></Card>
            )}
          </div>
        </TabsContent>

        {/* WORKFORCE */}
        <TabsContent value="heatmap" className="mt-4">
          <WorkforceHeatmap />
        </TabsContent>



        {/* PREDICTIONS */}
        <TabsContent value="predict" className="mt-4 space-y-2">
          {decisions.filter(d => d.agent_type === 'prediction').slice(0, 60).map(d => (
            <PredictionRow key={d.id} d={d} onOpen={() => setSelected(d)} />
          ))}
          {decisions.filter(d => d.agent_type === 'prediction').length === 0 && (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
              No predictions yet. Click <strong>Predict</strong> above to scan active assignments for SLA-breach risk.
            </CardContent></Card>
          )}
        </TabsContent>

        {/* PULSE */}
        <TabsContent value="pulse" className="mt-4 space-y-2">
          {decisions.filter(d => d.agent_type === 'sentiment').slice(0, 40).map(d => (
            <PulseRow key={d.id} d={d} onOpen={() => setSelected(d)} />
          ))}
          {decisions.filter(d => d.agent_type === 'sentiment').length === 0 && (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
              No pulse snapshots yet. Click <strong>Pulse</strong> above to sample recent citizen sentiment.
            </CardContent></Card>
          )}
        </TabsContent>

        {/* INSIGHTS (override learning) */}
        <TabsContent value="insights" className="mt-4">
          <InsightsPanel decisions={decisions} />
        </TabsContent>


        <TabsContent value="audit" className="space-y-3 mt-4">
          <FilterBar
            filterAgent={filterAgent} setFilterAgent={setFilterAgent}
            filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            search={search} setSearch={setSearch}
          />
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr className="text-left">
                      <th className="p-2">When</th>
                      <th className="p-2">Agent</th>
                      <th className="p-2">Action</th>
                      <th className="p-2">Confidence</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Reason</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(d => (
                      <tr key={d.id} className="border-t border-border hover:bg-muted/30">
                        <td className="p-2 whitespace-nowrap">{fmtIST(d.created_at)}</td>
                        <td className="p-2">{AGENT_LABEL[d.agent_type] ?? d.agent_type}</td>
                        <td className="p-2 font-mono">{d.action}</td>
                        <td className="p-2">{d.confidence ?? '—'}</td>
                        <td className="p-2"><Badge variant="outline" className={STATUS_STYLES[d.status] ?? ''}>{d.status}</Badge></td>
                        <td className="p-2 max-w-xs truncate" title={d.reason ?? ''}>{d.reason}</td>
                        <td className="p-2"><Button size="sm" variant="ghost" onClick={() => setSelected(d)}>Explain</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DecisionExplainer decision={selected} onClose={() => setSelected(null)} onChanged={() => refetch()} />
    </div>
  );
};

const Sparkline: React.FC<{ data: number[] }> = ({ data }) => {
  if (!data.length) return null;
  const max = Math.max(1, ...data);
  const w = 60, h = 20;
  const step = w / Math.max(1, data.length - 1);
  const points = data.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} className="opacity-70">
      <polyline fill="none" stroke="currentColor" strokeWidth="1.5" points={points} />
    </svg>
  );
};

const KPI: React.FC<{ icon: any; label: string; val: any; color: string; spark?: number[] }> = ({ icon: Icon, label, val, color, spark }) => (
  <Card><CardContent className="p-3 md:p-4 flex items-center gap-3">
    <div className={`w-9 h-9 md:w-10 md:h-10 rounded-full ${color} flex items-center justify-center`}><Icon className="w-5 h-5" /></div>
    <div className="min-w-0 flex-1">
      <div className="text-xl md:text-2xl font-bold leading-none">{val}</div>
      <div className="text-[10px] md:text-xs text-muted-foreground">{label}</div>
    </div>
    {spark && spark.length > 0 && <div className={color.split(' ')[0]}><Sparkline data={spark} /></div>}
  </CardContent></Card>
);

const FilterBar: React.FC<{
  filterAgent: string; setFilterAgent: (v: string) => void;
  filterStatus: string; setFilterStatus: (v: string) => void;
  search: string; setSearch: (v: string) => void;
  selectedCount?: number;
  onBulkApprove?: () => void;
  onBulkReject?: () => void;
  onClearSelection?: () => void;
}> = ({ filterAgent, setFilterAgent, filterStatus, setFilterStatus, search, setSearch, selectedCount, onBulkApprove, onBulkReject, onClearSelection }) => (
  <Card>
    <CardContent className="p-3 flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[180px]">
        <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search action, reason, entity id…"
          className="h-8 pl-7 text-xs"
        />
      </div>
      <Select value={filterAgent} onValueChange={setFilterAgent}>
        <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All agents</SelectItem>
          {Object.entries(AGENT_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filterStatus} onValueChange={setFilterStatus}>
        <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="pending_review">Pending review</SelectItem>
          <SelectItem value="auto_applied">Auto applied</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
          <SelectItem value="overridden">Overridden</SelectItem>
        </SelectContent>
      </Select>
      {selectedCount !== undefined && selectedCount > 0 && (
        <>
          <span className="text-xs font-semibold text-muted-foreground">{selectedCount} selected</span>
          <Button size="sm" variant="default" className="h-8 text-xs" onClick={onBulkApprove}>
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Approve
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onBulkReject}>Reject</Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onClearSelection}>Clear</Button>
        </>
      )}
    </CardContent>
  </Card>
);

const ActivityRow: React.FC<{
  d: Decision;
  onOpen: () => void;
  selected?: boolean;
  onToggleSelect?: () => void;
}> = ({ d, onOpen, selected, onToggleSelect }) => (
  <Card className={`hover:shadow-md transition cursor-pointer ${selected ? 'ring-2 ring-primary' : ''}`}>
    <CardContent className="p-3 flex items-start gap-3">
      {onToggleSelect && (
        <div className="pt-1 shrink-0" onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}>
          <Checkbox checked={!!selected} onCheckedChange={() => onToggleSelect()} />
        </div>
      )}
      <div className="w-9 h-9 rounded-full bg-violet-500/15 text-violet-700 flex items-center justify-center flex-shrink-0" onClick={onOpen}>
        <Brain className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0" onClick={onOpen}>
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="font-semibold">{AGENT_LABEL[d.agent_type] ?? d.agent_type}</span>
          <Badge variant="outline" className={STATUS_STYLES[d.status] ?? ''}>{d.status.replace('_', ' ')}</Badge>
          {d.confidence != null && <span className="text-muted-foreground">conf {d.confidence}%</span>}
          <span className="text-muted-foreground ml-auto">{formatDistanceToNow(new Date(d.created_at))} ago</span>
        </div>
        <div className="text-sm mt-0.5 line-clamp-2">{d.reason}</div>
      </div>
    </CardContent>
  </Card>
);


const DecisionExplainer: React.FC<{ decision: Decision | null; onClose: () => void; onChanged: () => void }> = ({ decision, onClose, onChanged }) => {
  const [busy, setBusy] = useState(false);

  const approve = async () => {
    if (!decision) return;
    setBusy(true);
    try {
      const md = decision.metadata ?? {};
      // Apply assignment if smart_assignment and not yet applied
      if (decision.agent_type === 'smart_assignment' && decision.status === 'pending_review' && md.recommended_cadre_id) {
        const { data: existing } = await supabase
          .from('problem_assignments').select('id').eq('problem_id', decision.entity_id).eq('active', true).limit(1);
        if (!existing || existing.length === 0) {
          const { data: u } = await supabase.auth.getUser();
          await supabase.from('problem_assignments').insert({
            problem_id: decision.entity_id, cadre_id: md.recommended_cadre_id,
            assigned_by: u.user?.id ?? null,
            notes: `AI recommendation approved (confidence ${decision.confidence}%)`,
          });
          await supabase.from('problems').update({ status: 'assigned' }).eq('id', decision.entity_id);
        }
      }
      const { data: u } = await supabase.auth.getUser();
      await supabase.from('ai_decisions' as any).update({
        status: 'approved', reviewed_by: u.user?.id ?? null, reviewed_at: new Date().toISOString(),
        applied_at: new Date().toISOString(),
      }).eq('id', decision.id);
      toast.success('AI recommendation approved');
      onChanged(); onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  const reject = async () => {
    if (!decision) return;
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      await supabase.from('ai_decisions' as any).update({
        status: 'rejected', reviewed_by: u.user?.id ?? null, reviewed_at: new Date().toISOString(),
        override_reason: 'Admin rejected',
      }).eq('id', decision.id);
      toast.success('Rejected');
      onChanged(); onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setBusy(false); }
  };

  if (!decision) return null;
  const breakdown = decision.score_breakdown ?? {};
  const md = decision.metadata ?? {};

  return (
    <Dialog open={!!decision} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" /> AI Decision Explanation
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Info label="Agent" val={AGENT_LABEL[decision.agent_type] ?? decision.agent_type} />
            <Info label="Action" val={decision.action} />
            <Info label="Confidence" val={`${decision.confidence ?? '—'}%`} />
            <Info label="Status" val={decision.status} />
          </div>

          {decision.reason && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <div className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Why?</div>
              {decision.reason}
            </div>
          )}

          {Object.keys(breakdown).length > 0 && (
            <div>
              <div className="text-xs font-semibold mb-2">Score breakdown</div>
              <div className="space-y-1">
                {Object.entries(breakdown).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 text-xs">
                    <span className="capitalize w-24">{k}</span>
                    <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${Math.min(100, (v as number) * 3)}%` }} />
                    </div>
                    <span className="w-8 text-right tabular-nums">+{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(decision.alternatives) && decision.alternatives.length > 0 && (
            <div>
              <div className="text-xs font-semibold mb-2">Alternatives considered</div>
              <div className="space-y-1">
                {decision.alternatives.map((a: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs border border-border rounded px-2 py-1">
                    <span>{a.cadre_name ?? a.name ?? '—'}</span>
                    <span className="text-muted-foreground">score {a.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {md.recommended_cadre_name && (
            <div className="text-xs text-muted-foreground">Recommended: <strong>{md.recommended_cadre_name}</strong></div>
          )}

          {/* Replay timeline — all AI decisions for this entity */}
          <ReplayTimeline entityId={decision.entity_id} currentId={decision.id} />


          {decision.status === 'pending_review' && (
            <div className="flex gap-2">
              <Button onClick={approve} disabled={busy} className="flex-1">
                {busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Approve & apply
              </Button>
              <Button variant="outline" onClick={reject} disabled={busy} className="flex-1">Reject</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Info: React.FC<{ label: string; val: any }> = ({ label, val }) => (
  <div className="border border-border rounded-lg p-2">
    <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
    <div className="font-medium text-sm capitalize break-words">{String(val)}</div>
  </div>
);

// ---- Prediction list row ----
const PredictionRow: React.FC<{ d: Decision; onOpen: () => void }> = ({ d, onOpen }) => {
  const md = d.metadata ?? {};
  const risk = md.risk_score ?? d.confidence ?? 0;
  const tone = risk >= 85 ? 'bg-rose-500/15 text-rose-700 border-rose-500/30'
             : risk >= 70 ? 'bg-orange-500/15 text-orange-700 border-orange-500/30'
             : 'bg-amber-500/15 text-amber-700 border-amber-500/30';
  return (
    <Card className="hover:shadow-md cursor-pointer transition" onClick={onOpen}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`w-14 h-14 rounded-lg ${tone} flex flex-col items-center justify-center font-bold border`}>
          <span className="text-base leading-none">{risk}%</span>
          <span className="text-[8px] uppercase opacity-70">risk</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold line-clamp-1">{d.reason}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            ⏱ {md.hours_left ?? '?'}h left · load {md.load ?? 0} · {md.urgency ?? ''} · {md.cadre_name ?? 'unassigned'}
          </div>
        </div>
        <Badge variant="outline" className="text-[10px]">{formatDistanceToNow(new Date(d.created_at))} ago</Badge>
      </CardContent>
    </Card>
  );
};

// ---- Pulse list row ----
const PulseRow: React.FC<{ d: Decision; onOpen: () => void }> = ({ d, onOpen }) => {
  const md = d.metadata ?? {};
  const bd: any = d.score_breakdown ?? {};
  const mood = bd.mood ?? 50;
  const tension = bd.tension ?? 0;
  const moodEmoji = mood >= 70 ? '😊' : mood >= 45 ? '😐' : '😟';
  return (
    <Card className="hover:shadow-md cursor-pointer transition" onClick={onOpen}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="text-3xl">{moodEmoji}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">{md.constituency ?? 'Unknown'}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            mood {mood}/100 · tension {tension}% · {md.total_samples ?? 0} samples · {(md.top_keywords ?? []).slice(0,4).join(', ')}
          </div>
        </div>
        <Badge variant="outline" className={tension >= 60 ? 'bg-rose-500/15 text-rose-700 border-rose-500/30' : ''}>
          {tension >= 60 ? 'High tension' : tension >= 30 ? 'Moderate' : 'Calm'}
        </Badge>
      </CardContent>
    </Card>
  );
};

// ---- Insights panel: override learning & confidence calibration ----
const InsightsPanel: React.FC<{ decisions: Decision[] }> = ({ decisions }) => {
  const total = decisions.length;
  const approved = decisions.filter(d => d.status === 'approved').length;
  const rejected = decisions.filter(d => d.status === 'rejected').length;
  const overridden = decisions.filter(d => d.status === 'overridden').length;
  const auto = decisions.filter(d => d.status === 'auto_applied').length;
  const reviewable = approved + rejected + overridden;
  const approvalRate = reviewable > 0 ? Math.round((approved / reviewable) * 100) : 0;

  const bands = [
    { label: '50-69', min: 50, max: 70 },
    { label: '70-79', min: 70, max: 80 },
    { label: '80-89', min: 80, max: 90 },
    { label: '90-100', min: 90, max: 101 },
  ].map(b => {
    const inBand = decisions.filter(d => d.confidence != null && d.confidence >= b.min && d.confidence < b.max);
    return { ...b, total: inBand.length,
      kept: inBand.filter(d => d.status !== 'rejected' && d.status !== 'overridden').length };
  });

  const perAgent = Object.keys(AGENT_LABEL).map(k => {
    const all = decisions.filter(d => d.agent_type === k);
    const overr = all.filter(d => d.status === 'rejected' || d.status === 'overridden').length;
    return { key: k, label: AGENT_LABEL[k], total: all.length, overr,
      rate: all.length > 0 ? Math.round((overr / all.length) * 100) : 0 };
  }).filter(a => a.total > 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon={Sparkles} label="Total decisions" val={total} color="text-violet-600 bg-violet-100" />
        <KPI icon={CheckCircle2} label="Approval rate" val={`${approvalRate}%`} color="text-emerald-600 bg-emerald-100" />
        <KPI icon={AlertTriangle} label="Overrides" val={overridden + rejected} color="text-rose-600 bg-rose-100" />
        <KPI icon={Brain} label="Autonomous" val={auto} color="text-blue-600 bg-blue-100" />
      </div>

      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-2">Confidence calibration</h3>
          <p className="text-[11px] text-muted-foreground mb-3">
            Does high confidence actually mean correct? Higher = AI's top picks survived admin review.
          </p>
          <div className="space-y-2">
            {bands.map(b => {
              const pct = b.total ? Math.round((b.kept / b.total) * 100) : 0;
              return (
                <div key={b.label} className="flex items-center gap-2 text-xs">
                  <span className="w-16 font-mono">{b.label}</span>
                  <div className="flex-1 h-3 rounded bg-muted overflow-hidden">
                    <div className={`h-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-24 text-right tabular-nums">{b.kept}/{b.total} kept</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-sm mb-3">Override rate by agent</h3>
          <div className="space-y-2">
            {perAgent.map(a => (
              <div key={a.key} className="flex items-center gap-2 text-xs">
                <span className="w-32">{a.label}</span>
                <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                  <div className={`h-full ${a.rate >= 30 ? 'bg-rose-500' : a.rate >= 15 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.max(4, a.rate)}%` }} />
                </div>
                <span className="w-24 text-right tabular-nums">{a.overr}/{a.total} ({a.rate}%)</span>
              </div>
            ))}
            {perAgent.length === 0 && <div className="text-xs text-muted-foreground">No data yet.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ---- Replay timeline for a single entity ----
const ReplayTimeline: React.FC<{ entityId: string; currentId: string }> = ({ entityId, currentId }) => {
  const { data: timeline = [] } = useQuery({
    queryKey: ['ai_decisions_timeline', entityId],
    queryFn: async () => {
      const { data } = await supabase.from('ai_decisions' as any)
        .select('id, agent_type, action, status, confidence, created_at, reason')
        .eq('entity_id', entityId)
        .order('created_at', { ascending: true })
        .limit(40);
      return (data ?? []) as any[];
    },
    enabled: !!entityId,
  });

  if (timeline.length <= 1) return null;
  return (
    <div>
      <div className="text-xs font-semibold mb-2 flex items-center gap-1"><ScrollText className="w-3.5 h-3.5" /> Replay timeline</div>
      <div className="border-l-2 border-border ml-2 pl-3 space-y-2 max-h-48 overflow-y-auto">
        {timeline.map((e: any) => (
          <div key={e.id} className={`text-xs ${e.id === currentId ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10px]">{fmtIST(e.created_at)}</span>
              <Badge variant="outline" className={`text-[9px] ${STATUS_STYLES[e.status] ?? ''}`}>{e.status}</Badge>
              <span>{AGENT_LABEL[e.agent_type] ?? e.agent_type} · {e.action}</span>
              {e.confidence != null && <span className="opacity-70">({e.confidence}%)</span>}
            </div>
            {e.reason && <div className="line-clamp-1 opacity-80 ml-1">↳ {e.reason}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};


export default AIOperationsCenter;
