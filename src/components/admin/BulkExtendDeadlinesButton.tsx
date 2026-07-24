import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarClock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AdminBulkExtendDeadlinesButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<3 | 5 | 7 | number>(3);
  const [through, setThrough] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc('admin_bulk_extend_deadlines' as any, { _days: Number(days), _through_date: through } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Extended deadlines on ${data ?? 0} task(s) by ${days} day(s)`);
    setOpen(false);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <CalendarClock className="w-4 h-4 mr-1" />Extend deadlines
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Extend deadlines in bulk</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1 block">Extend by</Label>
              <div className="flex gap-2">
                {[3, 5, 7].map(n => (
                  <Button key={n} type="button" variant={days === n ? 'default' : 'outline'} size="sm" onClick={() => setDays(n)}>
                    +{n} days
                  </Button>
                ))}
                <Input type="number" min={1} max={60} value={days} onChange={e => setDays(Number(e.target.value))} className="w-20 h-9" />
              </div>
            </div>
            <div>
              <Label className="mb-1 block">Affects tasks due on or before</Label>
              <Input type="date" value={through} onChange={e => setThrough(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Only tasks that are not yet done or skipped will be shifted. The change is logged in the admin audit log.
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

export default AdminBulkExtendDeadlinesButton;
