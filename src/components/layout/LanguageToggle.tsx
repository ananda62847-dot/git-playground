import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Languages } from 'lucide-react';

/**
 * Compact EN / த language toggle for admin & cadre top bars.
 * Persists selection into localStorage via the LanguageContext.
 */
const LanguageToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language, setLanguage } = useLanguage();
  const current: 'en' | 'ta' = language === 'ta' ? 'ta' : 'en';

  const change = (l: 'en' | 'ta') => {
    setLanguage(l);
    try { localStorage.setItem('tvk:lang', l); } catch {}
  };

  // Hydrate from localStorage once
  React.useEffect(() => {
    if (language) return;
    try {
      const saved = localStorage.getItem('tvk:lang');
      if (saved === 'en' || saved === 'ta') setLanguage(saved);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`inline-flex items-center rounded-full border border-border bg-background overflow-hidden text-[10px] font-semibold ${className}`}
      title="Language">
      <Languages className="w-3 h-3 mx-1.5 text-muted-foreground" />
      <button type="button" onClick={() => change('en')}
        className={`px-2 py-1 transition-colors ${current === 'en' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>EN</button>
      <button type="button" onClick={() => change('ta')}
        className={`px-2 py-1 transition-colors ${current === 'ta' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>த</button>
    </div>
  );
};

export default LanguageToggle;