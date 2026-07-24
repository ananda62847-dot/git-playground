import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Upload, Loader2, CheckCircle2, HeartPulse } from 'lucide-react';
import { toast } from 'sonner';
import { COIMBATORE_CONSTITUENCIES } from '@/lib/constituencies';
import { useT } from '@/lib/i18n/cadreT';

export const FUND_CATEGORIES = [
  { id: 'medical', label: 'Medical / Hospital assistance' },
  { id: 'education', label: 'Education / School assistance' },
  { id: 'marriage', label: 'Marriage assistance' },
  { id: 'livelihood', label: 'Livelihood / Employment support' },
  { id: 'housing', label: 'Housing / Shelter assistance' },
  { id: 'disaster', label: 'Disaster / Emergency relief' },
  { id: 'other', label: 'Other' },
];
const FUND_CAT_TKEY: Record<string, keyof ReturnType<typeof useT>> = {
  medical: 'fa_cat_medical', education: 'fa_cat_education', marriage: 'fa_cat_marriage',
  livelihood: 'fa_cat_livelihood', housing: 'fa_cat_housing', disaster: 'fa_cat_disaster', other: 'fa_cat_other',
};

interface Props {
  filedByCadreId?: string | null;   // if set, marks the record as cadre-filed
  defaultConstituency?: string | null;
  onSuccess?: (ticket: string) => void;
}

const FundAssistanceForm: React.FC<Props> = ({ filedByCadreId = null, defaultConstituency = null, onSuccess }) => {
  const T = useT() as any;
  const [category, setCategory] = useState('medical');
  const [name, setName] = useState('');
  const [age, setAge] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [constituency, setConstituency] = useState(defaultConstituency || '');
  const [city, setCity] = useState('');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [urgency, setUrgency] = useState('medium');
  const [bank, setBank] = useState('');
  const [docs, setDocs] = useState<File[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ticket, setTicket] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim() || !phone.trim() || !purpose.trim()) return toast.error(T.fa_err_required);
    if (!/^\d{10}$/.test(phone.trim())) return toast.error(T.fa_err_phone);
    if (!accepted) return toast.error(T.fa_err_ack);
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const f of docs) {
        const path = `fund-docs/${Date.now()}-${f.name.replace(/[^a-z0-9.]/gi, '_')}`;
        const { error } = await supabase.storage.from('problem-media').upload(path, f);
        if (error) throw error;
        urls.push(supabase.storage.from('problem-media').getPublicUrl(path).data.publicUrl);
      }
      const { data, error } = await supabase.rpc('submit_fund_request', {
        _category: category,
        _beneficiary_name: name.trim(),
        _beneficiary_phone: phone.trim(),
        _purpose: purpose.trim(),
        _beneficiary_age: age ? Number(age) : null,
        _beneficiary_address: address.trim() || null,
        _constituency: constituency || null,
        _city: city.trim() || null,
        _amount_requested: amount ? Number(amount) : null,
        _urgency: urgency,
        _bank_details: bank.trim() || null,
        _supporting_docs: urls,
        _disclaimer_accepted: true,
        _filed_by_cadre_id: filedByCadreId,
      });
      if (error) throw error;
      const row: any = Array.isArray(data) ? data[0] : data;
      setTicket(row?.ticket_no || 'FA-…');
      toast.success('Fund assistance request submitted');
      onSuccess?.(row?.ticket_no);
    } catch (e: any) {
      toast.error(e.message || 'Submission failed');
    } finally { setBusy(false); }
  };

  if (ticket) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
          <h3 className="text-lg font-bold">{T.fa_success_title}</h3>
          <p className="text-sm text-muted-foreground">{T.fa_success_ref}</p>
          <div className="font-mono text-2xl bg-muted rounded-md px-4 py-2 inline-block">{ticket}</div>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">{T.fa_success_help}</p>
          <Button variant="outline" onClick={() => { setTicket(null); setName(''); setPhone(''); setPurpose(''); setAmount(''); setDocs([]); setAccepted(false); }}>
            {T.fa_submit_another}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Disclaimer */}
      <div className="border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 flex gap-3">
        <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
        <div className="text-sm space-y-1">
          <div className="font-bold text-amber-900 dark:text-amber-200">{T.fa_important}</div>
          <p className="text-amber-800 dark:text-amber-100 text-xs leading-relaxed">{T.fa_disclaimer}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">{T.fa_category} <span className="text-red-600">*</span></Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FUND_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{T[FUND_CAT_TKEY[c.id]] || c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">{T.urgency}</Label>
          <Select value={urgency} onValueChange={setUrgency}>
            <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">{T.low}</SelectItem>
              <SelectItem value="medium">{T.medium}</SelectItem>
              <SelectItem value="high">{T.high}</SelectItem>
              <SelectItem value="critical">{T.fa_urg_critical}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">{T.fa_beneficiary_name} <span className="text-red-600">*</span></Label>
          <Input className="mt-1 h-9" value={name} onChange={e => setName(e.target.value)} placeholder={T.fa_full_name} />
        </div>
        <div>
          <Label className="text-xs">{T.fa_age}</Label>
          <Input className="mt-1 h-9" type="number" value={age} onChange={e => setAge(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">{T.fa_phone} <span className="text-red-600">*</span></Label>
          <Input className="mt-1 h-9" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="tel" />
        </div>
        <div>
          <Label className="text-xs">{T.fa_amount}</Label>
          <Input className="mt-1 h-9" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder={T.fa_amount_optional} />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs">{T.fa_address}</Label>
          <Input className="mt-1 h-9" value={address} onChange={e => setAddress(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">{T.constituency}</Label>
          <Select value={constituency} onValueChange={setConstituency}>
            <SelectTrigger className="mt-1 h-9"><SelectValue placeholder={T.select} /></SelectTrigger>
            <SelectContent>
              {COIMBATORE_CONSTITUENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">{T.fa_city}</Label>
          <Input className="mt-1 h-9" value={city} onChange={e => setCity(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs">{T.fa_purpose} <span className="text-red-600">*</span></Label>
          <Textarea className="mt-1" rows={4} value={purpose} onChange={e => setPurpose(e.target.value)} placeholder={T.fa_purpose_ph} />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs">{T.fa_bank}</Label>
          <Textarea className="mt-1" rows={2} value={bank} onChange={e => setBank(e.target.value)} placeholder={T.fa_bank_ph} />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs">{T.fa_docs}</Label>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <label className="inline-flex items-center gap-1 cursor-pointer border rounded-md px-3 py-2 text-xs hover:bg-accent">
              <Upload className="w-4 h-4" /> {T.choose_files}
              <input type="file" hidden multiple accept="image/*,application/pdf"
                onChange={e => setDocs(Array.from(e.target.files || []))} />
            </label>
            {docs.length > 0 && <span className="text-xs text-muted-foreground">{T.fa_files_selected(docs.length)}</span>}
          </div>
        </div>
      </div>

      <label className="flex items-start gap-2 border rounded-md p-3 bg-muted/40">
        <Checkbox checked={accepted} onCheckedChange={v => setAccepted(!!v)} className="mt-0.5" />
        <span className="text-xs leading-relaxed">{T.fa_ack}</span>
      </label>

      <Button onClick={submit} disabled={busy || !accepted} className="w-full" size="lg">
        {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <HeartPulse className="w-4 h-4 mr-2" />}
        {T.fa_submit}
      </Button>
    </div>
  );
};

export default FundAssistanceForm;