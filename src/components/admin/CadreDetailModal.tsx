import React, { useState } from 'react';
import { X, Phone, Mail, MapPin, KeyRound, Shield, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CADRE_LEVELS as LEVELS } from '@/lib/cadreLevels';
import { useLockBodyScroll } from '@/hooks/use-lock-body-scroll';

interface Props { cadre: any; onClose: () => void; onChanged: () => void; }

const CadreDetailModal: React.FC<Props> = ({ cadre, onClose, onChanged }) => {
  useLockBodyScroll(true);
  const [busy, setBusy] = useState(false);
  const [level, setLevel] = useState(cadre.level);
  const [publicLabel, setPublicLabel] = useState(cadre.public_role_label || '');

  const patch = async (updates: any, label: string) => {
    setBusy(true);
    const { error } = await supabase.from('cadres').update(updates).eq('id', cadre.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(label);
    onChanged();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-t-2xl md:rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-start justify-between gap-2 z-10">
          <div className="flex items-center gap-3 min-w-0">
            {cadre.profile_photo_url
              ? <img src={cadre.profile_photo_url} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-primary shrink-0" />
              : <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary shrink-0">{cadre.name?.[0] || '?'}</div>}
            <div className="min-w-0">
              <h2 className="font-bold text-base md:text-lg truncate inline-flex items-center gap-1">
                {cadre.name}
                {cadre.user_id && <KeyRound className="w-3.5 h-3.5 text-green-600" />}
              </h2>
              <div className="flex flex-wrap gap-1 mt-1">
                <Badge variant={cadre.approved ? 'default' : 'secondary'} className="text-[10px]">
                  {cadre.approved ? '✓ Approved' : 'Pending'}
                </Badge>
                <Badge variant={cadre.active ? 'default' : 'outline'} className="text-[10px]">
                  {cadre.active ? 'Active' : 'Inactive'}
                </Badge>
                {cadre.public_visible && <Badge className="bg-blue-600 text-white text-[10px]"><Eye className="w-3 h-3 mr-0.5" />Public</Badge>}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <div className="p-4 space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {cadre.email && <div className="bg-muted/40 rounded p-2 inline-flex items-center gap-1"><Mail className="w-3 h-3" />{cadre.email}</div>}
            {cadre.phone && <div className="bg-muted/40 rounded p-2 inline-flex items-center gap-1"><Phone className="w-3 h-3" />{cadre.phone}</div>}
            <div className="bg-muted/40 rounded p-2 inline-flex items-start gap-1 sm:col-span-2">
              <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{[cadre.ward_number, cadre.area, cadre.constituency, cadre.city].filter(Boolean).join(' · ') || '—'}</span>
            </div>
            {cadre.role_title && <div className="bg-muted/40 rounded p-2 sm:col-span-2"><b>Role:</b> {cadre.role_title}</div>}
            <div className="bg-muted/40 rounded p-2 sm:col-span-2">
              <b>Last seen:</b>{' '}
              {cadre.last_seen_at
                ? new Date(cadre.last_seen_at).toLocaleString()
                : <span className="text-muted-foreground italic">Never opened the app</span>}
            </div>
            {cadre.skills?.length > 0 && <div className="bg-muted/40 rounded p-2 sm:col-span-2 text-muted-foreground"><b>Skills:</b> {cadre.skills.join(', ')}</div>}
            {cadre.notes && <div className="bg-muted/40 rounded p-2 sm:col-span-2 italic text-muted-foreground">{cadre.notes}</div>}
          </div>

          <div className="border-t pt-3 space-y-3">
            <div>
              <Label className="text-xs">Cadre Level</Label>
              <Select value={level} onValueChange={(v) => { setLevel(v); patch({ level: v }, 'Level updated'); }}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map(l => <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button disabled={busy} variant={cadre.approved ? 'outline' : 'default'}
                onClick={() => patch({ approved: !cadre.approved }, cadre.approved ? 'Approval revoked' : 'Cadre approved')}>
                <Shield className="w-4 h-4 mr-1" />{cadre.approved ? 'Revoke approval' : 'Approve'}
              </Button>
              <Button disabled={busy} variant={cadre.active ? 'destructive' : 'default'}
                onClick={() => patch({ active: !cadre.active }, cadre.active ? 'Deactivated' : 'Activated')}>
                {cadre.active ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          </div>

          <div className="border-t pt-3 space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Public Directory</div>
            <Label className="text-xs">Public role label</Label>
            <Input value={publicLabel} onChange={e => setPublicLabel(e.target.value)}
              placeholder="e.g. Booth In-charge"
              onBlur={() => { if (publicLabel !== (cadre.public_role_label || '')) patch({ public_role_label: publicLabel || null }, 'Public role saved'); }}
            />
            <div className="grid grid-cols-2 gap-2">
              <Button disabled={busy} variant={cadre.public_visible ? 'default' : 'outline'}
                onClick={() => patch({ public_visible: !cadre.public_visible }, !cadre.public_visible ? 'Now visible publicly' : 'Hidden from public')}>
                {cadre.public_visible ? <><Eye className="w-4 h-4 mr-1" />Visible</> : <><EyeOff className="w-4 h-4 mr-1" />Hidden</>}
              </Button>
              <Button disabled={busy} variant={cadre.show_phone ? 'default' : 'outline'}
                onClick={() => patch({ show_phone: !cadre.show_phone }, 'Phone visibility updated')}>
                <Phone className="w-4 h-4 mr-1" />{cadre.show_phone ? 'Phone shown' : 'Phone hidden'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CadreDetailModal;
