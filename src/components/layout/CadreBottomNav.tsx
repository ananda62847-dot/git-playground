import React from 'react';
import { Brain, ListChecks, FilePlus, History, Zap } from 'lucide-react';
import { useT, useLang } from '@/lib/i18n/cadreT';

export type CadreTabKey = 'actions' | 'ai_inbox' | 'problems' | 'welfare' | 'rank' | 'profile' | 'file_report' | 'history';

interface Props {
  active: string;
  onChange: (k: CadreTabKey) => void;
}

const CadreBottomNav: React.FC<Props> = ({ active, onChange }) => {
  const T = useT();
  const lang = useLang();
  const ITEMS: { key: CadreTabKey; icon: any; label: string; center?: boolean }[] = [
    { key: 'actions', icon: Zap, label: T.nav_actions },
    { key: 'ai_inbox', icon: Brain, label: T.nav_inbox },
    { key: 'file_report', icon: FilePlus, label: T.nav_file, center: true },
    { key: 'problems', icon: ListChecks, label: T.nav_tasks },
    { key: 'history', icon: History, label: T.nav_history },
  ];
  return (<>
    <div className="h-20 md:hidden" aria-hidden />
    <nav
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-background/95 backdrop-blur-xl border-t border-border shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
      aria-label="Cadre bottom navigation"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-5 relative">
        {ITEMS.map(({ key, icon: Icon, label, center }) => {
          const isActive = active === key;
          if (center) {
            return (
              <li key={key} className="min-w-0 relative flex justify-center">
                <button
                  type="button"
                  onClick={() => onChange(key)}
                  aria-label={label}
                  className={`absolute -top-5 w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-primary/40'
                      : 'bg-card border border-border text-muted-foreground'
                  }`}
                >
                  <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                </button>
                <span lang={lang} className={`mt-12 text-[10px] font-semibold tamil-safe text-center px-1 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span>
              </li>
            );
          }
          return (
            <li key={key} className="min-w-0 relative">
              <button
                type="button"
                onClick={() => onChange(key)}
                className={`w-full min-h-[56px] flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold active:scale-95 transition-all ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} strokeWidth={isActive ? 2.5 : 2} fill={isActive ? 'currentColor' : 'none'} fillOpacity={isActive ? 0.15 : 0} />
                <span lang={lang} className="tamil-safe text-center leading-tight px-0.5 max-w-full">{label}</span>
                {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-b bg-primary" />}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  </>);
};

export default CadreBottomNav;
