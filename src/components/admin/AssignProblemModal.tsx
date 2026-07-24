import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { X, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const AssignProblemModal: React.FC<{ problem: any; onClose: () => void }> = ({ problem, onClose }) => {
  const [teams, setTeams] = useState<any[]>([]);
  const [cadres, setCadres] = useState<any[]>([]);
  const [teamId, setTeamId] = useState('');
  const [cadreId, setCadreId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const constituency = problem.constituency;
      const [{ data: t }, { data: c }] = await Promise.all([
        supabase.from('teams').select('*').eq('active', true),
        supabase.from('cadres').select('*').eq('active', true),
      ]);
      // Prefer same-constituency first, but always show all so admins can assign cross-constituency.
      const sortByMatch = (arr: any[]) => [...arr].sort((a, b) => {
        const am = a.constituency === constituency ? -1 : 0;
        const bm = b.constituency === constituency ? -1 : 0;
        return am - bm;
      });
      setTeams(sortByMatch(t || []));
      setCadres(sortByMatch(c || []));
    })();
  }, [problem]);

  const submit = async () => {
    if (!teamId && !cadreId) return toast.error('Select a team or cadre');
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from('problem_assignments').insert({
      problem_id: problem.id, team_id: teamId || null, cadre_id: cadreId || null,
      assigned_by: u.user?.id, notes: notes || null,
    });
    if (!error) {
      await supabase.from('problems').update({ status: 'assigned' }).eq('id', problem.id);
      await supabase.from('problem_updates').insert({ problem_id: problem.id, status: 'assigned', note: notes || 'Assigned to team/cadre', updated_by: u.user?.id });
      // Push the assigned cadre and/or team members
      const { pushToCadre, pushToTeam } = await import('@/lib/push');
      const payload = {
        title: `New assignment · ${problem.ticket_no}`,
        body: `${problem.title}${notes ? ` — ${notes}` : ''}`,
        severity: 'high' as const,
        type: 'report_assigned',
        url: '/cadre/dashboard',
      };
      if (cadreId) pushToCadre(cadreId, payload);
      if (teamId) pushToTeam(teamId, payload);
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Assigned'); onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl max-w-md w-full p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">Assign Problem</h3>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{problem.ticket_no} · {problem.title}</p>
        <div className="space-y-3">
          <div><Label>Team</Label>
            <select value={teamId} onChange={e => setTeamId(e.target.value)} className="w-full h-10 rounded border border-input bg-background px-2 text-sm">
              <option value="">— Select team —</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name} {t.constituency ? `(${t.constituency})` : ''}</option>)}
            </select>
            {teams.length === 0 && <p className="text-[11px] text-muted-foreground mt-1">No active teams. Create one in the Teams tab.</p>}
          </div>
          <div><Label>Cadre (optional)</Label>
            <select value={cadreId} onChange={e => setCadreId(e.target.value)} className="w-full h-10 rounded border border-input bg-background px-2 text-sm">
              <option value="">— Select cadre —</option>
              {cadres.map(c => <option key={c.id} value={c.id}>{c.name} · {c.level} {c.constituency ? `· ${c.constituency}` : ''}</option>)}
            </select>
            {cadres.length === 0 && <p className="text-[11px] text-muted-foreground mt-1">No active cadres. Add one in the Cadres tab.</p>}
          </div>
          <div><Label>Notes</Label><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional brief" /></div>
          <Button onClick={submit} disabled={saving} className="w-full">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Assign
          </Button>
          <Button
            variant="outline"
            className="w-full"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                const { data, error } = await supabase.functions.invoke('ai-smart-assign', { body: { problem_id: problem.id } });
                if (error) throw error;
                if ((data as any)?.assigned) {
                  toast.success(`AI auto-assigned to ${(data as any).recommendation.cadre_name} (${(data as any).confidence}%)`);
                  onClose();
                } else if ((data as any)?.skipped) {
                  toast.info('Already assigned');
                } else {
                  toast.success(`AI recommends ${(data as any)?.recommendation?.cadre_name} — review in AI Operations`);
                  onClose();
                }
              } catch (e: any) { toast.error(e.message); }
              finally { setSaving(false); }
            }}
          >
            <Sparkles className="w-4 h-4 mr-2" /> AI Smart Assign
          </Button>
        </div>
      </div>
    </div>
  );
};
export default AssignProblemModal;
