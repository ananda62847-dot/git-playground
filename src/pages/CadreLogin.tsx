import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, LogIn } from 'lucide-react';
import TVKLogo from '@/components/TVKLogo';

const CadreLogin: React.FC = () => {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (session) {
        const { data: c } = await supabase.from('cadres').select('id').eq('user_id', session.user.id).maybeSingle();
        if (c) { nav('/cadre', { replace: true }); return; }
      }
      setChecking(false);
    })();
    return () => { mounted = false; };
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    try { localStorage.setItem('mc.role', 'cadre'); } catch {}
    toast.success('Welcome back!');
    nav('/cadre');
  };

  if (checking) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-tvk-maroon via-tvk-maroon to-red-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex flex-col items-center text-center">
          <TVKLogo className="w-16 h-16 mb-2" />
          <h1 className="text-xl font-bold">Cadre Login</h1>
          <p className="text-xs text-muted-foreground">Access your assigned tasks</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
          <div><Label>Password</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
          <Button type="submit" disabled={busy} className="w-full bg-tvk-maroon hover:bg-tvk-maroon/90" variant="hero">
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}<LogIn className="w-4 h-4 mr-2" />Login
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            No account? <Link to="/cadre/register" className="text-primary underline">Register</Link>
          </p>
          <p className="text-xs text-center">
            <Link to="/" className="text-muted-foreground underline">← Back to role selection</Link>
          </p>
        </form>
      </div>
    </div>
  );
};
export default CadreLogin;
