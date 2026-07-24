import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, AlertTriangle, Users } from 'lucide-react';
import poster from '@/assets/makkal-connect-poster.png';

const KEY = 'mc_welcome_popup_seen_v1';

const WelcomePopup: React.FC<{ onReport: () => void }> = ({ onReport }) => {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem(KEY)) return;
    let cancelled = false;
    // Preload + decode poster so it appears instantly with the modal
    const img = new Image();
    img.src = poster;
    const ready = (img.decode ? img.decode().catch(() => {}) : Promise.resolve());
    const t = setTimeout(async () => {
      await ready;
      if (cancelled) return;
      setShow(true);
      requestAnimationFrame(() => setMounted(true));
      sessionStorage.setItem(KEY, '1');
    }, 3000);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  if (!show) return null;

  const close = () => { setMounted(false); setTimeout(() => setShow(false), 300); };

  return (
    <div
      className={`fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}
      onClick={close}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative w-full max-w-md sm:max-w-lg max-h-[92vh] flex flex-col transition-all duration-500 ${mounted ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-4'}`}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={close}
          aria-label="Close"
          className="absolute -top-2 -right-2 z-10 w-10 h-10 rounded-full bg-white text-tvk-maroon shadow-lg flex items-center justify-center hover:scale-110 transition"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="rounded-2xl overflow-hidden shadow-2xl bg-tvk-maroon flex flex-col min-h-0">
          <div className="flex-1 min-h-0 flex items-center justify-center bg-tvk-maroon overflow-hidden">
            <img
              src={poster}
              alt="Makkal Connect Coimbatore"
              className="w-full h-auto max-h-[70vh] object-contain block"
              decoding="sync"
              fetchPriority="high"
            />
          </div>
          <div className="p-4 sm:p-5 grid grid-cols-2 gap-3 bg-tvk-maroon shrink-0">
            <button
              onClick={() => { close(); onReport(); }}
              className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-tvk-yellow text-tvk-maroon font-bold text-sm hover:brightness-110 transition shadow"
            >
              <AlertTriangle className="w-4 h-4" /> Report Issue
            </button>
            <button
              onClick={() => { close(); navigate('/know-your-cadres'); }}
              className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-white text-tvk-maroon font-bold text-sm hover:brightness-95 transition shadow"
            >
              <Users className="w-4 h-4" /> See Cadres
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePopup;
