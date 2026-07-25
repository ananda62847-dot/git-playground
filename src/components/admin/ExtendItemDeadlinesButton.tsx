import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Kind = 'problem' | 'welfare' | 'corruption';

interface Props {
  kind: Kind;
  id: string;
  onChanged?: () => void;
  compact?: boolean;
}

const ExtendItemDeadlinesButton: React.FC<Props> = ({ kind, id, onChanged, compact }) => {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<number>(3);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc('admin_extend_entity_deadlines' as any, { _kind: kind, _id: id, _days: Number(days) } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Extended ${data ?? 0} task(s) on this item by ${days} day(s)`);
    setOpen(false);
    onChanged?.();
  };

  return (
    <>
      <Button size="sm" variant="outline" className={compact ? 'h-7 text-[11px]' : ''} onClick={() => setOpen(true)}>
        <CalendarPlus className={compact ? 'w-3 h-3 mr-1' : 'w-4 h-4 mr-1'} />Extend deadlines
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Extend deadlines for this item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label className="mb-1 block">Extend all pending tasks by</Label>
            <div className="flex gap-2 flex-wrap">
              {[3, 5, 7, 10, 14].map(n => (
                <Button key={n} type="button" variant={days === n ? 'default' : 'outline'} size="sm" onClick={() => setDays(n)}>
                  +{n} days
                </Button>
              ))}
              <Input type="number" min={1} max={60} value={days} onChange={e => setDays(Number(e.target.value))} className="w-20 h-9" />
            </div>
            <p className="text-xs text-muted-foreground">
              Only pending / in-progress tasks on this item are shifted. Change is logged in the admin audit trail.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={run} disabled={busy}>Extend</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExtendItemDeadlinesButton;
