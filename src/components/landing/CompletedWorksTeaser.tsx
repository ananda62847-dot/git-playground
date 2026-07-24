import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const CompletedWorksTeaser: React.FC = () => {
  const { language, isBilingual } = useLanguage();
  const tt = (ta: string, en: string) => (isBilingual ? `${ta} / ${en}` : language === 'en' ? en : ta);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('completed_works').select('id,title,cover_image_url,after_image_url,area,constituency').eq('published', true).order('highlight', { ascending: false }).order('created_at', { ascending: false }).limit(4);
      setItems(data || []);
    })();
  }, []);

  return (
    <section className="py-10 md:py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-6 md:mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold mb-3">
            <CheckCircle2 className="w-4 h-4" />{tt('நிறைவு பெற்ற பணிகள்', 'Completed Works')}
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-2">{tt('மக்களுக்காக நிறைவு பெற்றது', 'Delivered for the people')}</h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">{tt('உண்மையான மாற்றங்களைப் பார்வையிடுங்கள் — முன் / பின் ஆதாரத்துடன்.', 'See real change with before / after proof.')}</p>
        </div>

        {items.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-5xl mx-auto mb-6">
            {items.map(it => (
              <Link key={it.id} to="/completed-works" className="group bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition">
                <div className="aspect-square bg-muted relative">
                  {(it.cover_image_url || it.after_image_url)
                    ? <img src={it.cover_image_url || it.after_image_url} alt={it.title} className="w-full h-full object-cover group-hover:scale-105 transition" loading="lazy" />
                    : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-muted-foreground" /></div>}
                </div>
                <div className="p-2"><div className="text-xs md:text-sm font-semibold line-clamp-2">{it.title}</div><div className="text-[10px] text-muted-foreground truncate">{[it.area, it.constituency].filter(Boolean).join(' · ')}</div></div>
              </Link>
            ))}
          </div>
        )}

        <div className="text-center px-2">
          <Link to="/completed-works" className="inline-block max-w-full">
            <Button variant="hero" size="lg" className="font-bold whitespace-normal break-words text-center h-auto py-3 leading-tight max-w-full">
              <span className="truncate">{tt('அனைத்து பணிகளும் பார்', 'View all works')}</span>
              <ArrowRight className="w-4 h-4 ml-1 flex-shrink-0" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CompletedWorksTeaser;
