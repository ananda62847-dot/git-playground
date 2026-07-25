import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Undo2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  problemId: string;
  hasActiveAssignment?: boolean;
  onRecalled?: () => void;
}

const RecallAssignmentButton: React.FC<Props> = ({ problemId, hasActiveAssignment = true, onRecalled }) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (reason.trim().length < 3) return toast.error('Please add a reason');
    setBusy(true);
    const { data, error } = await supabase.rpc('admin_recall_assignment' as any, { _problem_id: problemId, _reason: reason } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Assignment reverted. ${data ?? 0} active assignment(s) recalled — you can now reassign.`);
    setOpen(false); setReason('');
    onRecalled?.();
  };

  if (!hasActiveAssignment) return null;

  return (
    <>
      <Button size="sm" variant="outline" className="h-7 text-[11px] text-amber-700 hover:bg-amber-50" onClick={() => setOpen(true)}>
        <Undo2 className="w-3 h-3 mr-1" />Revert assignment
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Revert assignment</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              The currently assigned cadre/team will lose edit access on this report and see a "Reverted by super admin" notice. You can then reassign it to a different cadre or team.
            </p>
            <Label>Reason (required)</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              placeholder="e.g. Cadre unresponsive, transferring to specialist team, wrong constituency" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={run} disabled={busy}>Revert &amp; reopen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RecallAssignmentButton;
