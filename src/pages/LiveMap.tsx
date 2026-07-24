import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Popup, CircleMarker } from 'react-leaflet';
import { throttle } from '@/lib/throttle';
import 'leaflet/dist/leaflet.css';
import BackButton from '@/components/BackButton';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { TN_CENTROIDS } from '@/lib/tnCentroids';

const heatColor = (count: number) => count === 0 ? '#22c55e' : count <= 5 ? '#facc15' : count <= 20 ? '#fb923c' : '#ef4444';
const radiusFor = (count: number) => Math.min(40, 8 + Math.sqrt(count) * 3);

const LiveMap: React.FC = () => {
  const { language, isBilingual } = useLanguage();
  const tt = (ta: string, en: string) => (isBilingual ? `${ta} / ${en}` : language === 'en' ? en : ta);
  const [counts, setCounts] = useState<Record<string, { total: number; resolved: number }>>({});

  const load = async () => {
    const { data } = await supabase.rpc('get_city_problem_counts');
    const next: Record<string, { total: number; resolved: number }> = {};
    (data || []).forEach((row: any) => {
      next[row.city] = { total: Number(row.total || 0), resolved: Number(row.resolved || 0) };
    });
    setCounts(next);
  };

  const throttledLoad = useMemo(() => throttle(load, 30_000), []);
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const ch = supabase.channel('map').on('postgres_changes', { event: '*', schema: 'public', table: 'problems' }, throttledLoad).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [throttledLoad]);
  const totalReports = Object.values(counts).reduce((sum, city) => sum + city.total, 0);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <BackButton to="/" />
      <main className="pt-20 pb-24 md:pb-8">
        <div className="container mx-auto px-3 md:px-4">
          <h1 className="text-2xl md:text-3xl font-bold mb-1">{tt('நேரடி பிரச்சனை வரைபடம்', 'Live Problem Map')}</h1>
          <p className="text-sm text-muted-foreground mb-4">{tt('மாவட்ட வாரியான புகார் அடர்த்தி', 'District-wise report density')}</p>

          <div className="flex flex-wrap gap-3 text-[11px] mb-2 text-muted-foreground">
            <span className="font-semibold text-foreground">{totalReports} {tt('புகார்கள்', 'reports')}</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-600 inline-block" />0</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" />1–5</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-400 inline-block" />6–20</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" />20+</span>
          </div>

          <div className="rounded-xl overflow-hidden border border-border" style={{ height: 'min(70vh, calc(100dvh - 260px))' }}>
            <MapContainer center={[11.1271, 78.6569]} zoom={7} style={{ height: '100%', width: '100%' }}>
              <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {Object.entries(TN_CENTROIDS).map(([city, [lat, lng]]) => {
                const cityCount = counts[city]?.total || 0;
                return (
                <CircleMarker key={city} center={[lat, lng]} radius={radiusFor(cityCount)}
                  pathOptions={{ color: heatColor(cityCount), fillColor: heatColor(cityCount), fillOpacity: 0.55, weight: 1 }}>
                  <Popup>
                    <div className="text-xs">
                      <div className="font-bold">{city.split(' / ')[0]}</div>
                      <div className="text-muted-foreground">{city.split(' / ')[1]}</div>
                      <div>Total reports: <b>{cityCount}</b></div>
                      <div>Resolved: <b>{counts[city]?.resolved || 0}</b></div>
                    </div>
                  </Popup>
                </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
        </div>
      </main>
    </div>
  );
};
export default LiveMap;
