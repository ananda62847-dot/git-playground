import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { XCircle, Loader2, Ban } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Table = 'problems' | 'welfare_issues' | 'fund_assistance_requests' | 'corruption_reports';

interface Props {
  table: Table;
  row: any;
  onDone: () => void;
}

/**
 * "Mark as False & Close" — freezes a report so no further edits can be done.
 * Sets closed_as_false=true, records reason/by/at and forces status=rejected.
 * Downstream modals should read `row.closed_as_false` to lock inputs.
 */
const FalseCloseControl: React.FC<Props> = ({ table, row, onDone }) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  if (row?.closed_as_false) {
    return (
      <div className="mt-3 rounded-md border border-red-300 bg-red-50 dark:bg-red-950/20 p-3 text-xs">
        <div className="flex items-center gap-2 font-semibold text-red-800 dark:text-red-200">
          <Ban className="w-4 h-4" />
          <span>Closed as false report</span>
          <Badge variant="destructive" className="ml-auto text-[10px]">Locked</Badge>
        </div>
        {row.closed_as_false_reason && (
          <div className="mt-1 text-red-900 dark:text-red-100"><b>Reason:</b> {row.closed_as_false_reason}</div>
        )}
        {row.closed_as_false_at && (
          <div className="text-red-700 dark:text-red-300 mt-0.5">on {new Date(row.closed_as_false_at).toLocaleString()}</div>
        )}
      </div>
    );
  }

  const submit = async () => {
    if (!reason.trim() || reason.trim().length < 5) {
      toast.error('Please enter a reason (min 5 characters).');
      return;
    }
    setBusy(true);
    const { data: userData } = await supabase.auth.getUser();
    const patch: any = {
      closed_as_false: true,
      closed_as_false_reason: reason.trim(),
      closed_as_false_at: new Date().toISOString(),
      closed_as_false_by: userData?.user?.id ?? null,
      status: table === 'fund_assistance_requests' ? 'rejected' : 'rejected',
    };
    const { error } = await supabase.from(table).update(patch).eq('id', row.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Marked as false and closed');
    setOpen(false);
    onDone();
  };

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="mt-3 border-red-300 text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
        onClick={() => setOpen(true)}
      >
        <XCircle className="w-4 h-4 mr-1" /> Mark as False & Close
      </Button>
    );
  }

  return (
    <div className="mt-3 rounded-md border border-red-300 bg-red-50 dark:bg-red-950/20 p-3 space-y-2">
      <div className="text-xs font-semibold text-red-800 dark:text-red-200">
        Reason for marking as false (required)
      </div>
      <Textarea
        rows={2}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. Duplicate/prank submission verified over phone with reporter."
        className="text-xs bg-background"
      />
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
        <Button size="sm" variant="destructive" onClick={submit} disabled={busy}>
          {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <XCircle className="w-3.5 h-3.5 mr-1" />}
          Confirm close
        </Button>
      </div>
      <p className="text-[10px] text-red-700 dark:text-red-300">
        Once closed as false, this report is locked — no status changes, updates, or assignments can be made.
      </p>
    </div>
  );
};

export default FalseCloseControl;
