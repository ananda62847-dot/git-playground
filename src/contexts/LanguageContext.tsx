import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Language, translations } from '@/components/LanguageSelector';

interface LanguageContextType {
  language: Language | null;
  setLanguage: (lang: Language | null) => void;
  t: typeof translations['ta'] | null;
  isBilingual: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language | null>(() => {
    try {
      // One-time migration: force Tamil default across the app. Users can still switch to EN.
      const FORCED_FLAG = 'tvk:lang:forced-ta:v1';
      if (!localStorage.getItem(FORCED_FLAG)) {
        localStorage.setItem('tvk:lang', 'ta');
        localStorage.setItem(FORCED_FLAG, '1');
        return 'ta';
      }
      const saved = localStorage.getItem('tvk:lang');
      if (saved === 'en' || saved === 'ta') return saved as Language;
    } catch {}
    return 'ta';
  });
  const setLanguage = (l: Language | null) => {
    setLanguageState(l);
    try { if (l) localStorage.setItem('tvk:lang', l); } catch {}
  };
  
  const t = language ? translations[language] : null;
  const isBilingual = language === null;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isBilingual }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Extended translations for landing page
export const landingTranslations = {
  ta: {
    // Header
    aboutUs: 'எங்களைப் பற்றி',
    participate: 'பங்களிக்கவும்',
    categories: 'பிரிவுகள்',
    startNow: 'தொடங்கு',
    
    // Hero
    partyName: 'தமிழக வெற்றி கழகம்',
    tagline: 'பிறப்பொக்கும் எல்லா உயிர்க்கும்',
    heroTitle: 'தமிழ்நாட்டின் எதிர்காலத்தை வடிவமைப்போம்',
    heroSubtitle: 'உங்கள் கருத்துக்கள் முக்கியம். தேர்தல் அறிக்கையை உருவாக்க உதவுங்கள்.',
    learnMore: 'மேலும் அறிய',
    
    // Stats
    contributors: 'பங்களிப்பாளர்கள்',
    ideas: 'யோசனைகள்',
    districts: 'மாவட்டங்கள்',
    
    // Vision & Mission
    visionMission: 'எங்கள் தொலைநோக்கு & இலக்கு',
    vision: 'தொலைநோக்கு',
    mission: 'இலக்கு',
    visionText: 'சமத்துவம், நீதி மற்றும் வளர்ச்சி அடிப்படையில் ஒரு புதிய தமிழ்நாட்டை உருவாக்குவது. ஒவ்வொரு குடிமகனும் கண்ணியமாகவும் சுதந்திரமாகவும் வாழ வேண்டும்.',
    missionText: 'மக்கள் பங்கேற்பு மூலம் ஒரு வலுவான தேர்தல் அறிக்கையை உருவாக்குதல். உங்கள் குரல் எங்கள் கொள்கையாக மாறும்.',
    
    // Ideology
    coreIdeology: 'TVK – மைய கருத்தியல்',
    equality: 'சமத்துவம்',
    integrity: 'நேர்மை',
    development: 'வளர்ச்சி',
    safety: 'பாதுகாப்பு',
    
    // Leadership
    leadership: 'முன்னோடி தலைவர்கள்',
    leadershipSubtitle: 'தமிழ் மக்களின் உரிமைக்காக போராடிய தலைவர்கள்',
    
    // Kolgai
    kolgai: 'கொள்கைகள்',
    kolgaiSubtitle: 'நாங்கள் நம்பும் அடிப்படை கொள்கைகள்',
    
    // Privacy
    privacySecurity: 'தனியுரிமை & பாதுகாப்பு',
    encryptedData: 'குறியாக்கப்பட்ட தரவு',
    anonymizedIdentity: 'அடையாளம் மறைக்கப்படும்',
    transparency: 'வெளிப்படைத்தன்மை',
    peopleRights: 'மக்கள் உரிமை',
    
    // Participate
    whyParticipate: 'ஏன் பங்கேற்க வேண்டும்?',
    yourVoice: 'உங்கள் குரல்',
    manifesto: 'தேர்தல் அறிக்கை',
    secure: 'பாதுகாப்பு',
    
    // CTA
    contributeToday: 'இன்றே பங்களிக்கவும்!',
    buildTogether: 'ஒன்றாக சிறந்த தமிழ்நாட்டை உருவாக்குவோம்',
    
    // Live Stats
    liveStats: 'நேரடி புள்ளிவிவரங்கள்',
    suggestions: 'யோசனைகள்',
    grievances: 'குறைகள்',
    volunteers: 'தன்னார்வலர்கள்',
  },
  en: {
    // Header
    aboutUs: 'About Us',
    participate: 'Participate',
    categories: 'Categories',
    startNow: 'Start Now',
    
    // Hero
    partyName: 'Tamilaga Vettri Kazhagam',
    tagline: 'All are equal by birth',
    heroTitle: 'Shape the Future of Tamil Nadu',
    heroSubtitle: 'Your voice matters. Help shape the election manifesto.',
    learnMore: 'Learn More',
    
    // Stats
    contributors: 'Contributors',
    ideas: 'Ideas',
    districts: 'Districts',
    
    // Vision & Mission
    visionMission: 'Our Vision & Mission',
    vision: 'Vision',
    mission: 'Mission',
    visionText: 'To build a new Tamil Nadu based on equality, justice, and development. Every citizen should live with dignity and freedom.',
    missionText: 'To create a strong election manifesto through people\'s participation. Your voice becomes our policy.',
    
    // Ideology
    coreIdeology: 'TVK – Core Ideology',
    equality: 'Equality',
    integrity: 'Integrity',
    development: 'Development',
    safety: 'Safety',
    
    // Leadership
    leadership: 'Pioneer Leaders',
    leadershipSubtitle: 'Leaders who fought for Tamil people\'s rights',
    
    // Kolgai
    kolgai: 'Principles',
    kolgaiSubtitle: 'Fundamental principles we believe in',
    
    // Privacy
    privacySecurity: 'Privacy & Security',
    encryptedData: 'Encrypted Data',
    anonymizedIdentity: 'Anonymized Identity',
    transparency: 'Transparency',
    peopleRights: 'People\'s Rights',
    
    // Participate
    whyParticipate: 'Why Participate?',
    yourVoice: 'Your Voice',
    manifesto: 'Manifesto',
    secure: 'Secure',
    
    // CTA
    contributeToday: 'Contribute Today!',
    buildTogether: 'Let\'s build a better Tamil Nadu together',
    
    // Live Stats
    liveStats: 'Live Statistics',
    suggestions: 'Suggestions',
    grievances: 'Grievances',
    volunteers: 'Volunteers',
  },
};

export const useLandingTranslation = () => {
  const { language, isBilingual } = useLanguage();
  
  const getText = (taText: string, enText: string) => {
    if (isBilingual) return { ta: taText, en: enText };
    return language === 'ta' ? { ta: taText } : { en: enText };
  };
  
  const t = language ? landingTranslations[language] : null;
  
  return { t, isBilingual, language, getText };
};
