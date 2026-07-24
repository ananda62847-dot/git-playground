import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, Camera, Upload as UploadIcon } from 'lucide-react';
import TVKLogo from '@/components/TVKLogo';
import { constituenciesByCity as CONSTITUENCIES } from '@/lib/constituencies';
import { CADRE_LEVELS } from '@/lib/cadreLevels';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const CadreRegister: React.FC = () => {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({
    name: '', email: '', password: '', phone: '', city: '', constituency: '',
    area: '', ward_number: '', level: 'booth_volunteer',
  });
  const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Photo must be under 5MB');
    setUploading(true);
    const path = `cadre-photos/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name.replace(/[^a-z0-9.]/gi,'_')}`;
    const { error } = await supabase.storage.from('problem-media').upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from('problem-media').getPublicUrl(path);
    setPhotoUrl(data.publicUrl);
    toast.success('Photo uploaded');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoUrl) return toast.error('Profile photo is required');
    if (!f.name || !f.email || f.password.length < 6 || f.phone.length < 10 || !f.city) {
      return toast.error('Fill all required fields');
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('cadre-signup', { body: { ...f, profile_photo_url: photoUrl } });
    setBusy(false);
    if (error || (data as any)?.error) return toast.error((data as any)?.error || error?.message || 'Failed');
    toast.success('Account created! You can log in now.');
    nav('/cadre/login');
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <main className="pt-20 pb-10">
        <div className="container mx-auto px-3 max-w-xl">
          <div className="flex items-center gap-3 mb-4">
            <TVKLogo size="sm" />
            <div>
              <h1 className="text-xl md:text-2xl font-bold">TVK Cadre Registration</h1>
              <p className="text-xs text-muted-foreground">Join the digital cadre force</p>
            </div>
          </div>
          <form onSubmit={submit} className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-3">
            {/* Photo upload */}
            <div className="flex flex-col items-center gap-2 pb-2 border-b border-border">
              <div className="relative">
                {photoUrl ? (
                  <img src={photoUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-primary" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-muted border-4 border-dashed border-border flex items-center justify-center text-muted-foreground">
                    <Camera className="w-8 h-8" />
                  </div>
                )}
                {uploading && <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white" /></div>}
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}><UploadIcon className="w-3 h-3 mr-1" />Upload</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => camRef.current?.click()}><Camera className="w-3 h-3 mr-1" />Camera</Button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => handleFile(e.target.files?.[0])} />
              <input ref={camRef} type="file" accept="image/*" capture="user" hidden onChange={e => handleFile(e.target.files?.[0])} />
              <p className="text-[10px] text-muted-foreground">Profile photo is required *</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2"><Label>Full Name *</Label><Input value={f.name} onChange={e => set('name', e.target.value)} required /></div>
              <div><Label>Email *</Label><Input type="email" value={f.email} onChange={e => set('email', e.target.value)} required /></div>
              <div><Label>Password *</Label><Input type="password" value={f.password} onChange={e => set('password', e.target.value)} placeholder="6+ chars" required /></div>
              <div><Label>Phone *</Label><Input value={f.phone} onChange={e => set('phone', e.target.value.replace(/\D/g,'').slice(0,10))} required /></div>
              <div><Label>Level</Label>
                <Select value={f.level} onValueChange={(v) => set('level', v)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CADRE_LEVELS.map(l => <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>City / District *</Label>
                <Select value={f.city || undefined} onValueChange={(v) => { set('city', v); set('constituency', ''); }}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="--" /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(CONSTITUENCIES).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Constituency</Label>
                <Select value={f.constituency || undefined} onValueChange={(v) => set('constituency', v)} disabled={!f.city}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="--" /></SelectTrigger>
                  <SelectContent>
                    {(CONSTITUENCIES[f.city] || []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Area</Label><Input value={f.area} onChange={e => set('area', e.target.value)} /></div>
              <div><Label>Ward Number</Label><Input value={f.ward_number} onChange={e => set('ward_number', e.target.value)} /></div>
            </div>
            <Button type="submit" disabled={busy || uploading || !photoUrl} className="w-full" variant="hero">
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}<ShieldCheck className="w-4 h-4 mr-2" />Register as Cadre
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Already a cadre? <Link to="/cadre/login" className="text-primary underline">Login</Link>
            </p>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};
export default CadreRegister;
