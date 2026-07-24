import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { DEPARTMENTS } from '@/lib/departments';
import { fmtISTTime } from '@/lib/datetime';
import {
  Activity, CheckCircle, Clock, Users, Gauge, Radio, ShieldCheck, MapPin,
  TrendingUp, Sparkles, Building2, MessageSquare,
} from 'lucide-react';

interface Counters {
  total: number;
  resolved: number;
  active: number;
  avgResolutionDays: number | null;
  satisfactionPct: number | null;
  cadreTeams: number;
  resolvedToday: number;
  underVerification: number;
  citizensParticipated: number;
  constituenciesCovered: number;
  categoriesActive: number;
  byCategory: { label: string; count: number; pct: number }[];
  recent: { id: string; title: string; city: string | null; status: string; created_at: string }[];
}

const fmt = (n: number) => n.toLocaleString('en-IN');

const StatCard: React.FC<{ icon: any; label: string; value: string; trend?: string; accent?: string }> = ({
  icon: Icon, label, value, trend, accent = 'text-primary',
}) => (
  <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-lg transition group">
    <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/5 group-hover:bg-primary/10 transition" />
    <div className="relative flex items-start justify-between">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`mt-2 text-3xl font-extrabold ${accent}`}>{value}</div>
        {trend && (
          <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
            <TrendingUp className="w-3 h-3" /> {trend}
          </div>
        )}
      </div>
      <div className="relative">
        <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
        <span className={`relative inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 ${accent}`}>
          <Icon className="w-5 h-5" />
        </span>
      </div>
    </div>
  </div>
);

const Gauge100: React.FC<{ value: number; label: string }> = ({ value, label }) => {
  const pct = Math.max(0, Math.min(100, value));
  const r = 52;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <div className="flex flex-col items-center justify-center bg-card border border-border rounded-2xl p-5 shadow-sm">
      <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
        <circle cx="70" cy="70" r={r} stroke="hsl(var(--muted))" strokeWidth="12" fill="none" />
        <circle cx="70" cy="70" r={r} stroke="hsl(var(--primary))" strokeWidth="12" fill="none"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="-mt-24 text-3xl font-extrabold text-primary">{pct}</div>
      <div className="mt-16 text-xs uppercase tracking-wider text-muted-foreground text-center">{label}</div>
    </div>
  );
};

