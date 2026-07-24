import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, AlertTriangle } from 'lucide-react';

type Row = {
  cadre_id: string;
  name: string;
  constituency: string | null;
  level: string | null;
  active: number;
  overdue: number;
  load_score: number; // 0-100
};

const SLA: Record<string, number> = { critical: 24, high: 72, medium: 168, low: 336 };

const WorkforceHeatmap: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['workforce_heatmap'],
    queryFn: async (): Promise<Row[]> => {
      // Active assignments joined with problem urgency + created_at
      const { data: assigns } = await supabase
        .from('problem_assignments')
        .select('cadre_id, claimed_by_cadre_id, problems!inner(urgency, status, created_at)')
        .eq('active', true)
        .not('problems.status', 'in', '(resolved,completed,citizen_confirmed,rejected)');

      const { data: cadres } = await supabase
        .from('cadres').select('id, name, constituency, level').eq('active', true).eq('approved', true);

      const map = new Map<string, Row>();
      (cadres ?? []).forEach(c => map.set(c.id, {
        cadre_id: c.id, name: c.name, constituency: c.constituency, level: c.level,
        active: 0, overdue: 0, load_score: 0,
      }));

      const now = Date.now();
      (assigns ?? []).forEach((a: any) => {
        const cid = a.claimed_by_cadre_id || a.cadre_id;
        if (!cid || !map.has(cid)) return;
        const row = map.get(cid)!;
        row.active++;
        const sla = SLA[(a.problems.urgency || 'medium').toLowerCase()] ?? 168;
        const age = (now - new Date(a.problems.created_at).getTime()) / 3600_000;
        if (age > sla) row.overdue++;
      });

      const rows = [...map.values()].map(r => ({
        ...r, load_score: Math.min(100, r.active * 10 + r.overdue * 25),
      }));
      return rows.sort((a, b) => b.load_score - a.load_score);
    },
    refetchInterval: 30_000,
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  const rows = data ?? [];
  const overloaded = rows.filter(r => r.load_score >= 70);
  const idle = rows.filter(r => r.active === 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <KPI icon={Users} label="Cadres tracked" val={rows.length} />
        <KPI icon={AlertTriangle} label="Overloaded (≥70%)" val={overloaded.length} tone="amber" />
        <KPI icon={Users} label="Idle" val={idle.length} tone="slate" />
      </div>

      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">Workforce load heatmap</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {rows.map(r => (
              <div
                key={r.cadre_id}
                className="rounded-lg border border-border p-2 text-xs"
                style={{ background: `linear-gradient(90deg, hsl(var(--primary) / ${(r.load_score / 100) * 0.25}) 0%, transparent 100%)` }}
                title={`${r.name} · ${r.active} active · ${r.overdue} overdue`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{r.name}</span>
                  <Badge variant="outline" className={
                    r.load_score >= 70 ? 'bg-rose-500/15 text-rose-700 border-rose-500/30' :
                    r.load_score >= 40 ? 'bg-amber-500/15 text-amber-700 border-amber-500/30' :
                    r.active === 0 ? 'bg-slate-500/15 text-slate-600 border-slate-500/30' :
                    'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
                  }>{r.load_score}</Badge>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{r.constituency ?? '—'} · {r.level ?? ''}</div>
                <div className="text-[10px] mt-1 flex gap-2">
                  <span>🟢 {r.active} active</span>
                  {r.overdue > 0 && <span className="text-rose-600">⚠ {r.overdue} overdue</span>}
                </div>
              </div>
            ))}
            {rows.length === 0 && (
              <div className="col-span-full text-center text-sm text-muted-foreground py-6">No cadres yet.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const KPI: React.FC<{ icon: any; label: string; val: any; tone?: string }> = ({ icon: Icon, label, val, tone }) => {
  const color = tone === 'amber' ? 'text-amber-600 bg-amber-100'
    : tone === 'slate' ? 'text-slate-600 bg-slate-100'
    : 'text-violet-600 bg-violet-100';
  return (
    <Card><CardContent className="p-3 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center`}><Icon className="w-4 h-4" /></div>
      <div><div className="text-xl font-bold leading-none">{val}</div><div className="text-[10px] text-muted-foreground">{label}</div></div>
    </CardContent></Card>
  );
};

export default WorkforceHeatmap;
