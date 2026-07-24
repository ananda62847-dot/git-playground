import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { fmtISTDate, fmtISTTime } from '@/lib/datetime';
import { SCORE_REASONS } from '@/lib/reportStatus';
import { LineChart, Line, ResponsiveContainer, Tooltip as ChartTooltip, XAxis } from 'recharts';

const CadreScoreHistory: React.FC = () => {
  const navigate = useNavigate();
  const cadreId = typeof window !== 'undefined' ? localStorage.getItem('cadreId') : null;

  const { data: cadre } = useQuery({
    queryKey: ['cadre_self', cadreId],
    enabled: !!cadreId,
    queryFn: async () => {
      const { data } = await supabase.from('cadres').select('id,name,points,stars,resolved_count,rank_tier').eq('id', cadreId!).maybeSingle();
      return data;
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ['cadre_events', cadreId],
    enabled: !!cadreId,
    queryFn: async () => {
      const { data } = await supabase
        .from('gamification_events')
        .select('id,event_type,points_awarded,stars_awarded,created_at,problem_id,metadata,problems:problem_id(ticket_no,title)')
        .eq('cadre_id', cadreId!)
        .order('created_at', { ascending: false })
        .limit(500);
      return data ?? [];
    },
  });

  // Running total going back in time
  const enriched = useMemo(() => {
    let running = cadre?.points ?? 0;
    return (events as any[]).map((e) => {
      const before = running;
      running -= (e.points_awarded ?? 0);
      return { ...e, balance_after: before };
    });
  }, [events, cadre?.points]);

  const spark = useMemo(() => {
    // last 30 days, cumulative
    const byDay: Record<string, number> = {};
    [...(events as any[])].reverse().forEach((e) => {
      const d = new Date(e.created_at).toISOString().slice(0, 10);
      byDay[d] = (byDay[d] ?? 0) + (e.points_awarded ?? 0);
    });
    let acc = 0;
    return Object.entries(byDay).slice(-30).map(([d, delta]) => { acc += delta; return { d: d.slice(5), v: acc }; });
  }, [events]);

  const byDay = useMemo(() => {
    const m: Record<string, any[]> = {};
    enriched.forEach((e) => {
      const k = fmtISTDate(e.created_at);
      (m[k] ||= []).push(e);
    });
    return m;
  }, [enriched]);

  if (!cadreId) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Sign in as a cadre to view your score history.</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b">
        <div className="max-w-screen-sm mx-auto px-3 py-3 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
          <div className="flex-1">
            <div className="text-sm font-semibold">Score History</div>
            <div className="text-[11px] text-muted-foreground">{cadre?.name ?? 'You'}</div>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
            {cadre?.points ?? 0} pts
          </span>
        </div>
      </header>

      <main className="max-w-screen-sm mx-auto px-3 py-4 space-y-4">
        <Card>
          <CardContent className="p-3">
            <div className="text-[11px] text-muted-foreground mb-1">Last 30 days</div>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={spark}>
                  <XAxis dataKey="d" hide />
                  <ChartTooltip contentStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2 text-center">
              <Stat label="Points" value={cadre?.points ?? 0} />
              <Stat label="Resolved" value={cadre?.resolved_count ?? 0} />
              <Stat label="Stars" value={cadre?.stars ?? 0} />
            </div>
          </CardContent>
        </Card>

        {Object.entries(byDay).map(([day, items]) => (
          <div key={day} className="space-y-2">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-1">{day}</div>
            {items.map((e: any) => {
              const meta = SCORE_REASONS[e.event_type] ?? { label: e.event_type, tone: 'neutral' as const };
              const positive = (e.points_awarded ?? 0) >= 0;
              return (
                <Card key={e.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${positive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                      {positive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{meta.label}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                        <span>{fmtISTTime(e.created_at)}</span>
                        {e.problems?.ticket_no && (
                          <Link to={`/track?q=${e.problems.ticket_no}`} className="font-mono bg-muted px-1.5 rounded text-foreground">
                            {e.problems.ticket_no}
                          </Link>
                        )}
                        {e.stars_awarded ? <span className="inline-flex items-center gap-0.5"><Sparkles className="w-3 h-3 text-yellow-500" />+{e.stars_awarded}</span> : null}
                      </div>
                    </div>
                    <div className={`shrink-0 text-right ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
                      <div className="font-bold tabular-nums">{positive ? '+' : ''}{e.points_awarded ?? 0}</div>
                      <div className="text-[10px] text-muted-foreground">→ {e.balance_after}</div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ))}

        {enriched.length === 0 && (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No score activity yet. Start by claiming a task.</CardContent></Card>
        )}
      </main>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <div className="bg-muted/40 rounded p-2">
    <div className="text-base font-bold">{value}</div>
    <div className="text-[10px] text-muted-foreground">{label}</div>
  </div>
);

export default CadreScoreHistory;
