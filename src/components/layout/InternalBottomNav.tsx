import React, { useState } from 'react';
import { MoreHorizontal, LogOut, type LucideIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

export type BottomNavItem = { title: string; icon: LucideIcon; value: string };

interface Props {
  items: BottomNavItem[];
  activeValue: string;
  onSelect: (v: string) => void;
  onLogout?: () => void;
  primaryCount?: number; // how many items to show inline before "More" (default 4)
}

const InternalBottomNav: React.FC<Props> = ({ items, activeValue, onSelect, onLogout, primaryCount = 4 }) => {
  const [open, setOpen] = useState(false);
  const primary = items.slice(0, primaryCount);
  const overflow = items.slice(primaryCount);
  const showMore = overflow.length > 0 || !!onLogout;

  const Btn = ({ it, active, onClick }: { it: BottomNavItem; active: boolean; onClick: () => void }) => {
    const Icon = it.icon;
    return (
      <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors min-w-0 w-full ${
          active ? 'text-primary' : 'text-muted-foreground'
        }`}
      >
        <Icon className={`w-5 h-5 ${active ? 'scale-110' : ''} transition-transform`} />
        <span className="truncate max-w-full px-1">{it.title}</span>
      </button>
    );
  };

  return (
    <>
      <div className="h-16 md:hidden" aria-hidden />
      <nav
        className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-background/95 backdrop-blur-md border-t border-border shadow-[0_-2px_12px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Dashboard mobile navigation"
      >
        <div className={`grid`} style={{ gridTemplateColumns: `repeat(${primary.length + (showMore ? 1 : 0)}, minmax(0, 1fr))` }}>
          {primary.map(it => (
            <Btn key={it.value} it={it} active={activeValue === it.value} onClick={() => onSelect(it.value)} />
          ))}
          {showMore && (
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button className="flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground min-w-0 w-full">
                  <MoreHorizontal className="w-5 h-5" />
                  <span>More</span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl max-h-[55vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
                <SheetHeader>
                  <SheetTitle>More</SheetTitle>
                </SheetHeader>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {overflow.map(it => {
                    const Icon = it.icon;
                    const active = activeValue === it.value;
                    return (
                      <button
                        key={it.value}
                        onClick={() => { onSelect(it.value); setOpen(false); }}
                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                          active ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground hover:bg-muted'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-[11px] font-medium text-center leading-tight">{it.title}</span>
                      </button>
                    );
                  })}
                  {onLogout && (
                    <button
                      onClick={() => { setOpen(false); onLogout(); }}
                      className="flex flex-col items-center gap-1 p-3 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="text-[11px] font-medium">Logout</span>
                    </button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </nav>
    </>
  );
};

export default InternalBottomNav;
