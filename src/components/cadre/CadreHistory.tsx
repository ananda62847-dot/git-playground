import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { Clock, MessageSquare, ExternalLink, RefreshCw, HeartPulse, ShieldAlert, ListChecks, Building2, Send, Loader2 } from 'lucide-react';
import { useT } from '@/lib/i18n/cadreT';
import { fmtIST } from '@/lib/datetime';
import BlueprintProgressStrip from '@/components/blueprint/BlueprintProgressStrip';
import ResolutionBlueprintPanel from '@/components/blueprint/ResolutionBlueprintPanel';

type Kind = 'problem' | 'welfare' | 'corruption' | 'fund';

interface Row {
  id: string; ticket_no: string; title: string; status: string; created_at: string; kind: Kind; entity: any;
  progress?: { done: number; total: number };
  assignee?: string | null;
  lastUpdate?: string | null;
}

const kindMeta = (k: Kind, T: any) => {
  switch (k) {
    case 'problem': return { label: T.history_kind_problem, icon: ListChecks, color: 'bg-blue-100 text-blue-700' };
    case 'welfare': return { label: T.history_kind_welfare, icon: Building2, color: 'bg-emerald-100 text-emerald-700' };
    case 'corruption': return { label: T.history_kind_corruption, icon: ShieldAlert, color: 'bg-rose-100 text-rose-700' };
    case 'fund': return { label: T.history_kind_fund, icon: HeartPulse, color: 'bg-orange-100 text-orange-700' };
  }
};

