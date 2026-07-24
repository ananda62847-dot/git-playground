import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Share, Plus, Smartphone, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import TVKLogo from '@/components/TVKLogo';

const InstallApp: React.FC = () => {
  const { language, isBilingual } = useLanguage();
  const tt = (ta: string, en: string) => (isBilingual ? `${ta} / ${en}` : language === 'en' ? en : ta);
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const triggerInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <ChevronLeft className="w-4 h-4" /> {tt('பின்', 'Back')}
        </button>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <div className="text-center">
            <TVKLogo className="w-20 h-20 mx-auto mb-3" />
            <h1 className="text-xl font-bold">{tt('மொபைல் ஆப்', 'Install Mobile App')}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {tt('உங்கள் முகப்புத் திரையில் சேர்க்கவும்', 'Add to your home screen for the full app experience')}
            </p>
          </div>

          {installed ? (
            <div className="text-center py-4 text-green-600 text-sm">✓ {tt('நிறுவப்பட்டது!', 'Installed!')}</div>
          ) : deferredPrompt ? (
            <Button onClick={triggerInstall} className="w-full bg-tvk-maroon hover:bg-tvk-maroon/90" variant="hero">
              <Download className="w-4 h-4 mr-2" />
              {tt('இப்போது நிறுவ', 'Install Now')}
            </Button>
          ) : isIOS ? (
            <div className="space-y-3 text-sm">
              <p className="font-semibold">{tt('iPhone / iPad-இல்:', 'On iPhone / iPad:')}</p>
              <ol className="space-y-2 text-muted-foreground">
                <li className="flex gap-2"><span className="font-bold text-tvk-maroon">1.</span>
                  {tt('Safari-இல்', 'In Safari, tap')} <Share className="w-4 h-4 inline" /> {tt('பகிர் அழுத்தவும்', 'Share button')}
                </li>
                <li className="flex gap-2"><span className="font-bold text-tvk-maroon">2.</span>
                  "Add to Home Screen" <Plus className="w-4 h-4 inline" /> {tt('தேர்வு', 'select')}
                </li>
                <li className="flex gap-2"><span className="font-bold text-tvk-maroon">3.</span>
                  {tt('"Add" அழுத்தவும்', 'Tap "Add"')}
                </li>
              </ol>
            </div>
          ) : isAndroid ? (
            <div className="space-y-3 text-sm">
              <p className="font-semibold">{tt('Android-இல்:', 'On Android:')}</p>
              <ol className="space-y-2 text-muted-foreground">
                <li className="flex gap-2"><span className="font-bold text-tvk-maroon">1.</span>
                  {tt('Chrome மெனு (⋮) திற', 'Open Chrome menu (⋮)')}
                </li>
                <li className="flex gap-2"><span className="font-bold text-tvk-maroon">2.</span>
                  "Install app" / "Add to Home screen"
                </li>
                <li className="flex gap-2"><span className="font-bold text-tvk-maroon">3.</span>
                  {tt('"Install" அழுத்தவும்', 'Tap "Install"')}
                </li>
              </ol>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4">
              <Smartphone className="w-8 h-8 mx-auto mb-2 opacity-50" />
              {tt('நிறுவ உங்கள் மொபைலில் இந்தப் பக்கத்தைத் திறக்கவும்.', 'Open this page on your mobile device to install.')}
            </div>
          )}

          <div className="text-[11px] text-muted-foreground text-center pt-3 border-t border-border">
            {tt('நிறுவிய பிறகு, ஆப் தொடங்கும் பாத்திரத் தேர்வு திரையுடன்.', 'Once installed, the app opens directly to the role-selection screen.')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallApp;