const GroundIntelligence: React.FC = () => {
  const { language, isBilingual } = useLanguage();
  const tt = (ta: string, en: string) => (isBilingual ? `${ta} / ${en}` : language === 'en' ? en : ta);
  const [data, setData] = useState<Counters | null>(null);

  useEffect(() => {
    (async () => {
      const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { data: rows } = await supabase
        .from('problems')
        .select('id,title,city,constituency,category,status,created_at,resolved_at,satisfaction_rating,reporter_phone,citizen_confirmed')
        .order('created_at', { ascending: false })
        .limit(1000);

      const list = rows ?? [];
      const total = list.length;
      const resolved = list.filter(r => r.status === 'completed' || r.status === 'citizen_confirmed').length;
      const active = total - resolved;
      const resolvedToday = list.filter(r => r.resolved_at && r.resolved_at >= since24h).length;
      const verified = list.filter(r => r.status === 'verified').length;

      const resolvedRows = list.filter(r => r.resolved_at);
      const avgMs = resolvedRows.length
        ? resolvedRows.reduce((a, r) => a + (new Date(r.resolved_at!).getTime() - new Date(r.created_at).getTime()), 0) / resolvedRows.length
        : 0;
      const avgResolutionDays = avgMs ? +(avgMs / (1000 * 3600 * 24)).toFixed(1) : null;

      const ratings = list.map(r => r.satisfaction_rating).filter((n): n is number => typeof n === 'number');
      const satisfactionPct = ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / (ratings.length * 5)) * 100) : null;

      const counts = new Map<string, number>();
      for (const r of list) if (r.category) counts.set(r.category, (counts.get(r.category) || 0) + 1);
      const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
      const sum = sorted.reduce((a, [, c]) => a + c, 0) || 1;
      const labelFor = (id: string) => {
        for (const d of DEPARTMENTS) {
          const c = d.categories.find(c => c.id === id);
          if (c) return tt(c.ta, c.en);
        }
        return id;
      };
      const byCategory = sorted.map(([id, c]) => ({ label: labelFor(id), count: c, pct: Math.round((c / sum) * 100) }));

      const phones = new Set(list.map(r => r.reporter_phone).filter(Boolean));
      const constituencies = new Set(list.map(r => r.constituency).filter(Boolean));
      const categories = new Set(list.map(r => r.category).filter(Boolean));

      const { count: teamsCount } = await supabase.from('teams').select('*', { count: 'exact', head: true }).eq('active', true);

      setData({
        total, resolved, active,
        avgResolutionDays,
        satisfactionPct,
        cadreTeams: teamsCount ?? 0,
        resolvedToday,
        underVerification: verified,
        citizensParticipated: phones.size,
        constituenciesCovered: constituencies.size,
        categoriesActive: categories.size,
        byCategory,
        recent: list.slice(0, 8).map(r => ({ id: r.id, title: r.title, city: r.city, status: r.status, created_at: r.created_at })),
      });
    })();
  }, []);

  const transparency = useMemo(() => {
    if (!data) return 0;
    const resRate = data.total ? (data.resolved / data.total) * 40 : 0;
    const speed = data.avgResolutionDays != null ? Math.max(0, 30 - Math.min(30, data.avgResolutionDays * 3)) : 15;
    const sat = data.satisfactionPct != null ? (data.satisfactionPct / 100) * 30 : 15;
    return Math.round(resRate + speed + sat);
  }, [data]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 pt-24 md:pt-28 pb-16">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Hero */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold mb-3">
              <span className="relative inline-flex w-2 h-2">
                <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping" />
                <span className="relative inline-block w-2 h-2 rounded-full bg-emerald-600" />
              </span>
              {tt('நேரடி களச் செயல்பாடு', 'Live operations')}
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              {tt('களத்தில் உளவுத்துறை', 'Ground Intelligence')}
            </h1>
            <p className="mt-2 text-base md:text-lg text-muted-foreground">
              {tt('தமிழ்நாடு பொது செயல்பாடுகள் டாஷ்போர்டு', 'Tamil Nadu Public Operations Dashboard')}
            </p>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl mx-auto">
              {tt(
                'தமிழ்நாடு முழுவதும் பொது புகார்கள் மற்றும் களச் செயல்பாடுகளில் இருந்து உண்மை-நேர புள்ளிவிபரங்கள்.',
                'Real-time statewide insights from public grievances and field operations across Tamil Nadu.'
              )}
            </p>
          </div>

          {/* Section 1: Statewide stats */}
          <section className="mb-12">
            <h2 className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />{tt('மாநில அளவிலான புள்ளிவிபரம்', 'Statewide Statistics')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
              <StatCard icon={MessageSquare} label={tt('மொத்த புகார்கள்', 'Total Reports')} value={fmt(data?.total ?? 0)} trend="↗ live" />
              <StatCard icon={CheckCircle} label={tt('தீர்க்கப்பட்டவை', 'Resolved')} value={fmt(data?.resolved ?? 0)} accent="text-emerald-600" />
              <StatCard icon={Activity} label={tt('செயலில் உள்ளவை', 'Active')} value={fmt(data?.active ?? 0)} accent="text-orange-600" />
              <StatCard icon={Clock} label={tt('சராசரி தீர்வு நாள்', 'Avg Resolution')} value={data?.avgResolutionDays != null ? `${data.avgResolutionDays}d` : '—'} />
              <StatCard icon={Users} label={tt('செயல் குழுக்கள்', 'Cadre Teams')} value={fmt(data?.cadreTeams ?? 0)} />
              <StatCard icon={Gauge} label={tt('திருப்தி', 'Satisfaction')} value={data?.satisfactionPct != null ? `${data.satisfactionPct}%` : '—'} accent="text-emerald-600" />
            </div>
          </section>

          {/* Section 2: Category analytics */}
          <section className="mb-12">
            <h2 className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" />{tt('வகை வாரியான பகுப்பாய்வு', 'Issue Category Analytics')}</h2>
            <div className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-sm">
              {data?.byCategory.length ? (
                <div className="space-y-4">
                  {data.byCategory.map((row, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium truncate pr-2">{row.label}</span>
                        <span className="text-muted-foreground tabular-nums">{row.pct}% · {fmt(row.count)}</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-tvk-yellow"
                          style={{ width: `${row.pct}%`, transition: 'width 1s ease' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">{tt('தரவு ஏற்றப்படுகிறது…', 'Loading data…')}</p>
              )}
            </div>
          </section>

          {/* Section 3: Resolution performance */}
          <section className="mb-12">
            <h2 className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-primary" />{tt('தீர்வு செயல்திறன்', 'Resolution Performance')}</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <StatCard icon={CheckCircle} label={tt('இன்று தீர்க்கப்பட்டவை', 'Resolved Today')} value={fmt(data?.resolvedToday ?? 0)} accent="text-emerald-600" />
              <StatCard icon={ShieldCheck} label={tt('சரிபார்ப்பில்', 'Under Verification')} value={fmt(data?.underVerification ?? 0)} />
              <StatCard icon={Clock} label={tt('சராசரி தீர்வு', 'Avg Completion')} value={data?.avgResolutionDays != null ? `${data.avgResolutionDays} d` : '—'} />
              <StatCard icon={Gauge} label={tt('திருப்தி', 'Satisfaction')} value={data?.satisfactionPct != null ? `${data.satisfactionPct}%` : '—'} accent="text-emerald-600" />
            </div>
          </section>

          {/* Section 5: Field ops + live feed */}
          <section className="mb-12 grid lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2">
              <h2 className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-2"><Radio className="w-5 h-5 text-primary" />{tt('கள செயல்பாடு', 'Field Operations Activity')}</h2>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <StatCard icon={Activity} label={tt('இன்று களப் பணிகள்', 'Field Visits Today')} value={fmt(data?.resolvedToday ?? 0)} />
                <StatCard icon={Users} label={tt('செயல் குழுக்கள்', 'Teams Active')} value={fmt(data?.cadreTeams ?? 0)} />
                <StatCard icon={MapPin} label={tt('நிலுவை பணிகள்', 'Pending Assignments')} value={fmt(data?.active ?? 0)} accent="text-orange-600" />
                <StatCard icon={ShieldCheck} label={tt('சரிபார்ப்பில்', 'Under Verification')} value={fmt(data?.underVerification ?? 0)} />
              </div>
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-2">
                <span className="relative inline-flex w-2.5 h-2.5">
                  <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping" />
                  <span className="relative w-2.5 h-2.5 rounded-full bg-emerald-600" />
                </span>
                {tt('நேரடி நடவடிக்கை', 'Live Activity')}
              </h2>
              <div className="bg-card border border-border rounded-2xl p-3 shadow-sm max-h-[340px] overflow-y-auto">
                {data?.recent.length ? (
                  <ul className="divide-y divide-border">
                    {data.recent.map(r => (
                      <li key={r.id} className="py-2.5 flex items-start gap-2">
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{r.title}</div>
                          <div className="text-[11px] text-muted-foreground">{r.city ?? '—'} · {r.status} · {fmtISTTime(r.created_at)}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground p-4">{tt('தரவு ஏற்றப்படுகிறது…', 'Loading…')}</p>
                )}
              </div>
            </div>
          </section>

          {/* Section 6: Transparency score */}
          <section className="mb-12">
            <h2 className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" />{tt('வெளிப்படைத்தன்மை மதிப்பெண்', 'Transparency Score')}</h2>
            <div className="grid md:grid-cols-3 gap-4 md:gap-6">
              <Gauge100 value={transparency} label={tt('ஆட்சி பதில் குறியீடு', 'Governance Response Index')} />
              <Gauge100 value={data?.total ? Math.round((data.resolved / data.total) * 100) : 0} label={tt('தீர்வு வீதம்', 'Resolution Rate')} />
              <Gauge100 value={data?.satisfactionPct ?? 0} label={tt('பொது திருப்தி', 'Public Confirmation')} />
            </div>
          </section>

          {/* Section 7: Public participation */}
          <section>
            <h2 className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-primary" />{tt('பொது பங்கேற்பு', 'Public Participation')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <StatCard icon={Users} label={tt('பங்கேற்ற குடிமக்கள்', 'Citizens Participated')} value={fmt(data?.citizensParticipated ?? 0)} />
              <StatCard icon={MessageSquare} label={tt('சமர்ப்பிக்கப்பட்ட புகார்கள்', 'Reports Submitted')} value={fmt(data?.total ?? 0)} />
              <StatCard icon={MapPin} label={tt('தொகுதிகள் உள்ளடக்கம்', 'Constituencies Covered')} value={fmt(data?.constituenciesCovered ?? 0)} />
              <StatCard icon={Building2} label={tt('செயலில் வகைகள்', 'Categories Active')} value={fmt(data?.categoriesActive ?? 0)} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default GroundIntelligence;
