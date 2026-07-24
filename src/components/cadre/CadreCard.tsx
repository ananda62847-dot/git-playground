import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import tvkLogo from '@/assets/tvk-logo.jpeg';
import vijayPhoto from '@/assets/vijay-hero.webp';

interface Props {
  cadre: {
    name: string;
    profile_photo_url?: string | null;
    phone: string;
    city: string;
    constituency?: string | null;
    joined_at?: string;
    id: string;
    level?: string;
  };
}

const CadreCard: React.FC<Props> = ({ cadre }) => {
  const ref = useRef<HTMLDivElement>(null);

  const download = async () => {
    if (!ref.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(ref.current, { backgroundColor: null, scale: 2, useCORS: true });
      const link = document.createElement('a');
      link.download = `tvk-cadre-${cadre.name.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Card downloaded');
    } catch (e: any) {
      toast.error('Could not generate card: ' + e.message);
    }
  };

  const memberId = cadre.id.slice(0, 8).toUpperCase();
  const joinDate = cadre.joined_at ? new Date(cadre.joined_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="space-y-3">
      <div ref={ref} className="mx-auto" style={{ width: 380 }}>
        <div className="rounded-2xl overflow-hidden shadow-2xl bg-white" style={{ width: 380 }}>
          {/* Header band with TVK logo */}
          <div className="px-4 py-3 flex items-center gap-3" style={{ background: '#C62828', color: 'white' }}>
            <img src={tvkLogo} alt="TVK" className="w-12 h-12 rounded-full object-cover bg-white p-0.5" crossOrigin="anonymous" />
            <div className="flex-1 text-center">
              <div className="text-lg font-black tracking-wide leading-tight" style={{ fontFamily: 'serif' }}>தமிழக வெற்றிக் கழகம்</div>
              <div className="text-[10px] mt-0.5 opacity-90">Tamilaga Vettri Kazhagam</div>
            </div>
            <div className="w-12" />
          </div>

          {/* Body */}
          <div className="relative px-4 py-4" style={{ background: 'linear-gradient(135deg, #FFF8E1 0%, #FFFFFF 60%)' }}>
            <div className="text-center text-[10px] font-bold mb-3 tracking-widest" style={{ color: '#C62828' }}>உறுப்பினர் அட்டை · MEMBER CARD</div>
            <div className="flex gap-2.5">
              {/* Cadre photo */}
              <div className="shrink-0">
                {cadre.profile_photo_url ? (
                  <img crossOrigin="anonymous" src={cadre.profile_photo_url} alt={cadre.name} className="w-[88px] h-[104px] object-cover rounded border-2" style={{ borderColor: '#C62828' }} />
                ) : (
                  <div className="w-[88px] h-[104px] bg-gray-200 rounded flex items-center justify-center text-3xl text-gray-500 border-2" style={{ borderColor: '#C62828' }}>{cadre.name?.[0]}</div>
                )}
                <div className="text-center text-[8px] mt-0.5 text-gray-500">CADRE</div>
              </div>

              {/* Info */}
              <div className="flex-1 text-[10px] space-y-1 text-gray-800 min-w-0">
                <Row label="பெயர்" value={cadre.name} />
                <Row label="ID" value={memberId} />
                <Row label="தொலை" value={cadre.phone} />
                <Row label="மாவட்டம்" value={cadre.city} />
                <Row label="தொகுதி" value={cadre.constituency || '—'} />
                <Row label="சேர்ந்த" value={joinDate} />
              </div>

              {/* Vijay portrait */}
              <div className="shrink-0">
                <img crossOrigin="anonymous" src={vijayPhoto} alt="Thalaivar Vijay" className="w-[68px] h-[104px] object-cover rounded border-2" style={{ borderColor: '#FDD835' }} />
                <div className="text-center text-[8px] mt-0.5 font-bold" style={{ color: '#C62828' }}>தலைவர் விஜய்</div>
              </div>
            </div>

            <div className="flex justify-between items-end mt-3 pt-2 border-t border-dashed border-red-300">
              <div className="text-[8px] text-gray-500 max-w-[230px] leading-tight">
                Property of TVK · Chennai. பிறப்பொக்கும் எல்லா உயிர்க்கும்!
              </div>
              <div className="text-right">
                <div className="italic text-sm" style={{ fontFamily: 'cursive', color: '#C62828' }}>TVK</div>
                <div className="text-[8px] text-gray-500">Authorised</div>
              </div>
            </div>
          </div>
          <div style={{ background: '#FDD835', height: 8 }} />
        </div>
      </div>
      <Button onClick={download} className="w-full" variant="hero"><Download className="w-4 h-4 mr-2" />Download my Cadre Card</Button>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex gap-1 leading-tight">
    <span className="font-semibold w-14 shrink-0 truncate">{label}</span>
    <span>:</span>
    <span className="truncate font-medium flex-1">{value}</span>
  </div>
);

export default CadreCard;
