import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Users, Shield } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import TVKLogo from '@/components/TVKLogo';

type Role = 'cadre' | 'admin';

const MobileAuth: React.FC = () => {
  const { language, isBilingual } = useLanguage();
  const tt = (ta: string, en: string) => (isBilingual ? `${ta} / ${en}` : language === 'en' ? en : ta);
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>('cadre');
  const [checking, setChecking] = useState(true);

  // Auto-route already authenticated users to their dashboard
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (session) {
        const [{ data: roleRow }, { data: cadre }] = await Promise.all([
          supabase.from('user_roles').select('role').eq('user_id', session.user.id).maybeSingle(),
          supabase.from('cadres').select('id').eq('user_id', session.user.id).maybeSingle(),
        ]);
        if (roleRow && ['admin', 'moderator'].includes(roleRow.role)) return navigate('/admin/dashboard', { replace: true });
        if (cadre) return navigate('/cadre', { replace: true });
      }
      // If no active session, honor last-used role hint to skip the selection screen.
      try {
        const hint = localStorage.getItem('mc.role');
        if (hint === 'admin') return navigate('/admin', { replace: true });
        if (hint === 'cadre') return navigate('/cadre/login', { replace: true });
      } catch {}
      setChecking(false);
    })();
    return () => { mounted = false; };
  }, [navigate]);

  const handleContinue = () => {
    try { localStorage.setItem('mc.role', role); } catch {}
    if (role === 'admin') navigate('/admin');
    else navigate('/cadre/login');
  };

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-tvk-maroon via-tvk-maroon to-red-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl p-6 space-y-6">
        <div className="flex flex-col items-center text-center">
          <TVKLogo className="w-20 h-20 mb-3" />
          <h1 className="text-xl font-bold">{tt('TVK மக்கள் கனெக்ட்', 'TVK Makkal Connect')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tt('உள்நுழைய பாத்திரத்தைத் தேர்வு செய்க', 'Choose your role to continue')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setRole('cadre')}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              role === 'cadre'
                ? 'border-tvk-maroon bg-tvk-maroon/10'
                : 'border-border hover:border-tvk-maroon/50'
            }`}
          >
            <Users className={`w-6 h-6 mb-2 ${role === 'cadre' ? 'text-tvk-maroon' : 'text-muted-foreground'}`} />
            <div className="font-semibold text-sm">{tt('கேடர்கள்', 'Cadres')}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{tt('இயல்புநிலை', 'Default')}</div>
          </button>

          <button
            onClick={() => setRole('admin')}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              role === 'admin'
                ? 'border-tvk-maroon bg-tvk-maroon/10'
                : 'border-border hover:border-tvk-maroon/50'
            }`}
          >
            <Shield className={`w-6 h-6 mb-2 ${role === 'admin' ? 'text-tvk-maroon' : 'text-muted-foreground'}`} />
            <div className="font-semibold text-sm">{tt('நிர்வாகி', 'Admin')}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{tt('முழு அணுகல்', 'Full access')}</div>
          </button>
        </div>

        <Button onClick={handleContinue} variant="hero" className="w-full bg-tvk-maroon hover:bg-tvk-maroon/90">
          {tt('தொடர', 'Continue')}
        </Button>
      </div>
    </div>
  );
};

export default MobileAuth;
