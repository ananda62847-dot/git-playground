import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { constituenciesByCity as CONSTITUENCIES } from '@/lib/constituencies';
import { CADRE_LEVELS } from '@/lib/cadreLevels';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, MapPin, Search, Phone } from 'lucide-react';

const KnowYourCadres: React.FC = () => {
  const { language, isBilingual } = useLanguage();
  const tt = (ta: string, en: string) => (isBilingual ? `${ta} / ${en}` : language === 'en' ? en : ta);
  const cities = Object.keys(CONSTITUENCIES);
  const [city, setCity] = useState('');
  const [constituency, setConstituency] = useState('');
  const [selectedConstituency, setSelectedConstituency] = useState('');
  const [cadres, setCadres] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const constituencies = useMemo(() => (city ? CONSTITUENCIES[city] || [] : []), [city]);

  useEffect(() => { setConstituency(''); setSelectedConstituency(''); setCadres([]); }, [city]);

  useEffect(() => {
    if (!selectedConstituency) return;
    setLoading(true);
    supabase.rpc('get_public_cadres', { _constituency: selectedConstituency }).then(({ data }) => {
      setCadres(data || []); setLoading(false);
    });
  }, [selectedConstituency]);

  const labelOf = (lvl: string) => CADRE_LEVELS.find(l => l.id === lvl)?.label || lvl;

  return (
    <section className="py-10 md:py-16 bg-tvk-cream">
      <div className="container mx-auto px-3 md:px-4">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
            <Users className="w-4 h-4" />{tt('உங்கள் தொகுதி காடரே', 'Your Constituency Cadres')}
          </div>
          <h2 className="text-2xl md:text-3xl font-bold">{tt('உங்கள் தொகுதியில் உள்ள TVK காடரே', 'Know Your Cadres')}</h2>
          <p className="text-sm text-muted-foreground mt-1 px-2">{tt('உங்கள் பகுதியின் களப்பணி குழு', 'The field team serving your area')}</p>
        </div>

        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 mb-5">
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="h-11"><SelectValue placeholder={tt('மாவட்டம் தேர்வு செய்க', 'Select district')} /></SelectTrigger>
            <SelectContent className="max-h-[60vh]">
              {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={constituency} onValueChange={setConstituency} disabled={!city}>
            <SelectTrigger className="h-11"><SelectValue placeholder={tt('தொகுதி தேர்வு செய்க', 'Select constituency')} /></SelectTrigger>
            <SelectContent className="max-h-[60vh]">
              {constituencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button className="h-11" disabled={!constituency || loading} onClick={() => setSelectedConstituency(constituency)}>
            <Search className="w-4 h-4 mr-2" />{tt('பார்', 'View')}
          </Button>
        </div>

        <div className="max-w-5xl mx-auto">
          {loading && <div className="text-center text-sm text-muted-foreground py-6">{tt('ஏற்றுகிறது…', 'Loading…')}</div>}
          {!loading && selectedConstituency && cadres.length === 0 && <div className="text-center text-sm text-muted-foreground py-6">{tt('இந்த தொகுதியில் காடரே பட்டியல் விரைவில்.', 'No cadres registered yet for this constituency.')}</div>}
          {!loading && !selectedConstituency && <div className="text-center text-sm text-muted-foreground py-6 px-3">{tt('மாவட்டம் மற்றும் தொகுதியை தேர்ந்தெடுத்து காடரே பட்டியலைப் பாருங்கள்.', 'Select a district and constituency to view cadres.')}</div>}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {cadres.map(c => (
              <div key={c.id} className="bg-card border border-border rounded-xl p-3 text-center hover:shadow-md hover:-translate-y-0.5 transition">
                {c.profile_photo_url
                  ? <img src={c.profile_photo_url} alt={c.name} className="w-20 h-20 rounded-full mx-auto object-cover border-2 border-primary/30 shadow-sm" />
                  : <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto flex items-center justify-center text-primary font-bold text-2xl border-2 border-primary/20">{c.name?.[0] || '?'}</div>}
                <div className="font-semibold text-sm mt-2 break-words leading-tight">{c.name}</div>
                <div className="text-[10px] text-primary font-medium mt-0.5 break-words">{c.public_role_label || labelOf(c.level)}</div>
                <div className="text-[10px] text-muted-foreground mt-1 inline-flex items-center gap-1 justify-center"><MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{[c.area, c.ward_number ? `Ward ${c.ward_number}` : null].filter(Boolean).join(' · ') || '—'}</span></div>
                {c.show_phone && c.phone && (
                  <a href={`tel:${c.phone}`} className="mt-2 inline-flex items-center justify-center gap-1 text-[11px] font-medium text-primary bg-primary/5 hover:bg-primary/10 rounded-full px-2.5 py-1 w-full">
                    <Phone className="w-3 h-3" />{c.phone}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
export default KnowYourCadres;
