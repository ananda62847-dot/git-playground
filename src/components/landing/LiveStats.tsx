import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Users, TrendingUp, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { throttle } from '@/lib/throttle';

interface Stats {
  reports: number;
  cadres: number;
  resolved: number;
  total: number;
}

const LiveStats: React.FC = () => {
  const [stats, setStats] = useState<Stats>({ reports: 0, cadres: 0, resolved: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_public_stats');
      if (error) throw error;
      const row: any = Array.isArray(data) ? data[0] : data;
      setStats({
        reports: Number(row?.problems_count || 0),
        cadres: Number(row?.cadres_count || 0),
        resolved: Number(row?.resolved_count || 0),
        total: Number(row?.total_submissions || 0),
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Throttle: at most one stats fetch per 30s regardless of insert burst.
  const throttledFetch = useMemo(() => throttle(fetchStats, 30_000), []);

  useEffect(() => {
    fetchStats();

    // Single multiplexed channel instead of two — half the WS overhead.
    const channel = supabase
      .channel('public-stats')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'problems' }, throttledFetch)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'problems' }, throttledFetch)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cadres' }, throttledFetch)
      .subscribe();

    // Polling safety net if WS drops.
    const interval = window.setInterval(fetchStats, 60_000);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(interval);
    };
  }, [throttledFetch]);

  const statItems = [
    {
      label: 'குறைகள் / Reports',
      value: stats.reports,
      icon: AlertTriangle,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'காடர்கள் / Cadres',
      value: stats.cadres,
      icon: Users,
      color: 'text-tvk-maroon',
      bgColor: 'bg-tvk-maroon/10',
    },
    {
      label: 'தீர்க்கப்பட்டது / Resolved',
      value: stats.resolved,
      icon: CheckCircle2,
      color: 'text-tvk-yellow',
      bgColor: 'bg-tvk-yellow/10',
    },
  ];

  const totalSubmissions = stats.total;

  return (
    <section className="py-12 md:py-20 bg-gradient-to-b from-tvk-maroon/5 to-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-tvk-maroon/10 text-tvk-maroon mb-4">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">நேரடி புள்ளிவிவரங்கள் / Live Statistics</span>
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3">
            மக்களின் குரல்
          </h2>
          <p className="text-lg text-muted-foreground">
            People's Voice - Community Participation
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto [&>*:nth-child(3)]:col-span-2 md:[&>*:nth-child(3)]:col-span-1">
          {statItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-tvk-maroon/5 to-tvk-yellow/5 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
                <div className="relative bg-card border border-border rounded-2xl p-6 text-center hover:border-tvk-maroon/30 transition-colors">
                  <div className={`inline-flex p-3 rounded-xl ${item.bgColor} mb-4`}>
                    <Icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                  {isLoading ? (
                    <div className="h-10 w-24 mx-auto bg-muted animate-pulse rounded" />
                  ) : (
                    <motion.p
                      key={item.value}
                      initial={{ scale: 1.2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-3xl md:text-4xl font-bold text-foreground mb-2"
                    >
                      {item.value.toLocaleString()}
                    </motion.p>
                  )}
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Total counter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center mt-10"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-tvk-maroon text-primary-foreground">
            <span className="text-sm md:text-base">மொத்த சமர்ப்பிப்புகள் / Total Submissions:</span>
            {isLoading ? (
              <span className="w-12 h-6 bg-primary-foreground/20 animate-pulse rounded" />
            ) : (
              <motion.span
                key={totalSubmissions}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                className="text-xl md:text-2xl font-bold"
              >
                {totalSubmissions.toLocaleString()}
              </motion.span>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default LiveStats;
