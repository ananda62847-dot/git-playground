import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, AlertTriangle, Megaphone, Map } from 'lucide-react';

const items = [
  { to: '/', icon: Home, label: 'Home', match: (p: string) => p === '/' },
  { to: '/track', icon: AlertTriangle, label: 'Report', match: (p: string) => p === '/track' },
  { to: '/map', icon: Map, label: 'Map', match: (p: string) => p === '/map' },
  { to: '/feed', icon: Megaphone, label: 'Feed', match: (p: string) => p === '/feed' },
];

const MobileBottomNav: React.FC = () => {
  const { pathname } = useLocation();
  return (
    <>
      <div className="h-16 md:hidden" aria-hidden />
      <nav
        className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-background/95 backdrop-blur-md border-t border-border shadow-[0_-2px_12px_rgba(0,0,0,0.06)]"
        aria-label="Primary mobile navigation"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="grid grid-cols-4">
          {items.map(({ to, icon: Icon, label, match }) => {
            const active = match(pathname);
            return (
              <li key={to} className="min-w-0 relative">
                <NavLink
                  to={to}
                  className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                    active ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? 'scale-110' : ''} transition-transform`} />
                  <span className="truncate max-w-full">{label}</span>
                  {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-b bg-primary" />}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
};

export default MobileBottomNav;
