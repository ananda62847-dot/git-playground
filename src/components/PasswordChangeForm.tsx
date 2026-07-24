import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const PasswordChangeForm: React.FC = () => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (next.length < 8) return toast.error('New password must be at least 8 characters');
    if (next !== confirm) return toast.error('New passwords do not match');
    setBusy(true);
    // Re-auth by attempting sign-in with current password
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { setBusy(false); return toast.error('No email on account'); }
    const { error: reauthErr } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
    if (reauthErr) { setBusy(false); return toast.error('Current password is incorrect'); }
    const { error } = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Password updated');
    setCurrent(''); setNext(''); setConfirm('');
  };

  return (
    <div className="bg-card border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Change password</h3>
      </div>
      <div>
        <Label className="text-xs">Current password</Label>
        <Input type="password" className="mt-1" value={current} onChange={e => setCurrent(e.target.value)} autoComplete="current-password" />
      </div>
      <div>
        <Label className="text-xs">New password</Label>
        <Input type="password" className="mt-1" value={next} onChange={e => setNext(e.target.value)} autoComplete="new-password" />
      </div>
      <div>
        <Label className="text-xs">Confirm new password</Label>
        <Input type="password" className="mt-1" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" />
      </div>
      <Button onClick={submit} disabled={busy || !current || !next || !confirm} className="w-full">
        {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
        Update password
      </Button>
    </div>
  );
};

export default PasswordChangeForm;