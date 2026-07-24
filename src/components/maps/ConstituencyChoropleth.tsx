import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { supabase } from '@/integrations/supabase/client';
import { TN_CENTROIDS } from '@/lib/tnCentroids';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import 'leaflet/dist/leaflet.css';

const colorFor = (count: number) => {
  if (count === 0) return '#22c55e';   // green
  if (count <= 5) return '#facc15';    // yellow
  if (count <= 20) return '#fb923c';   // orange
  return '#ef4444';                    // red
};
const statusColor = (status: string) => {
  if (['resolved', 'completed', 'citizen_confirmed'].includes(status)) return '#22c55e';
  if (['acknowledged', 'in_progress', 'assigned', 'claimed', 'work_started'].includes(status)) return '#f59e0b';
  return '#ef4444';
};
const radiusFor = (count: number) => Math.min(40, 8 + Math.sqrt(count) * 3);

interface PopupData { total: number; resolved: number; categories: { category: string; total: number; resolved: number }[] }

interface Props {
  allowedConstituencies?: string[];
  allowModeSwitch?: boolean;
}

const ConstituencyChoropleth: React.FC<Props> = ({ allowedConstituencies, allowModeSwitch = true }) => {
  const [counts, setCounts] = useState<Record<string, { total: number; resolved: number }>>({});
  const [popupData, setPopupData] = useState<Record<string, PopupData>>({});
  const [issues, setIssues] = useState<any[]>([]);
  const [mode, setMode] = useState<'district' | 'issues'>('district');
  const [hideResolved, setHideResolved] = useState(false);
  const scoped = !!allowedConstituencies?.length;

  const refresh = async () => {
    const map: Record<string, { total: number; resolved: number }> = {};
    if (scoped) {
      const { data } = await supabase
        .from('problems')
        .select('id,ticket_no,title,city,constituency,status,latitude,longitude,support_count')
        .in('constituency', allowedConstituencies!)
        .limit(1000);
      (data || []).forEach((p: any) => {
        if (!p.city) return;
        if (!map[p.city]) map[p.city] = { total: 0, resolved: 0 };
        map[p.city].total += 1;
        if (['resolved', 'completed', 'citizen_confirmed'].includes(p.status)) map[p.city].resolved += 1;
      });
      setIssues((data || []).filter((p: any) => p.latitude && p.longitude));
    } else {
      const [{ data }, { data: gps }] = await Promise.all([
        supabase.rpc('get_city_problem_counts'),
        supabase.from('problems').select('id,ticket_no,title,city,constituency,status,latitude,longitude,support_count').not('latitude', 'is', null).not('longitude', 'is', null).limit(1000),
      ]);
      (data || []).forEach((r: any) => { map[r.city] = { total: Number(r.total), resolved: Number(r.resolved) }; });
      setIssues(gps || []);
    }
    setCounts(map);
  };

  useEffect(() => {
    refresh();
    const channel = supabase.channel('choropleth-problems')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'problems' }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [allowedConstituencies?.join('|')]);

  const visibleCentroids = useMemo(() => {
    const entries = Object.entries(TN_CENTROIDS);
    if (!scoped) return entries;
    return entries.filter(([city]) => counts[city]?.total > 0);
  }, [counts, scoped]);

  const loadPopup = async (city: string) => {
    if (popupData[city]) return;
    const { data } = await supabase.rpc('get_city_breakdown', { _city: city });
    setPopupData(prev => ({
      ...prev,
      [city]: {
        total: counts[city]?.total || 0,
        resolved: counts[city]?.resolved || 0,
        categories: (data as any[]) || [],
      },
    }));
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {allowModeSwitch && (
          <div className="flex flex-wrap items-center gap-2 p-3 border-b">
            <Button size="sm" variant={mode === 'district' ? 'default' : 'outline'} onClick={() => setMode('district')}>District circles</Button>
            <Button size="sm" variant={mode === 'issues' ? 'default' : 'outline'} onClick={() => setMode('issues')}>Issue circles</Button>
            {mode === 'issues' && (
              <label className="flex items-center gap-1.5 text-xs ml-2 cursor-pointer">
                <input type="checkbox" checked={hideResolved} onChange={e => setHideResolved(e.target.checked)} />
                Hide resolved
              </label>
            )}
          </div>
        )}
        <div style={{ height: 500, width: '100%' }}>
          <MapContainer center={[11.1271, 78.6569]} zoom={7} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
            <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {mode === 'district' && visibleCentroids.map(([city, [lat, lng]]) => {
              const c = counts[city]?.total || 0;
              return (
                <CircleMarker
                  key={city}
                  center={[lat, lng]}
                  radius={radiusFor(c)}
                  pathOptions={{ color: colorFor(c), fillColor: colorFor(c), fillOpacity: 0.55, weight: 1 }}
                  eventHandlers={{ click: () => loadPopup(city) }}
                >
                  <Popup minWidth={220}>
                    <div className="space-y-1">
                      <div className="font-semibold">{city.split(' / ')[0]}</div>
                      <div className="text-xs text-muted-foreground">{city.split(' / ')[1]}</div>
                      <div className="flex gap-2 text-xs my-2">
                        <Badge>{counts[city]?.total || 0} total</Badge>
                        <Badge variant="outline" className="text-green-700">{counts[city]?.resolved || 0} resolved</Badge>
                      </div>
                      {popupData[city]?.categories?.length ? (
                        <>
                          <div className="text-[11px] font-semibold mt-1">Top issues</div>
                          <div className="space-y-0.5 max-h-40 overflow-auto">
                            {popupData[city].categories.slice(0, 6).map(cat => (
                              <div key={cat.category} className="flex justify-between text-[11px]">
                                <span className="truncate">{cat.category}</span>
                                <span className="text-muted-foreground">{cat.resolved}/{cat.total}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (popupData[city] ? <div className="text-[11px] text-muted-foreground">No category data</div> : <div className="text-[11px] text-muted-foreground">Loading…</div>)}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
            {allowModeSwitch && mode === 'issues' && issues
              .filter(p => !hideResolved || !['resolved', 'completed', 'citizen_confirmed'].includes(p.status))
              .map((p) => (
              <CircleMarker
                key={p.id}
                center={[Number(p.latitude), Number(p.longitude)]}
                radius={Math.min(24, 6 + Math.max(1, p.support_count || 1) * 1.5)}
                pathOptions={{ color: statusColor(p.status), fillColor: statusColor(p.status), fillOpacity: 0.5, weight: 1 }}
              >
                <Popup minWidth={220}>
                  <div className="space-y-1 text-xs">
                    <div className="font-semibold">{p.title}</div>
                    <div className="text-muted-foreground">{p.ticket_no} · {p.constituency || p.city}</div>
                    <Badge variant="outline">{p.status}</Badge>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
        <div className="flex items-center gap-3 p-3 text-xs flex-wrap border-t">
          <span className="font-semibold">Legend:</span>
          {mode === 'issues' ? (
            <>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: '#ef4444' }} />Reported</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: '#f59e0b' }} />In progress</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: '#22c55e' }} />Resolved</span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: '#22c55e' }} />0</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: '#facc15' }} />1–5</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: '#fb923c' }} />6–20</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ background: '#ef4444' }} />20+</span>
            </>
          )}
          <span className="ml-auto text-muted-foreground">Live · click for details</span>
        </div>
      </CardContent>
    </Card>
  );
};
export default ConstituencyChoropleth;
