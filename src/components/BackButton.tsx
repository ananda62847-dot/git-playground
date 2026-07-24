import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const BackButton: React.FC<{ to?: string; className?: string }> = ({ to, className }) => {
  const nav = useNavigate();
  const { language, isBilingual } = useLanguage();
  const tt = (ta: string, en: string) => (isBilingual ? `${ta} / ${en}` : language === 'en' ? en : ta);
  return (
    <div className={`container mx-auto px-3 md:px-4 pt-3 ${className || ''}`}>
      <Button variant="ghost" size="sm" onClick={() => (to ? nav(to) : nav(-1))} className="-ml-2">
        <ArrowLeft className="w-4 h-4 mr-1" />{tt('பின்', 'Back')}
      </Button>
    </div>
  );
};
export default BackButton;