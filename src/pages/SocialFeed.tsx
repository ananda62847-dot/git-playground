import React, { useEffect, useState, useMemo } from 'react';
import { throttle } from '@/lib/throttle';
import { supabase } from '@/integrations/supabase/client';
import BackButton from '@/components/BackButton';
import { Megaphone, MapPin, Pin } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { fmtISTDate } from '@/lib/datetime';

const SocialFeed: React.FC = () => {
  const { language, isBilingual } = useLanguage();
  const tt = (ta: string, en: string) => (isBilingual ? `${ta} / ${en}` : language === 'en' ? en : ta);
  const [posts, setPosts] = useState<any[]>([]);

  const load = useMemo(() => async () => {
    const { data } = await supabase.from('social_posts').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(50);
    setPosts(data || []);
  }, []);
  const throttledLoad = useMemo(() => throttle(load, 15_000), [load]);

  useEffect(() => {
    load();
    const ch = supabase.channel('feed').on('postgres_changes', { event: '*', schema: 'public', table: 'social_posts' }, throttledLoad).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load, throttledLoad]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <BackButton to="/" />
      <main className="pt-20 pb-8">
        <div className="container mx-auto px-3 md:px-4 max-w-2xl">
          <h1 className="text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2"><Megaphone className="w-6 h-6" />{tt('அறிவிப்புகள் & புதுப்பிப்புகள்', 'Updates & Announcements')}</h1>
          <p className="text-sm text-muted-foreground mb-5">{tt('TVK அதிகாரிகளிடமிருந்து நேரடி அறிவிப்புகள்', 'Direct posts from TVK officials')}</p>
          {posts.length === 0 && <div className="text-center text-muted-foreground py-10 text-sm">{tt('பதிவுகள் இல்லை', 'No posts yet')}</div>}
          <div className="space-y-3">
            {posts.map(p => (
              <article key={p.id} className="bg-card border border-border rounded-xl p-4 md:p-5">
                <header className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    {p.title && <h2 className="font-bold text-base md:text-lg break-words">{p.title}</h2>}
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                      <span>{p.author_name || 'TVK'}</span>
                      {p.constituency && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{p.constituency}</span>}
                      <span>·</span><span>{fmtISTDate(p.created_at)}</span>
                      {p.pinned && <span className="inline-flex items-center gap-1 text-primary"><Pin className="w-3 h-3" />Pinned</span>}
                    </div>
                  </div>
                </header>
                {p.image_url && <img src={p.image_url} alt="" className="w-full max-h-80 object-cover rounded mb-2" />}
                <p className="text-sm whitespace-pre-wrap break-words">{p.body}</p>
              </article>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
export default SocialFeed;
