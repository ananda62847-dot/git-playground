import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { PauseCircle, PlayCircle, Trash2, MapPin, ImagePlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import MapPicker from '@/components/admin/MapPicker';

type Kind = 'problem' | 'welfare' | 'fund' | 'corruption';

interface Props {
  kind: Kind;
  id: string;
  onHold?: boolean;
  showLocation?: boolean;
  currentLat?: number | null;
  currentLng?: number | null;
  onChanged?: () => void;
  onDeleted?: () => void;
}

const AdminIssueControls: React.FC<Props> = ({ kind, id, onHold, showLocation, currentLat, currentLng, onChanged, onDeleted }) => {
  const [holdOpen, setHoldOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const [evOpen, setEvOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [lat, setLat] = useState<string>(currentLat != null ? String(currentLat) : '');
  const [lng, setLng] = useState<string>(currentLng != null ? String(currentLng) : '');
  const [address, setAddress] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const toggleHold = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('admin_toggle_hold' as any, { _kind: kind, _id: id, _hold: !onHold, _reason: reason || null } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(onHold ? 'Resumed' : 'Paused');
    setHoldOpen(false); setReason('');
    onChanged?.();
  };

  const doDelete = async () => {
    if (reason.trim().length < 3) return toast.error('Please add a reason');
    setBusy(true);
    const { error } = await supabase.rpc('admin_delete_issue' as any, { _kind: kind, _id: id, _reason: reason } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Deleted');
    setDelOpen(false); setReason('');
    onDeleted?.();
  };

  const saveLocation = async () => {
    const nLat = Number(lat), nLng = Number(lng);
    if (!isFinite(nLat) || !isFinite(nLng) || nLat < -90 || nLat > 90 || nLng < -180 || nLng > 180) {
      return toast.error('Enter valid coordinates');
    }
    setBusy(true);
    const { error } = await supabase.rpc('admin_update_problem_location' as any, { _id: id, _lat: nLat, _lng: nLng, _address: address || null } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Location updated');
    setLocOpen(false);
    onChanged?.();
  };

  const pickFromDevice = () => {
    if (!navigator.geolocation) return toast.error('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(String(pos.coords.latitude)); setLng(String(pos.coords.longitude)); },
      (err) => toast.error(err.message)
    );
  };

  const uploadEvidence = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (kind !== 'problem') return toast.error('Admin evidence upload is only enabled for problems');
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} > 10MB`); continue; }
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `admin/${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('problem-media').upload(path, file, { upsert: false, contentType: file.type });
        if (upErr) { toast.error(upErr.message); continue; }
        const { data: pub } = supabase.storage.from('problem-media').getPublicUrl(path);
        const isVideo = file.type.startsWith('video/');
        await supabase.from('problem_media').insert({
          problem_id: id, url: pub.publicUrl, media_type: isVideo ? 'video' : 'image',
        });
      }
      toast.success('Evidence uploaded');
      setEvOpen(false);
      onChanged?.();
    } finally { setUploading(false); }
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      {onHold && <Badge className="bg-amber-500 text-white text-[10px]">ON HOLD</Badge>}

      <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setHoldOpen(true)}>
        {onHold ? <><PlayCircle className="w-3 h-3 mr-1" />Resume</> : <><PauseCircle className="w-3 h-3 mr-1" />Pause</>}
      </Button>

      {showLocation && kind === 'problem' && (
        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setLocOpen(true)}>
          <MapPin className="w-3 h-3 mr-1" />{currentLat ? 'Edit location' : 'Set location'}
        </Button>
      )}

      {kind === 'problem' && (
        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setEvOpen(true)}>
          <ImagePlus className="w-3 h-3 mr-1" />Add evidence
        </Button>
      )}

      <Button size="sm" variant="outline" className="h-7 text-[11px] text-red-600 hover:bg-red-50" onClick={() => setDelOpen(true)}>
        <Trash2 className="w-3 h-3 mr-1" />Delete
      </Button>

      {/* HOLD dialog */}
      <Dialog open={holdOpen} onOpenChange={setHoldOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{onHold ? 'Resume item' : 'Pause item'}</DialogTitle></DialogHeader>
          {!onHold && (
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Why is this being paused?" />
              <p className="text-xs text-muted-foreground">While paused, SLA escalations are suppressed and cadres see a read-only banner.</p>
            </div>
          )}
          {onHold && <p className="text-sm text-muted-foreground">This will re-open the item for cadre action.</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setHoldOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={toggleHold} disabled={busy}>{onHold ? 'Resume' : 'Pause'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE dialog */}
      <Dialog open={delOpen} onOpenChange={setDelOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-red-600">Delete this item?</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <p className="text-sm">This is a soft-delete. Recoverable for 30 days from the audit log.</p>
            <Label>Reason (required)</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="e.g. duplicate, spam, test report" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDelOpen(false)} disabled={busy}>Cancel</Button>
            <Button variant="destructive" onClick={doDelete} disabled={busy}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LOCATION dialog */}
      <Dialog open={locOpen} onOpenChange={setLocOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{currentLat ? 'Edit location' : 'Set location'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Latitude</Label><Input value={lat} onChange={e => setLat(e.target.value)} placeholder="13.0827" /></div>
              <div><Label>Longitude</Label><Input value={lng} onChange={e => setLng(e.target.value)} placeholder="80.2707" /></div>
            </div>
            <div><Label>Address (optional)</Label><Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Street / landmark" /></div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={pickFromDevice}>Use my current location</Button>
              {lat && lng && (
                <a className="text-xs text-primary underline self-center" target="_blank" rel="noreferrer"
                   href={`https://maps.google.com/?q=${lat},${lng}`}>Preview on Google Maps</a>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: open Google Maps, right-click the location and copy the coordinates, then paste above.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLocOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={saveLocation} disabled={busy}>Save location</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminIssueControls;
