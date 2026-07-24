import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Kind = 'problem' | 'welfare' | 'corruption';

const TABLE_MAP: Record<Kind, { assignments: string; fk: string; main: string; updates?: string; statusField?: string; assignedStatus?: string; titleField: string }> = {
  problem:    { assignments: 'problem_assignments',    fk: 'problem_id',    main: 'problems',           updates: 'problem_updates',  statusField: 'status', assignedStatus: 'assigned',        titleField: 'title' },
  welfare:    { assignments: 'welfare_assignments',    fk: 'welfare_id',    main: 'welfare_issues',     updates: 'welfare_updates',  statusField: 'status', assignedStatus: 'under_processing', titleField: 'title' },
  corruption: { assignments: 'corruption_assignments', fk: 'corruption_id', main: 'corruption_reports', statusField: 'status', assignedStatus: 'under_review', titleField: 'description' },
};

interface Props {
  kind: Kind;
  item: any;
  onClose: () => void;
  onAssigned?: () => void;
}

const AssignModal: React.FC<Props> = ({ kind, item, onClose, onAssigned }) => {
  const map = TABLE_MAP[kind];
  const [teams, setTeams] = useState<any[]>([]);
  const [cadres, setCadres] = useState<any[]>([]);
  const [teamId, setTeamId] = useState('');
  const [cadreId, setCadreId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const constituency = item.constituency;
      const [{ data: t }, { data: c }] = await Promise.all([
        supabase.from('teams').select('*').eq('active', true),
        supabase.from('cadres').select('*').eq('active', true),
      ]);
      const sortByMatch = (arr: any[]) => [...arr].sort((a, b) => {
        const am = a.constituency === constituency ? -1 : 0;
        const bm = b.constituency === constituency ? -1 : 0;
        return am - bm;
      });
      setTeams(sortByMatch(t || []));
      setCadres(sortByMatch(c || []));
    })();
  }, [item]);

  const submit = async () => {
    if (!teamId && !cadreId) return toast.error('Select a team or cadre');
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const row: any = {
      [map.fk]: item.id,
      team_id: teamId || null,
      cadre_id: cadreId || null,
      assigned_by: u.user?.id,
      notes: notes || null,
    };
    const { error } = await supabase.from(map.assignments as any).insert(row);
    if (!error) {
      if (map.statusField && map.assignedStatus) {
        await supabase.from(map.main as any).update({ [map.statusField]: map.assignedStatus }).eq('id', item.id);
      }
      if (map.updates) {
        const updateRow: any = { status: map.assignedStatus, note: notes || 'Assigned' };
        updateRow[map.fk] = item.id;
        await supabase.from(map.updates as any).insert(updateRow);
      }
      try {
        const { pushToCadre, pushToTeam } = await import('@/lib/push');
        const title = `New ${kind} assignment${item.ticket_no ? ` · ${item.ticket_no}` : ''}`;
        const bodyText = `${(item[map.titleField] || '').slice(0, 120)}${notes ? ` — ${notes}` : ''}`;
        const payload = { title, body: bodyText, severity: 'high' as const, type: 'report_assigned', url: '/cadre' };
        if (cadreId) pushToCadre(cadreId, payload);
        if (teamId) pushToTeam(teamId, payload);
      } catch { /* ignore push failures */ }
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Assigned');
    onAssigned?.();
    onClose();
  };

  const label = kind === 'problem' ? 'Problem' : kind === 'welfare' ? 'Welfare Issue' : 'Corruption Report';

  // Render via a body-level portal so this modal always sits above any parent Dialog / overlay
  // that owns focus. This fixes the welfare Assign popup being un-clickable when opened from
  // inside a Dialog.
  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-3 pointer-events-auto" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl max-w-md w-full p-5 pointer-events-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">Assign {label}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <p className="text-xs text-muted-foreground mb-3 break-words">
          {item.ticket_no} · {(item[map.titleField] || '').slice(0, 80)}
        </p>
        <div className="space-y-3">
          <div>
            <Label>Team</Label>
            <select value={teamId} onChange={e => setTeamId(e.target.value)} className="w-full h-10 rounded border border-input bg-background px-2 text-sm">
              <option value="">— Select team —</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name} {t.constituency ? `(${t.constituency})` : ''}</option>)}
            </select>
            {teams.length === 0 && <p className="text-[11px] text-muted-foreground mt-1">No active teams.</p>}
          </div>
          <div>
            <Label>Cadre (optional)</Label>
            <select value={cadreId} onChange={e => setCadreId(e.target.value)} className="w-full h-10 rounded border border-input bg-background px-2 text-sm">
              <option value="">— Select cadre —</option>
              {cadres.map(c => <option key={c.id} value={c.id}>{c.name} · {c.level} {c.constituency ? `· ${c.constituency}` : ''}</option>)}
            </select>
          </div>
          <div>
            <Label>Notes</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional brief" />
          </div>
          <Button onClick={submit} disabled={saving} className="w-full">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Assign
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default AssignModal;
