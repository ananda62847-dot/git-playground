import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Clock, ThumbsUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const TrustTicker: React.FC = () => {
  const { language, isBilingual } = useLanguage();
  const tt = (ta: string, en: string) => (isBilingual ? `${ta} / ${en}` : language === 'en' ? en : ta);
  const [stats, setStats] = useState({ solvedToday: 0, avgHrs: 0, satisfaction: 0 });

  useEffect(() => {
    const load = async () => {
      const since = new Date(); since.setHours(0, 0, 0, 0);
      const { count: solved } = await supabase.from('problems').select('*', { count: 'exact', head: true })
        .eq('status', 'completed').gte('resolved_at', since.toISOString());
      const { data: rec } = await supabase.from('problems').select('created_at,resolved_at')
        .eq('status', 'completed').not('resolved_at', 'is', null).order('resolved_at', { ascending: false }).limit(50);
      const avg = rec?.length
        ? rec.reduce((s, r) => s + (new Date(r.resolved_at!).getTime() - new Date(r.created_at).getTime()), 0) / rec.length / 3600000
        : 0;
      const { data: surveys } = await supabase.from('satisfaction_surveys').select('rating').limit(200);
      const sat = surveys?.length ? (surveys.reduce((s, r) => s + r.rating, 0) / surveys.length) * 20 : 0;
      setStats({ solvedToday: solved || 0, avgHrs: Math.round(avg), satisfaction: Math.round(sat) });
    };
    load();
    const ch = supabase.channel('trust-ticker').on('postgres_changes', { event: '*', schema: 'public', table: 'problems' }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const items = [
    { icon: CheckCircle2, color: 'text-green-600 bg-green-100', val: stats.solvedToday, ta: 'இன்று தீர்க்கப்பட்டவை', en: 'Solved today' },
    { icon: Clock, color: 'text-blue-600 bg-blue-100', val: stats.avgHrs ? `${stats.avgHrs}h` : '—', ta: 'சராசரி தீர்வு நேரம்', en: 'Avg resolution' },
    { icon: ThumbsUp, color: 'text-purple-600 bg-purple-100', val: stats.satisfaction ? `${stats.satisfaction}%` : '—', ta: 'குடிமக்கள் திருப்தி', en: 'Citizen satisfaction' },
  ];

  return (
    <section className="py-8 md:py-10 bg-card border-y border-border">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-3 gap-3 md:gap-6 max-w-3xl mx-auto">
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <div key={i} className="text-center">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full ${it.color} flex items-center justify-center mx-auto mb-2`}>
                  <Icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div className="text-xl md:text-3xl font-bold text-foreground">{it.val}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground leading-tight">{tt(it.ta, it.en)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TrustTicker;
