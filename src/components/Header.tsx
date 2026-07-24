import React from 'react';
import { Link } from 'react-router-dom';
import TVKLogo from './TVKLogo';
import { Button } from './ui/button';
import { useLanguage, useLandingTranslation } from '@/contexts/LanguageContext';
import { Language } from './LanguageSelector';

const Header: React.FC = () => {
  const { language, setLanguage, isBilingual } = useLanguage();
  const { t } = useLandingTranslation();

  const handleLanguageChange = (lang: Language) => {
    if (language === lang) {
      setLanguage(null); // Toggle back to bilingual
    } else {
      setLanguage(lang);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="container mx-auto px-3 md:px-4 py-2 md:py-3">
        <div className="flex items-center justify-between gap-2">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-2 md:gap-3 group" aria-label="Home">
            <TVKLogo size="sm" />
            <div className="flex flex-col">
              <span className="text-sm md:text-lg font-bold text-primary group-hover:underline">Makkal Connect</span>
              <span className="text-[10px] md:text-xs text-muted-foreground font-tamil hidden sm:block">
                TVK · மக்கள் கனெக்ட்
              </span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden lg:flex items-center gap-4 xl:gap-6">
            <Link to="/#participate" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors whitespace-nowrap">
              {isBilingual ? 'தூண்கள் / Pillars' : (language === 'ta' ? 'தூண்கள்' : 'Pillars')}
            </Link>
            <Link to="/track" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors whitespace-nowrap">
              {isBilingual ? 'புகார் கண்காணி / Track' : (language === 'ta' ? 'புகார் கண்காணி' : 'Track')}
            </Link>
            <Link to="/#categories" className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors whitespace-nowrap">
              {isBilingual ? 'பிரிவுகள் / Categories' : (language === 'ta' ? 'பிரிவுகள்' : 'Categories')}
            </Link>
          </nav>

          {/* Language Selector & CTA */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Language Toggle */}
            <div className="flex items-center gap-1 rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => handleLanguageChange('ta')}
                className={`px-2 md:px-3 py-1.5 text-xs font-medium transition-colors ${
                  language === 'ta' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted'
                }`}
              >
                தமிழ்
              </button>
              <button
                onClick={() => handleLanguageChange('en')}
                className={`px-2 md:px-3 py-1.5 text-xs font-medium transition-colors ${
                  language === 'en' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted'
                }`}
              >
                EN
              </button>
            </div>

            {/* CTA */}
            <Link to="/?report=1">
              <Button variant="hero" size="sm" className="hidden sm:flex text-xs md:text-sm px-3 md:px-4">
                {isBilingual ? 'புகாரளி / Report' : (language === 'ta' ? 'புகாரளி' : 'Report')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