const CadreHistory: React.FC<{ cadre: any }> = ({ cadre }) => {
  const T = useT() as any;
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Row | null>(null);
  const [askFor, setAskFor] = useState<Row | null>(null);

  const load = async () => {
    setLoading(true);
    // OR filter so we catch both self-submitted and filed-on-behalf reports.
    const [p, w, c, f] = await Promise.all([
      supabase.from('problems').select('*').or(`reported_by_cadre_id.eq.${cadre.id}`).order('created_at', { ascending: false }),
      supabase.from('welfare_issues').select('*').or(`reported_by_cadre_id.eq.${cadre.id}`).order('created_at', { ascending: false }),
      supabase.from('corruption_reports').select('*').or(`reported_by_cadre_id.eq.${cadre.id}`).order('created_at', { ascending: false }),
      supabase.from('fund_assistance_requests').select('*').eq('filed_by_cadre_id', cadre.id).order('created_at', { ascending: false }),
    ]);
    const base: Row[] = [
      ...(p.data || []).map((e: any) => ({ id: e.id, ticket_no: e.ticket_no, title: e.title, status: e.status, created_at: e.created_at, kind: 'problem' as Kind, entity: e })),
      ...(w.data || []).map((e: any) => ({ id: e.id, ticket_no: e.ticket_no, title: e.title, status: e.status, created_at: e.created_at, kind: 'welfare' as Kind, entity: e })),
      ...(c.data || []).map((e: any) => ({ id: e.id, ticket_no: e.ticket_no, title: (e.description || '').slice(0, 80), status: e.status, created_at: e.created_at, kind: 'corruption' as Kind, entity: e })),
      ...(f.data || []).map((e: any) => ({ id: e.id, ticket_no: e.ticket_no, title: `${e.beneficiary_name} — ${e.category}`, status: e.status, created_at: e.created_at, kind: 'fund' as Kind, entity: e })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Enrich with blueprint progress + latest assignee for problem/welfare/corruption
    const enriched = await Promise.all(base.map(async r => {
      if (r.kind === 'fund') return r;
      try {
        const fkCol = r.kind === 'problem' ? 'problem_id' : r.kind === 'welfare' ? 'welfare_id' : 'corruption_id';
        const asgTable = r.kind === 'problem' ? 'problem_assignments' : r.kind === 'welfare' ? 'welfare_assignments' : 'corruption_assignments';
        const [{ data: bp }, { data: asg }] = await Promise.all([
          supabase.from('resolution_blueprints' as any).select('id').eq(fkCol, r.id).eq('is_active', true).maybeSingle(),
          supabase.from(asgTable as any).select('cadre_id, claimed_by_cadre_id, team_id').eq(fkCol, r.id).eq('active', true).maybeSingle(),
        ]);
        const bpRow: any = bp;
        const asgRow: any = asg;
        let progress: { done: number; total: number } | undefined;
        if (bpRow?.id) {
          const { data: ts } = await supabase.from('blueprint_tasks' as any).select('status').eq('blueprint_id', bpRow.id);
          const total = (ts as any[])?.length || 0;
          const done = ((ts as any[]) || []).filter((t: any) => t.status === 'done' || t.status === 'skipped').length;
          progress = { done, total };
        }
        let assignee: string | null = null;
        if (asgRow) {
          const cid = asgRow.claimed_by_cadre_id || asgRow.cadre_id;
          if (cid) {
            const { data: cad } = await supabase.from('cadres').select('name').eq('id', cid).maybeSingle();
            assignee = (cad as any)?.name || null;
          } else if (asgRow.team_id) {
            const { data: tm } = await supabase.from('teams').select('name').eq('id', asgRow.team_id).maybeSingle();
            assignee = (tm as any)?.name ? `Team · ${(tm as any).name}` : null;
          }
        }
        let lastUpdate: string | null = null;
        if (r.kind === 'problem') {
          const { data: up } = await supabase.from('problem_updates').select('created_at,note,status').eq('problem_id', r.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
          const upRow: any = up;
          if (upRow) lastUpdate = `${upRow.status || ''}${upRow.note ? ' · ' + String(upRow.note).slice(0, 60) : ''}`.trim();
        }
        return { ...r, progress, assignee, lastUpdate };
      } catch { return r; }
    }));

    setRows(enriched);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [cadre.id]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">{T.tab_history} <span className="text-muted-foreground text-xs">({rows.length})</span></div>
        <Button size="sm" variant="ghost" onClick={load}><RefreshCw className="w-3.5 h-3.5" /></Button>
      </div>
      {loading && <div className="text-center py-8 text-xs text-muted-foreground">…</div>}
      {!loading && rows.length === 0 && (
        <div className="text-center py-10 text-sm text-muted-foreground">{T.history_empty}</div>
      )}
      <div className="space-y-2">
        {rows.map(r => {
          const meta = kindMeta(r.kind, T);
          const Icon = meta.icon;
          return (
            <div key={`${r.kind}-${r.id}`} className="bg-card border rounded-xl p-3">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <Badge variant="outline" className={`text-[10px] ${meta.color}`}><Icon className="w-3 h-3 mr-1" />{meta.label}</Badge>
                <span className="font-mono text-[10px] bg-muted px-1.5 rounded">{r.ticket_no}</span>
                <Badge variant="outline" className="text-[10px] capitalize">{String(r.status || '').replace(/_/g, ' ')}</Badge>
                <span className="ml-auto text-[10px] text-muted-foreground inline-flex items-center gap-1"><Clock className="w-3 h-3" />{fmtIST(r.created_at)}</span>
              </div>
              <div className="text-sm font-semibold break-words">{r.title}</div>
              {(r.progress || r.assignee || r.lastUpdate) && (
                <div className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground">
                  {r.progress && r.progress.total > 0 && (
                    <div>Progress: <b className="text-foreground">{r.progress.done}/{r.progress.total}</b> tasks
                      <span className="ml-1">({Math.round((r.progress.done / r.progress.total) * 100)}%)</span>
                    </div>
                  )}
                  {r.assignee && <div>Assigned to: <b className="text-foreground">{r.assignee}</b></div>}
                  {r.lastUpdate && <div>Last update: {r.lastUpdate}</div>}
                </div>
              )}
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" onClick={() => setOpen(r)}><ExternalLink className="w-3 h-3 mr-1" />{T.btn_view}</Button>
                {(r.kind === 'problem' || r.kind === 'welfare' || r.kind === 'corruption') && (
                  <Button size="sm" variant="secondary" onClick={() => setAskFor(r)}><MessageSquare className="w-3 h-3 mr-1" />{T.ask_update}</Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {open && (
        <Sheet open onOpenChange={() => setOpen(null)}>
          <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
            <SheetHeader><SheetTitle className="text-sm break-words">{open.ticket_no} — {open.title}</SheetTitle></SheetHeader>
            <div className="mt-3 space-y-3">
              {(open.kind === 'problem' || open.kind === 'welfare' || open.kind === 'corruption') && (
                <>
                  <BlueprintProgressStrip kind={open.kind as any} entityId={open.id} />
                  <ResolutionBlueprintPanel kind={open.kind as any} entity={open.entity} isAdmin={false} />
                </>
              )}
              {open.kind === 'fund' && (
                <div className="bg-muted/40 rounded-lg p-3 text-xs whitespace-pre-wrap">{open.entity.purpose}</div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}

      {askFor && <AskUpdateDialog row={askFor} cadre={cadre} onClose={() => setAskFor(null)} />}
    </div>
  );
};

const AskUpdateDialog: React.FC<{ row: Row; cadre: any; onClose: () => void }> = ({ row, cadre, onClose }) => {
  const T = useT() as any;
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!message.trim()) return;
    setBusy(true);
    try {
      const summary = `${cadre.name} (cadre) asks for an update on ${row.ticket_no}: ${message.trim()}`;

      // 1) Route to assigned cadre(s) as a Cadre AI Inbox task
      const table = row.kind === 'problem' ? 'problem_assignments'
                  : row.kind === 'welfare' ? 'welfare_assignments'
                  : 'corruption_assignments';
      const fk = row.kind === 'problem' ? 'problem_id' : row.kind === 'welfare' ? 'welfare_id' : 'corruption_id';
      const { data: assigns } = await supabase.from(table as any).select('cadre_id, claimed_by_cadre_id, team_id').eq(fk, row.id).eq('active', true);
      const targetCadreIds = new Set<string>();
      (assigns || []).forEach((a: any) => {
        if (a.claimed_by_cadre_id) targetCadreIds.add(a.claimed_by_cadre_id);
        else if (a.cadre_id) targetCadreIds.add(a.cadre_id);
      });
      if (targetCadreIds.size > 0) {
        const inserts = Array.from(targetCadreIds).map(cid => ({
          cadre_id: cid,
          problem_id: row.kind === 'problem' ? row.id : null,
          welfare_id: row.kind === 'welfare' ? row.id : null,
          corruption_id: row.kind === 'corruption' ? row.id : null,
          kind: 'update_request',
          title: `Update requested on ${row.ticket_no}`,
          body: summary,
          status: 'awaiting_reply',
          created_by_cadre_id: cadre.id,
        }));
        await supabase.from('cadre_ai_tasks' as any).insert(inserts as any);
      }

      // 2) Notify constituency admin(s)
      const entityConstituency = row.entity?.constituency || cadre.constituency;
      if (entityConstituency) {
        const { data: mods } = await supabase.from('moderator_constituencies').select('user_id').eq('constituency', entityConstituency);
        const notif = (mods || []).map((m: any) => ({
          user_id: m.user_id,
          title: `Cadre update request — ${row.ticket_no}`,
          body: summary,
          severity: 'info',
          type: 'cadre_update_request',
          url: '/admin/dashboard',
        }));
        if (notif.length) await supabase.from('notifications' as any).insert(notif as any);
      }

      toast.success(T.ask_update_sent);
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="text-sm">{T.ask_update} · {row.ticket_no}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Textarea rows={4} placeholder={T.ask_update_placeholder} value={message} onChange={e => setMessage(e.target.value)} />
          <Button className="w-full" onClick={send} disabled={busy || !message.trim()}>
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            {T.send_reply}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CadreHistory;