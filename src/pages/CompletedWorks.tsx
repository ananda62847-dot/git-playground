import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BackButton from '@/components/BackButton';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Star, Image as ImageIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const CompletedWorksPage: React.FC = () => {
  const { language, isBilingual } = useLanguage();
  const tt = (ta: string, en: string) => (isBilingual ? `${ta} / ${en}` : language === 'en' ? en : ta);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('completed_works')
        .select('id,slug,title,cover_image_url,after_image_url,area,constituency,city,highlight')
        .eq('published', true)
        .order('highlight', { ascending: false })
        .order('created_at', { ascending: false });
      setRows(data || []); setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <main className="pt-16 pb-24">
        <BackButton to="/" />
        <section className="container mx-auto px-3 md:px-4 py-6 md:py-10">
          <div className="text-center mb-6 md:mb-10">
            <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">{tt('நிறைவு பெற்ற பணிகள்', 'Completed Works')}</div>
            <h1 className="text-2xl md:text-4xl font-bold mb-2">{tt('மக்களுக்கான நிறைவு பெற்ற பணிகள்', 'Works delivered for the people')}</h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">{tt('TVK மற்றும் களப்பணியாளர்களின் முயற்சியால் நிறைவு பெற்ற திட்டங்கள்.', 'Projects completed through TVK and on-ground efforts.')}</p>
          </div>

          {loading ? <div className="text-center text-sm text-muted-foreground py-10">Loading…</div> : rows.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-10">No works to display yet.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {rows.map(r => (
                <Link key={r.id} to={`/completed-works/${r.slug || r.id}`} className="group bg-card border border-border rounded-xl overflow-hidden text-left hover:shadow-lg hover:-translate-y-0.5 transition">
                  <div className="aspect-square bg-muted relative">
                    {(r.cover_image_url || r.after_image_url)
                      ? <img src={r.cover_image_url || r.after_image_url} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition" loading="lazy" />
                      : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-10 h-10 text-muted-foreground" /></div>}
                    {r.highlight && <Badge className="absolute top-2 left-2 bg-yellow-500 text-black text-[10px]"><Star className="w-3 h-3 mr-0.5" />Featured</Badge>}
                  </div>
                  <div className="p-2 md:p-3">
                    <div className="font-semibold text-xs md:text-sm line-clamp-2">{r.title}</div>
                    <div className="text-[10px] md:text-[11px] text-muted-foreground truncate mt-0.5">{[r.area, r.constituency].filter(Boolean).join(' · ') || r.city || '—'}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default CompletedWorksPage;
