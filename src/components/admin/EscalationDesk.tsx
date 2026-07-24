import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, ChevronRight, Flame, Sparkles, Send, Loader2, Eye, Clock, CheckCircle2 } from 'lucide-react';
import { fmtISTTime } from '@/lib/datetime';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import EscalationDetailModal from './EscalationDetailModal';

const SEV_COLOR: Record<string, string> = {
  critical: 'bg-red-600 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-amber-400 text-black',
  low: 'bg-blue-500/15 text-blue-700',
};

const STATUS_FLOW = ['open', 'in_review', 'acknowledged', 'resolved'] as const;

const EscalationDesk: React.FC = () => {
  const [busy, setBusy] = useState<string | null>(null);
  const [cons, setCons] = useState<string>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [detailEsc, setDetailEsc] = useState<any>(null);

  useEffect(() => { supabase.auth.getUser().then(r => setUserId(r.data.user?.id ?? null)); }, []);

  const { data: escalations = [], refetch, isLoading } = useQuery({
    queryKey: ['escalations_desk'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('escalations' as any)
        .select('*, problem:problems(id,ticket_no,title,constituency,department,urgency,status,area,created_at,resolved_at)')
        .neq('status', 'resolved')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 20_000,
  });

  const allCons = Array.from(new Set((escalations as any[]).map((e: any) => e.problem?.constituency).filter(Boolean))).sort();
  const filtered = (escalations as any[]).filter((e: any) => cons === 'all' || e.problem?.constituency === cons);

  const grouped: Record<string, any[]> = {};
  filtered.forEach((e: any) => {
    const k = e.problem?.constituency ?? 'Unknown';
    (grouped[k] ||= []).push(e);
  });

  const unreadCount = (escalations as any[]).filter((e: any) => !((e.seen_by as string[]) || []).includes(userId || '')).length;

  const markSeen = async (esc: any) => {
    if (!userId || ((esc.seen_by as string[]) || []).includes(userId)) return;
    const next = Array.from(new Set([...(esc.seen_by || []), userId]));
    await supabase.from('escalations' as any).update({ seen_by: next }).eq('id', esc.id);
    refetch();
  };

  const action = async (label: string, fn: () => Promise<any>, id: string) => {
    setBusy(id);
    try { await fn(); toast.success(label); refetch(); }
    catch (e: any) { toast.error(e?.message ?? 'Failed'); }
    finally { setBusy(null); }
  };

  const setStatus = (esc: any, status: typeof STATUS_FLOW[number]) =>
    action(`Marked ${status}`, async () => {
      const history = [...(esc.status_history || []), { from: esc.status, to: status, at: new Date().toISOString(), by: userId }];
      const patch: any = { status, status_history: history };
      if (status === 'resolved') patch.resolved_at = new Date().toISOString();
      await supabase.from('escalations' as any).update(patch).eq('id', esc.id);
    }, esc.id);

  const generatePlan = (esc: any) => action('Plan generated', async () => {
    const { data } = await supabase.functions.invoke('ai-action-plan', { body: { problem_id: esc.problem_id, kind: 'escalation' } });
    await supabase.from('ai_decisions' as any).insert({
      agent_type: 'admin_action', entity_type: 'escalation', entity_id: esc.id,
      action: 'plan_generated', reason: `AI action plan generated`,
      status: 'auto_applied', confidence: 100, metadata: { plan: data, problem_id: esc.problem_id },
      applied_at: new Date().toISOString(),
    });
  }, esc.id);

  const reassign = (esc: any) => action('Smart-reassign triggered', async () => {
    await supabase.from('problem_assignments' as any).update({ active: false, escalated_at: null }).eq('problem_id', esc.problem_id).eq('active', true);
    await supabase.functions.invoke('ai-smart-assign', { body: { problem_id: esc.problem_id } });
  }, esc.id);

  const requestStatus = (esc: any) => action('Status request sent', async () => {
    const { data: pa } = await supabase.from('problem_assignments' as any)
      .select('cadre_id,claimed_by_cadre_id').eq('problem_id', esc.problem_id).eq('active', true).maybeSingle();
    const cadreId = (pa as any)?.claimed_by_cadre_id || (pa as any)?.cadre_id;
    if (!cadreId) throw new Error('No assigned cadre');
    await supabase.functions.invoke('ai-dispatch-task', {
      body: { cadre_id: cadreId, problem_id: esc.problem_id, action: 'follow_up', priority: 'high',
              ai_message: `Admin requests a status update on ${esc.problem?.ticket_no ?? 'this issue'}.` },
    });
  }, esc.id);

  if (isLoading) return <Card><CardContent className="p-6 text-center text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading escalations…</CardContent></Card>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-semibold">{filtered.length} open escalation(s)</span>
          {unreadCount > 0 && <Badge className="bg-red-600 text-white">{unreadCount} new</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Select value={cons} onValueChange={setCons}>
            <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Constituency" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All constituencies</SelectItem>
              {allCons.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-[10px]">Live · 20s</Badge>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">🎉 No open escalations for this filter.</CardContent></Card>
      ) : Object.entries(grouped).map(([c, items]) => (
        <div key={c} className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <ChevronRight className="w-3 h-3" /> {c} · {items.length}
          </div>
          {items.map((esc: any) => {
            const unread = !((esc.seen_by as string[]) || []).includes(userId || '');
            const isOpen = expanded === esc.id;
            return (
              <Card key={esc.id} className={unread ? 'ring-2 ring-red-500/40' : ''}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge className={`text-[10px] ${SEV_COLOR[esc.severity ?? 'medium']}`}>
                      {esc.severity === 'critical' && <Flame className="w-3 h-3 mr-1" />}
                      {(esc.severity ?? 'medium').toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] capitalize">{esc.status}</Badge>
                    <span className="font-mono text-[10px] bg-muted px-1.5 rounded">{esc.problem?.ticket_no ?? '—'}</span>
                    <Badge variant="outline" className="text-[10px]">{esc.problem?.department}</Badge>
                    {unread && <Badge className="bg-red-600 text-white text-[10px]">NEW</Badge>}
                    <span className="ml-auto text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(esc.created_at))} ago</span>
                  </div>
                  <div className="font-medium text-sm">{esc.problem?.title ?? 'Untitled'}</div>
                  {esc.reason && <div className="text-xs text-muted-foreground">📝 {esc.reason}</div>}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" onClick={() => { setDetailEsc(esc); markSeen(esc); }}>
                      <Eye className="w-3 h-3 mr-1" />Open detail
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy === esc.id} onClick={() => generatePlan(esc)}><Sparkles className="w-3 h-3 mr-1" />AI Plan</Button>
                    <Button size="sm" variant="outline" disabled={busy === esc.id} onClick={() => reassign(esc)}>Reassign</Button>
                    <Button size="sm" variant="outline" disabled={busy === esc.id} onClick={() => requestStatus(esc)}><Send className="w-3 h-3 mr-1" />Request Status</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setExpanded(isOpen ? null : esc.id); markSeen(esc); }}>
                      {isOpen ? 'Hide' : 'Timeline'}
                    </Button>
                  </div>

                  {/* Status pipeline */}
                  <div className="flex items-center gap-1 pt-1">
                    {STATUS_FLOW.map((s, i) => {
                      const idx = STATUS_FLOW.indexOf(esc.status);
                      const reached = i <= idx;
                      return (
                        <button key={s} disabled={busy === esc.id || s === esc.status} onClick={() => setStatus(esc, s)}
                          className={`flex-1 text-[10px] py-1 rounded ${reached ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70'} disabled:opacity-60 capitalize`}>
                          {s.replace('_', ' ')}
                        </button>
                      );
                    })}
                  </div>

                  {isOpen && <EscalationTimeline esc={esc} />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ))}

      <EscalationDetailModal escalation={detailEsc} open={!!detailEsc} onClose={() => { setDetailEsc(null); refetch(); }} />
    </div>
  );
};

const EscalationTimeline: React.FC<{ esc: any }> = ({ esc }) => {
  const { data: updates = [] } = useQuery({
    queryKey: ['esc_timeline', esc.problem_id],
    queryFn: async () => {
      const [pu, ad] = await Promise.all([
        supabase.from('problem_updates' as any).select('*').eq('problem_id', esc.problem_id).order('created_at'),
        supabase.from('ai_decisions' as any).select('*').or(`entity_id.eq.${esc.id},and(entity_type.eq.problem,entity_id.eq.${esc.problem_id})`).order('created_at').limit(50),
      ]);
      const events: any[] = [];
      events.push({ at: esc.created_at, kind: 'escalation', text: `Escalated · ${esc.reason ?? 'no reason'}` });
      (esc.status_history || []).forEach((h: any) => events.push({ at: h.at, kind: 'status', text: `Status: ${h.from} → ${h.to}` }));
      (pu.data || []).forEach((u: any) => events.push({ at: u.created_at, kind: 'update', text: `Update · ${u.status ?? ''} ${u.note ? '— ' + u.note : ''}` }));
      (ad.data || []).forEach((d: any) => events.push({ at: d.created_at, kind: 'ai', text: `AI · ${d.action}: ${d.reason ?? ''}` }));
      return events.sort((a, b) => +new Date(a.at) - +new Date(b.at));
    },
  });

  return (
    <div className="mt-2 border-t pt-2 space-y-1.5">
      {(updates as any[]).map((e, i) => (
        <div key={i} className="text-[11px] flex gap-2">
          <div className="shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center">
            {e.kind === 'escalation' ? <Flame className="w-3 h-3 text-red-600" /> :
             e.kind === 'status' ? <Clock className="w-3 h-3" /> :
             e.kind === 'ai' ? <Sparkles className="w-3 h-3 text-primary" /> :
             <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate">{e.text}</div>
            <div className="text-muted-foreground text-[10px]">{fmtISTTime(e.at)}</div>
          </div>
        </div>
      ))}
      {updates.length === 0 && <div className="text-[11px] text-muted-foreground">No timeline events yet.</div>}
    </div>
  );
};

export default EscalationDesk;
