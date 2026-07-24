import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Activity, X, CheckCircle2 } from 'lucide-react';

const KEY = 'mc_activity_toast_seen_v1';

const LiveActivityToast: React.FC = () => {
  const [show, setShow] = useState(false);
  const [stats, setStats] = useState<{ recent: number; resolved: number } | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem(KEY)) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.rpc('get_public_stats');
        const row: any = Array.isArray(data) ? data[0] : data;
        if (!row || cancelled) return;
        const recent = Number(row.reports_last_4h || 0) + Number(row.suggestions_last_4h || 0);
        const resolved = Number(row.resolved_last_24h || 0);
        if (recent === 0 && resolved === 0) return;
        setStats({ recent, resolved });
        setTimeout(() => setShow(true), 6000);
        sessionStorage.setItem(KEY, '1');
        setTimeout(() => setShow(false), 18000);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  if (!show || !stats) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-3 right-3 md:left-auto md:right-6 md:w-80 z-[90] animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-3 pr-9 relative">
        <button
          onClick={() => setShow(false)}
          aria-label="Dismiss"
          className="absolute top-2 right-2 w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-xs font-semibold text-green-700 dark:text-green-400">Live · Coimbatore</span>
        </div>
        <div className="space-y-1 text-xs text-foreground">
          {stats.recent > 0 && (
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span><b>{stats.recent}+</b> people submitted in the past 4 hours</span>
            </div>
          )}
          {stats.resolved > 0 && (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
              <span><b>{stats.resolved}+</b> works resolved in the past 24 hours</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveActivityToast;
