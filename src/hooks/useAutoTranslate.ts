import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

// Consider a string "already Tamil" only if the majority of its letters are in the Tamil block.
// This ensures mixed strings ("Verify KYC ஆவணம்") still get translated when the user picks Tamil.
const isMostlyTamil = (s: string) => {
  const letters = s.match(/[A-Za-z\u0B80-\u0BFF]/g) || [];
  if (letters.length === 0) return true; // digits/punctuation only — nothing to translate
  const tamil = letters.filter(c => /[\u0B80-\u0BFF]/.test(c)).length;
  return tamil / letters.length >= 0.6;
};

// items: array of {id, text}. Returns map id->translatedText (or original if not translated).
export function useAutoTranslate(items: { id: string; text?: string | null }[]) {
  const { language } = useLanguage();
  const enabled = language === 'ta';
  const cleaned = useMemo(
    () => items.filter(i => i.text && i.text.trim().length > 0 && !isMostlyTamil(i.text)),
    [items],
  );
  const key = useMemo(() => cleaned.map(i => `${i.id}::${i.text}`).join('|'), [cleaned]);
  const [map, setMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!enabled || cleaned.length === 0) { setMap({}); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('translate-text', {
          body: { items: cleaned.map(c => ({ id: c.id, text: c.text })), target: 'ta' },
        });
        if (error || cancelled) return;
        const next: Record<string, string> = {};
        (data?.results || []).forEach((r: { id: string; translated: string }) => { next[r.id] = r.translated; });
        setMap(next);
      } catch (e) { /* silent */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return (id: string, fallback?: string | null) => map[id] || fallback || '';
}
