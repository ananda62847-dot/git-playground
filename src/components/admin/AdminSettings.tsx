import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Copy, Send, ExternalLink, BookOpen, Search, Check, Code2, Mic, Square, Loader2, Upload, Sparkles } from 'lucide-react';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://ifvktibgarrprfbwuupe.supabase.co';
const ANON_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || '';

const REST = `${SUPABASE_URL}/rest/v1`;
const RPC = `${SUPABASE_URL}/rest/v1/rpc`;

/* ------------------------------ Reusable bits ----------------------------- */

const CopyBtn: React.FC<{ text: string; label?: string }> = ({ text, label }) => {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm" variant="outline" className="h-7 px-2 text-xs"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
      {label ?? (copied ? 'Copied' : 'Copy')}
    </Button>
  );
};

const CodeBlock: React.FC<{ children: string; language?: string }> = ({ children }) => (
  <div className="relative group">
    <pre className="text-[11px] bg-muted/70 rounded-md p-3 overflow-x-auto max-h-[300px] font-mono border border-border">
      {children}
    </pre>
    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <CopyBtn text={children} />
    </div>
  </div>
);

type FieldSpec = {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'number' | 'date' | 'tel' | 'email';
  required?: boolean;
  placeholder?: string;
  help?: string;
};

const FieldRenderer: React.FC<{
  fields: FieldSpec[];
  values: Record<string, any>;
  onChange: (k: string, v: any) => void;
}> = ({ fields, values, onChange }) => (
  <div className="grid md:grid-cols-2 gap-3">
    {fields.map(f => (
      <div key={f.name} className={f.type === 'textarea' ? 'md:col-span-2' : ''}>
        <Label className="text-xs flex items-center gap-1">
          <span className="font-mono">{f.name}</span>
          {f.required && <Badge variant="destructive" className="h-4 px-1 text-[9px]">required</Badge>}
          <span className="text-muted-foreground font-normal">— {f.label}</span>
        </Label>
        {f.type === 'textarea' ? (
          <Textarea
            className="mt-1 text-sm"
            rows={3}
            placeholder={f.placeholder}
            value={values[f.name] ?? ''}
            onChange={e => onChange(f.name, e.target.value)}
          />
        ) : (
          <Input
            type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
            className="mt-1 h-9 text-sm"
            placeholder={f.placeholder}
            value={values[f.name] ?? ''}
            onChange={e => onChange(f.name, f.type === 'number' ? (e.target.value ? Number(e.target.value) : null) : e.target.value)}
          />
        )}
        {f.help && <div className="text-[10px] text-muted-foreground mt-0.5">{f.help}</div>}
      </div>
    ))}
  </div>
);

/* ------------------------- Field specs per endpoint ----------------------- */

const PROBLEM_FIELDS: FieldSpec[] = [
  { name: 'reporter_name', label: 'Full name', required: true, placeholder: 'Ravi Kumar' },
  { name: 'reporter_phone', label: 'Phone (10-digit)', required: true, type: 'tel', placeholder: '9876543210' },
  { name: 'reporter_age', label: 'Age', type: 'number' },
  { name: 'pincode', label: 'Pincode', required: true, placeholder: '600001' },
  { name: 'city', label: 'City', required: true, placeholder: 'Chennai' },
  { name: 'constituency', label: 'Constituency', placeholder: 'Thousand Lights' },
  { name: 'area', label: 'Area / locality' },
  { name: 'polling_booth', label: 'Polling booth' },
  { name: 'address_line', label: 'Full address' },
  { name: 'category', label: 'Category', required: true, placeholder: 'roads' },
  { name: 'department', label: 'Department', required: true, placeholder: 'PWD' },
  { name: 'urgency', label: 'Urgency (low|medium|high|emergency)', placeholder: 'medium' },
  { name: 'title', label: 'Short title', required: true },
  { name: 'description', label: 'Full description', type: 'textarea', required: true },
  { name: 'photo_urls', label: 'Photo URLs (comma-separated)', type: 'textarea', help: 'Public URLs from problem-media bucket' },
  { name: 'latitude', label: 'Latitude', type: 'number', placeholder: '11.0168' },
  { name: 'longitude', label: 'Longitude', type: 'number', placeholder: '76.9558' },
  { name: 'voice_note_url', label: 'Voice note URL', help: 'Public URL from voice-notes bucket' },
  { name: 'belongs_to_constituency', label: 'Belongs to constituency (true|false)', placeholder: 'true' },
];

const WELFARE_FIELDS: FieldSpec[] = [
  { name: 'reporter_name', label: 'Applicant name', required: true },
  { name: 'reporter_phone', label: 'Phone (10-digit)', required: true, type: 'tel' },
  { name: 'application_id', label: 'Application ID' },
  { name: 'pincode', label: 'Pincode', required: true },
  { name: 'city', label: 'City', required: true },
  { name: 'constituency', label: 'Constituency' },
  { name: 'area', label: 'Area' },
  { name: 'scheme_type', label: 'Scheme type', required: true, placeholder: 'pension' },
  { name: 'scheme_name', label: 'Scheme name' },
  { name: 'subcategory', label: 'Subcategory', required: true },
  { name: 'months_pending', label: 'Months pending' },
  { name: 'title', label: 'Short title', required: true },
  { name: 'description', label: 'Full description', type: 'textarea', required: true },
  { name: 'proof_urls', label: 'Proof URLs (comma-separated)', type: 'textarea' },
  { name: 'voice_note_url', label: 'Voice note URL', help: 'Public URL from voice-notes bucket' },
  { name: 'belongs_to_constituency', label: 'Belongs to constituency (true|false)', placeholder: 'true' },
];

const CORRUPTION_FIELDS: FieldSpec[] = [
  { name: 'city', label: 'City' },
  { name: 'constituency', label: 'Constituency' },
  { name: 'area', label: 'Area' },
  { name: 'department', label: 'Department involved' },
  { name: 'office_location', label: 'Office location' },
  { name: 'person_involved', label: 'Person / role involved' },
  { name: 'person_name', label: 'Person name' },
  { name: 'incident_type', label: 'Type of incident', placeholder: 'bribe_demand' },
  { name: 'incident_date', label: 'Incident date', type: 'date' },
  { name: 'incident_time', label: 'Incident time', placeholder: '14:30' },
  { name: 'amount_demanded', label: 'Amount demanded (INR)', type: 'number' },
  { name: 'evidence_url', label: 'Evidence URL' },
  { name: 'evidence_urls', label: 'Evidence URLs (comma-separated)', type: 'textarea' },
  { name: 'description', label: 'Full description', type: 'textarea', required: true, help: 'Min 10 chars' },
  { name: 'belongs_to_constituency', label: 'Belongs to constituency (true|false)', placeholder: 'true' },
];

const FUND_FIELDS: FieldSpec[] = [
  { name: 'category', label: 'Category (medical|education|marriage|livelihood|housing|disaster|other)', required: true, placeholder: 'medical' },
  { name: 'beneficiary_name', label: 'Beneficiary name', required: true },
  { name: 'beneficiary_age', label: 'Age', type: 'number' },
  { name: 'beneficiary_phone', label: 'Phone (10-digit)', required: true, type: 'tel' },
  { name: 'beneficiary_address', label: 'Address' },
  { name: 'constituency', label: 'Constituency' },
  { name: 'city', label: 'City' },
  { name: 'amount_requested', label: 'Amount requested (₹)', type: 'number' },
  { name: 'purpose', label: 'Purpose', type: 'textarea', required: true, help: 'Reason and context' },
  { name: 'urgency', label: 'Urgency (low|medium|high|critical)', placeholder: 'medium' },
  { name: 'bank_details', label: 'Bank / UPI details', type: 'textarea' },
  { name: 'supporting_docs', label: 'Supporting doc URLs (comma-separated)', type: 'textarea' },
  { name: 'disclaimer_accepted', label: 'Disclaimer accepted (must be true)', required: true, placeholder: 'true' },
  { name: 'latitude', label: 'Latitude', type: 'number' },
  { name: 'longitude', label: 'Longitude', type: 'number' },
  { name: 'voice_note_url', label: 'Voice note URL', help: 'Public URL from voice-notes bucket' },
  { name: 'belongs_to_constituency', label: 'Belongs to constituency (true|false)', placeholder: 'true' },
];

const AUTO_PDF_FIELDS: FieldSpec[] = [
  { name: 'ticket_no', label: 'Ticket number', required: true, placeholder: 'MC-A5689420' },
  { name: 'kind', label: 'Report kind (problem|welfare|corruption)', required: true, placeholder: 'problem' },
];

const CADRE_FILE_FIELDS: FieldSpec[] = [
  ...PROBLEM_FIELDS.map(f => f.name === 'reporter_name'
    ? { ...f, label: 'Citizen name (on behalf)' }
    : f.name === 'reporter_phone' ? { ...f, label: 'Citizen phone' } : f),
  { name: 'cadre_id', label: 'Cadre ID filing this report', required: true, help: 'UUID of the cadre from cadres table' },
];

/* ------------------------------ Playground -------------------------------- */

type EndpointDef = {
  id: string;
  title: string;
  method: 'POST';
  path: string;
  kind: 'rpc' | 'insert';
  rpcName?: string;
  table?: string;
  fields: FieldSpec[];
  transform?: (v: Record<string, any>) => Record<string, any>;
  sample: Record<string, any>;
};

const parseArr = (v: any): string[] =>
  typeof v === 'string' && v.trim() ? v.split(',').map(s => s.trim()).filter(Boolean) : [];

const ENDPOINTS: EndpointDef[] = [
  {
    id: 'problem',
    title: 'Report a Public Problem',
    method: 'POST',
    path: '/rest/v1/rpc/submit_problem',
    kind: 'rpc',
    rpcName: 'submit_problem',
    fields: PROBLEM_FIELDS,
    transform: (v) => ({
      _reporter_name: v.reporter_name, _reporter_phone: v.reporter_phone,
      _reporter_age: v.reporter_age ? Number(v.reporter_age) : null,
      _pincode: v.pincode, _city: v.city, _constituency: v.constituency || null,
      _area: v.area || null, _polling_booth: v.polling_booth || null,
      _address_line: v.address_line || null,
      _category: v.category, _department: v.department,
      _urgency: v.urgency || 'medium',
      _title: v.title, _description: v.description,
      _photo_urls: parseArr(v.photo_urls),
      _latitude: v.latitude ? Number(v.latitude) : null,
      _longitude: v.longitude ? Number(v.longitude) : null,
      _voice_note_url: v.voice_note_url || null,
      _belongs_to_constituency: String(v.belongs_to_constituency).toLowerCase() === 'true' ? true
        : String(v.belongs_to_constituency).toLowerCase() === 'false' ? false : null,
    }),
    sample: {
      reporter_name: 'Ravi Kumar', reporter_phone: '9876543210',
      pincode: '600001', city: 'Chennai', constituency: 'Thousand Lights',
      category: 'roads', department: 'PWD', urgency: 'high',
      title: 'Large pothole near bus stop', description: 'A big pothole causing accidents near main road bus stop.',
    },
  },
  {
    id: 'welfare',
    title: 'Report Welfare Scheme Issue',
    method: 'POST',
    path: '/rest/v1/rpc/submit_welfare_issue',
    kind: 'rpc',
    rpcName: 'submit_welfare_issue',
    fields: WELFARE_FIELDS,
    transform: (v) => ({
      _reporter_name: v.reporter_name, _reporter_phone: v.reporter_phone,
      _application_id: v.application_id || null,
      _pincode: v.pincode, _city: v.city,
      _constituency: v.constituency || null, _area: v.area || null,
      _scheme_type: v.scheme_type, _scheme_name: v.scheme_name || null,
      _subcategory: v.subcategory, _months_pending: v.months_pending || null,
      _title: v.title, _description: v.description,
      _proof_urls: parseArr(v.proof_urls),
      _voice_note_url: v.voice_note_url || null,
      _belongs_to_constituency: String(v.belongs_to_constituency).toLowerCase() === 'true' ? true
        : String(v.belongs_to_constituency).toLowerCase() === 'false' ? false : null,
    }),
    sample: {
      reporter_name: 'Selvi M', reporter_phone: '9123456780',
      pincode: '625001', city: 'Madurai', scheme_type: 'pension',
      subcategory: 'delayed_payment', title: 'Pension not credited 3 months',
      description: 'My widow pension has not been credited for 3 months. Application ID X123.',
      months_pending: '3',
    },
  },
  {
    id: 'corruption',
    title: 'Report Corruption / Bribe',
    method: 'POST',
    path: '/rest/v1/rpc/submit_corruption_report',
    kind: 'rpc',
    rpcName: 'submit_corruption_report',
    fields: CORRUPTION_FIELDS,
    transform: (v) => ({
      _city: v.city || null, _constituency: v.constituency || null,
      _area: v.area || null, _department: v.department || null,
      _description: v.description,
      _amount_demanded: v.amount_demanded ? Number(v.amount_demanded) : null,
      _incident_date: v.incident_date || null,
      _evidence_url: v.evidence_url || null,
      _incident_type: v.incident_type || null,
      _office_location: v.office_location || null,
      _person_involved: v.person_involved || null,
      _person_name: v.person_name || null,
      _incident_time: v.incident_time || null,
      _confirmed_good_faith: true,
      _evidence_urls: parseArr(v.evidence_urls),
      _belongs_to_constituency: String(v.belongs_to_constituency).toLowerCase() === 'true' ? true
        : String(v.belongs_to_constituency).toLowerCase() === 'false' ? false : null,
    }),
    sample: {
      city: 'Coimbatore', constituency: 'Coimbatore South',
      department: 'Registration', description: 'Sub-registrar demanded ₹5000 to release document that is legally due.',
      amount_demanded: 5000, incident_type: 'bribe_demand',
    },
  },
  {
    id: 'fund',
    title: 'Submit Fund Assistance Request',
    method: 'POST',
    path: '/rest/v1/rpc/submit_fund_request',
    kind: 'rpc',
    rpcName: 'submit_fund_request',
    fields: FUND_FIELDS,
    transform: (v) => ({
      _category: v.category,
      _beneficiary_name: v.beneficiary_name,
      _beneficiary_age: v.beneficiary_age ? Number(v.beneficiary_age) : null,
      _beneficiary_phone: v.beneficiary_phone,
      _beneficiary_address: v.beneficiary_address || null,
      _constituency: v.constituency || null,
      _city: v.city || null,
      _amount_requested: v.amount_requested ? Number(v.amount_requested) : null,
      _purpose: v.purpose,
      _urgency: v.urgency || 'medium',
      _bank_details: v.bank_details || null,
      _supporting_docs: parseArr(v.supporting_docs),
      _disclaimer_accepted: true,
      _filed_by_cadre_id: null,
      _latitude: v.latitude ? Number(v.latitude) : null,
      _longitude: v.longitude ? Number(v.longitude) : null,
      _voice_note_url: v.voice_note_url || null,
      _belongs_to_constituency: String(v.belongs_to_constituency).toLowerCase() === 'true' ? true
        : String(v.belongs_to_constituency).toLowerCase() === 'false' ? false : null,
    }),
    sample: {
      category: 'medical',
      beneficiary_name: 'Kumaresan',
      beneficiary_age: 52,
      beneficiary_phone: '9840012345',
      beneficiary_address: 'No. 12, Gandhi Nagar, Sulur',
      constituency: 'Sulur / சூலூர்',
      city: 'Coimbatore',
      amount_requested: 75000,
      purpose: 'Kidney surgery estimated at ₹75,000 at Coimbatore Medical College. Family cannot afford.',
      urgency: 'high',
      disclaimer_accepted: true,
    },
  },
];

const EndpointPlayground: React.FC<{ endpoint: EndpointDef }> = ({ endpoint }) => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSample = () => setValues(endpoint.sample);
  const clearAll = () => { setValues({}); setResponse(null); setError(null); };

  const submit = async () => {
    setLoading(true); setError(null); setResponse(null);
    try {
      const payload = endpoint.transform ? endpoint.transform(values) : values;
      let data: any, err: any;
      if (endpoint.kind === 'rpc') {
        ({ data, error: err } = await supabase.rpc(endpoint.rpcName as any, payload as any));
      } else {
        ({ data, error: err } = await supabase.from(endpoint.table as any).insert(payload as any).select().single());
      }
      if (err) throw err;
      setResponse(data);
      toast.success('Request succeeded');
    } catch (e: any) {
      setError(e.message || String(e));
      toast.error(e.message || 'Request failed');
    } finally { setLoading(false); }
  };

  const payloadPreview = endpoint.transform ? endpoint.transform(values) : values;

  const curl = endpoint.kind === 'rpc'
    ? `curl -X POST '${SUPABASE_URL}${endpoint.path}' \\
  -H 'apikey: ${ANON_KEY}' \\
  -H 'Authorization: Bearer ${ANON_KEY}' \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify(payloadPreview, null, 2)}'`
    : `curl -X POST '${SUPABASE_URL}${endpoint.path}' \\
  -H 'apikey: ${ANON_KEY}' \\
  -H 'Authorization: Bearer ${ANON_KEY}' \\
  -H 'Content-Type: application/json' \\
  -H 'Prefer: return=representation' \\
  -d '${JSON.stringify(payloadPreview, null, 2)}'`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="text-xs uppercase text-muted-foreground">Endpoint</div>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge className="bg-emerald-600 text-white text-[10px]">{endpoint.method}</Badge>
            <code className="text-xs bg-muted px-2 py-0.5 rounded">{endpoint.path}</code>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={loadSample}>Load sample</Button>
          <Button size="sm" variant="ghost" onClick={clearAll}>Clear</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Fields</CardTitle></CardHeader>
        <CardContent>
          <FieldRenderer
            fields={endpoint.fields}
            values={values}
            onChange={(k, v) => setValues(p => ({ ...p, [k]: v }))}
          />
          <div className="mt-4 flex justify-end">
            <Button onClick={submit} disabled={loading}>
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {loading ? 'Submitting…' : 'Submit'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Code2 className="w-4 h-4" />Request payload preview</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>{JSON.stringify(payloadPreview, null, 2)}</CodeBlock>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">cURL / integration snippet</CardTitle></CardHeader>
        <CardContent><CodeBlock>{curl}</CodeBlock></CardContent>
      </Card>

      {(response || error) && (
        <Card className={error ? 'border-rose-300' : 'border-emerald-300'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{error ? 'Error response' : 'Success response'}</CardTitle>
          </CardHeader>
          <CardContent>
            <CodeBlock>{JSON.stringify(response ?? { error }, null, 2)}</CodeBlock>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

/* ---------------------------- Ticket Tracking ----------------------------- */

const TicketTracking: React.FC = () => {
  const [ticket, setTicket] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState<'problems' | 'welfare_issues' | 'corruption_reports'>('problems');
  const [row, setRow] = useState<any>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const track = async () => {
    if (!ticket.trim()) return toast.error('Enter a ticket number');
    setLoading(true); setError(null); setRow(null); setUpdates([]);
    try {
      const q = supabase.from(source as any).select('*').eq('ticket_no', ticket.trim()).maybeSingle();
      const { data, error: e } = await q;
      if (e) throw e;
      if (!data) { setError('Ticket not found'); return; }
      setRow(data);
      if (source === 'problems' && (data as any).id) {
        const { data: ups } = await supabase
          .from('problem_updates').select('*').eq('problem_id', (data as any).id)
          .order('created_at', { ascending: false }).limit(20);
        setUpdates(ups || []);
      }
    } catch (e: any) {
      setError(e.message);
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  const curl = `curl '${REST}/${source}?ticket_no=eq.${ticket || 'YOUR_TICKET'}&select=*' \\
  -H 'apikey: ${ANON_KEY}' \\
  -H 'Authorization: Bearer ${ANON_KEY}'`;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Search className="w-4 h-4" />Track a ticket</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-4 gap-2">
            <div>
              <Label className="text-xs">Source</Label>
              <select
                className="mt-1 h-9 w-full rounded-md border border-input bg-background text-sm px-2"
                value={source} onChange={e => setSource(e.target.value as any)}
              >
                <option value="problems">Problems</option>
                <option value="welfare_issues">Welfare issues</option>
                <option value="corruption_reports">Corruption reports</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Ticket number</Label>
              <Input value={ticket} onChange={e => setTicket(e.target.value)} placeholder="e.g. TVK-2025-000123" className="mt-1 h-9 text-sm" />
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={track} disabled={loading}>
                <Search className="w-3.5 h-3.5 mr-1.5" />{loading ? 'Fetching…' : 'Track'}
              </Button>
            </div>
          </div>

          {error && <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">{error}</div>}

          {row && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-primary text-primary-foreground">{row.ticket_no}</Badge>
                <Badge variant="outline">{row.status}</Badge>
                {row.urgency && <Badge variant="outline">{row.urgency}</Badge>}
                {row.category && <Badge variant="outline">{row.category}</Badge>}
                <span className="text-[10px] text-muted-foreground ml-auto">Created {new Date(row.created_at).toLocaleString()}</span>
              </div>
              <CodeBlock>{JSON.stringify(row, null, 2)}</CodeBlock>
              {updates.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground mt-3 mb-1">Status updates ({updates.length})</div>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {updates.map(u => (
                      <div key={u.id} className="text-xs border rounded p-2 bg-muted/30">
                        <div className="flex items-center gap-2">
                          <Badge className="text-[10px]" variant="outline">{u.status}</Badge>
                          <span className="text-[10px] text-muted-foreground ml-auto">{new Date(u.created_at).toLocaleString()}</span>
                        </div>
                        {u.note && <div className="mt-1">{u.note}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Integration snippet (cURL)</CardTitle></CardHeader>
        <CardContent><CodeBlock>{curl}</CodeBlock></CardContent>
      </Card>
    </div>
  );
};

/* ---------------------------- Integration Guide --------------------------- */

const IntegrationGuide: React.FC = () => (
  <div className="space-y-4">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="w-4 h-4" />External integration overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          Use the endpoints on the other tabs from any external stack (React, Next, Vue, mobile, server). All requests hit
          the shared Supabase project below and are protected by RLS + rate-limits.
        </p>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="border rounded p-3 space-y-1">
            <div className="text-[10px] uppercase text-muted-foreground">Base URL</div>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">{SUPABASE_URL}</code>
              <CopyBtn text={SUPABASE_URL} />
            </div>
          </div>
          <div className="border rounded p-3 space-y-1">
            <div className="text-[10px] uppercase text-muted-foreground">Public anon key</div>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">{(ANON_KEY || '').slice(0, 24)}…</code>
              <CopyBtn text={ANON_KEY} />
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Required headers</div>
          <CodeBlock>{`apikey: <PUBLIC_ANON_KEY>
Authorization: Bearer <PUBLIC_ANON_KEY>
Content-Type: application/json`}</CodeBlock>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">JavaScript client (recommended)</div>
          <CodeBlock>{`import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  '${SUPABASE_URL}',
  '${(ANON_KEY || '').slice(0, 20)}…' // full public anon key
);

// Submit a problem
const { data, error } = await supabase.rpc('submit_problem', {
  _reporter_name: 'Ravi', _reporter_phone: '9876543210',
  _pincode: '600001', _city: 'Chennai',
  _category: 'roads', _department: 'PWD',
  _title: 'Pothole', _description: 'Big pothole near bus stop',
});

// Track a ticket
const { data: ticket } = await supabase
  .from('problems').select('*, problem_updates(*)')
  .eq('ticket_no', 'TVK-2025-000123')
  .maybeSingle();`}</CodeBlock>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Available endpoints</div>
          <div className="border rounded-md divide-y">
            {ENDPOINTS.map(e => (
              <div key={e.id} className="p-2 flex items-center gap-2 text-xs">
                <Badge className="bg-emerald-600 text-white text-[10px]">POST</Badge>
                <code className="bg-muted px-1.5 rounded">{e.path}</code>
                <span className="text-muted-foreground ml-2">{e.title}</span>
              </div>
            ))}
            <div className="p-2 flex items-center gap-2 text-xs">
              <Badge className="bg-blue-600 text-white text-[10px]">GET</Badge>
              <code className="bg-muted px-1.5 rounded">/rest/v1/problems?ticket_no=eq.&#123;ticket&#125;</code>
              <span className="text-muted-foreground ml-2">Track any ticket</span>
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Storage buckets (public read)</div>
          <ul className="text-xs list-disc pl-5 space-y-0.5">
            <li><code>problem-media</code> — photos for problems</li>
            <li><code>voice-notes</code> — audio attachments</li>
            <li><code>corruption-evidence</code> — evidence files</li>
            <li><code>completed-works</code> — before/after proof</li>
          </ul>
        </div>

        <div className="border rounded p-3 bg-amber-50 border-amber-200 text-xs">
          <strong>Never expose the service-role key.</strong> Only the anon key belongs in browser / mobile clients.
          For any admin action, log in as a staff user in <em>this</em> admin app.
        </div>

        <div className="pt-2">
          <a
            href="https://supabase.com/dashboard/project/ifvktibgarrprfbwuupe/api"
            target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary underline"
          >
            Open Supabase API docs <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  </div>
);

/* --------------------------- Voice Transcription -------------------------- */

const TRANSCRIBE_FN_URL = `${SUPABASE_URL}/functions/v1/transcribe-voice`;

const VoiceTranscription: React.FC = () => {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [language, setLanguage] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState('');
  const [result, setResult] = useState<{ transcript?: string; title?: string; description?: string; error?: string } | null>(null);
  const mediaRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const timerRef = React.useRef<number | null>(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        const b = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        setBlob(b);
        stream.getTracks().forEach(t => t.stop());
      };
      rec.start(250);
      mediaRef.current = rec;
      setRecording(true); setSeconds(0); setResult(null);
      timerRef.current = window.setInterval(() => setSeconds(s => s + 1), 1000);
    } catch (e: any) {
      toast.error(e?.message || 'Mic access failed');
    }
  };
  const stop = () => {
    try { mediaRef.current?.stop(); } catch {}
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRecording(false);
  };

  const uploadAndTranscribe = async () => {
    if (!blob) return;
    setUploading(true);
    try {
      const ext = blob.type.includes('webm') ? 'webm' : 'wav';
      const path = `admin-test/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('voice-notes').upload(path, blob, {
        contentType: blob.type || 'audio/webm', upsert: false,
      });
      if (error) throw error;
      const { data: pub } = supabase.storage.from('voice-notes').getPublicUrl(path);
      setAudioUrl(pub.publicUrl);
      await runTranscribe(pub.publicUrl);
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  const runTranscribe = async (url?: string) => {
    const audio = url || audioUrl;
    if (!audio) { toast.error('Provide an audio URL or record first'); return; }
    setProcessing(true); setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('transcribe-voice', {
        body: { audioUrl: audio, language: language || undefined },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data as any);
      toast.success('Transcribed');
    } catch (e: any) {
      setResult({ error: e?.message || 'Failed' });
      toast.error(e?.message || 'Transcription failed');
    } finally { setProcessing(false); }
  };

  const curlSnippet = `curl -X POST '${TRANSCRIBE_FN_URL}' \\
  -H 'apikey: ${ANON_KEY}' \\
  -H 'Authorization: Bearer ${ANON_KEY}' \\
  -H 'Content-Type: application/json' \\
  -d '{"audioUrl":"https://.../voice-notes/xyz.webm","language":"ta"}'`;

  const jsSnippet = `import { createClient } from '@supabase/supabase-js';
const supabase = createClient('${SUPABASE_URL}', '<PUBLIC_ANON_KEY>');

// 1) Record audio in the browser (MediaRecorder → Blob) OR accept a file upload.
// 2) Upload the audio to the public 'voice-notes' bucket.
const path = \`reports/\${Date.now()}.webm\`;
await supabase.storage.from('voice-notes').upload(path, blob, {
  contentType: blob.type || 'audio/webm',
});
const { data: pub } = supabase.storage.from('voice-notes').getPublicUrl(path);

// 3) Call the transcribe-voice edge function.
const { data, error } = await supabase.functions.invoke('transcribe-voice', {
  body: { audioUrl: pub.publicUrl, language: 'ta' }, // 'ta' | 'en' | omit for auto
});

// 4) Response shape → auto-fill your form.
// data = { transcript: string, title: string, description: string }
form.setFieldValue('title', data.title);
form.setFieldValue('description', data.description);
form.setFieldValue('voice_note_url', pub.publicUrl);`;

  const responseShape = `{
  "transcript": "Full faithful transcript of the recording in original language",
  "title": "Short action-oriented title (<= 80 chars)",
  "description": "Clear 1-3 sentence description"
}`;

  const fmt = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Mic className="w-4 h-4" />Voice → Title &amp; Description (AI auto-fill)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground text-xs">
            Records a voice note, uploads it to the <code>voice-notes</code> bucket and calls the{' '}
            <code>transcribe-voice</code> edge function. The function transcribes the audio (Tamil / English / Tanglish)
            using the Lovable AI Gateway (Gemini multimodal) and returns a ready-to-use <code>title</code> and{' '}
            <code>description</code> — perfect for auto-filling complaint forms.
          </p>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="border rounded p-3 space-y-1">
              <div className="text-[10px] uppercase text-muted-foreground">Endpoint</div>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-600 text-white text-[10px]">POST</Badge>
                <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">{TRANSCRIBE_FN_URL}</code>
                <CopyBtn text={TRANSCRIBE_FN_URL} />
              </div>
            </div>
            <div className="border rounded p-3 space-y-1">
              <div className="text-[10px] uppercase text-muted-foreground">Storage bucket</div>
              <code className="text-xs bg-muted px-2 py-1 rounded block">voice-notes (public)</code>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Request body</div>
            <CodeBlock>{`{
  "audioUrl": "https://<project>.supabase.co/storage/v1/object/public/voice-notes/<path>.webm",
  "language": "ta"  // optional: 'ta' | 'en' — omit for auto-detect
}`}</CodeBlock>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Response shape</div>
            <CodeBlock>{responseShape}</CodeBlock>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4" />Live tester</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-3 gap-2 items-end">
            <div>
              <Label className="text-xs">Language hint</Label>
              <select
                className="mt-1 h-9 w-full rounded-md border border-input bg-background text-sm px-2"
                value={language} onChange={e => setLanguage(e.target.value)}
              >
                <option value="">Auto-detect</option>
                <option value="ta">Tamil (ta)</option>
                <option value="en">English (en)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">…or paste an existing audio URL</Label>
              <Input value={audioUrl} onChange={e => setAudioUrl(e.target.value)} placeholder="https://…/voice-notes/xxx.webm" className="mt-1 h-9 text-sm" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!recording ? (
              <Button size="sm" variant="outline" onClick={start} disabled={uploading || processing}>
                <Mic className="w-4 h-4 mr-1.5" />Record
              </Button>
            ) : (
              <Button size="sm" variant="destructive" onClick={stop}>
                <Square className="w-4 h-4 mr-1.5" />Stop · {fmt(seconds)}
              </Button>
            )}
            {blob && !recording && (
              <>
                <Badge variant="outline" className="text-[10px]">Recorded {fmt(seconds)}</Badge>
                <Button size="sm" onClick={uploadAndTranscribe} disabled={uploading || processing}>
                  {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                  Upload &amp; transcribe
                </Button>
              </>
            )}
            <Button size="sm" variant="secondary" onClick={() => runTranscribe()} disabled={processing || !audioUrl}>
              {processing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
              Transcribe URL
            </Button>
          </div>

          {result && (
            <div className="space-y-2">
              {result.error ? (
                <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">{result.error}</div>
              ) : (
                <>
                  <div>
                    <Label className="text-xs font-semibold">Title (auto-filled)</Label>
                    <Input value={result.title || ''} readOnly className="mt-1 text-sm bg-muted/40" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Description (auto-filled)</Label>
                    <Textarea value={result.description || ''} readOnly rows={3} className="mt-1 text-sm bg-muted/40" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Full transcript</Label>
                    <Textarea value={result.transcript || ''} readOnly rows={4} className="mt-1 text-sm bg-muted/40" />
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Code2 className="w-4 h-4" />Connection guide</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">JavaScript / TypeScript (recommended)</div>
            <CodeBlock>{jsSnippet}</CodeBlock>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">cURL</div>
            <CodeBlock>{curlSnippet}</CodeBlock>
          </div>
          <div className="text-xs border rounded p-3 bg-blue-50 border-blue-200 space-y-1">
            <div className="font-semibold">Integration steps for your external public app</div>
            <ol className="list-decimal pl-5 space-y-0.5">
              <li>Record audio in-browser with <code>MediaRecorder</code> (webm/opus) or accept a file upload.</li>
              <li>Upload the blob to the public <code>voice-notes</code> bucket via the Supabase JS client.</li>
              <li>POST <code>{'{ audioUrl, language? }'}</code> to <code>/functions/v1/transcribe-voice</code>.</li>
              <li>Use the returned <code>title</code> &amp; <code>description</code> to auto-fill your report form fields, and store <code>audioUrl</code> as <code>voice_note_url</code> on submit.</li>
            </ol>
          </div>
          <div className="text-xs border rounded p-3 bg-amber-50 border-amber-200">
            Limits: recording up to ~90s recommended · supports Tamil, English, Tanglish · CORS is open · anon key is sufficient (no auth required).
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/* --------------------------------- Main ----------------------------------- */

/* ------------------------- Auto-download complaint PDF -------------------- */

const AutoPdfGuide: React.FC = () => {
  const jsSnippet = `import { supabase } from '@/integrations/supabase/client';

// After the user submits their report, fetch the auto-generated complaint PDF.
const { data, error } = await supabase.rpc('submit_problem', payload);
const ticket = data.ticket_no;

// Poll for the generated PDF (takes ~2-5 s after submission).
for (let i = 0; i < 10; i++) {
  await new Promise(r => setTimeout(r, 1500));
  const { data: row } = await supabase
    .from('problems')
    .select('completion_report_url')
    .eq('ticket_no', ticket)
    .maybeSingle();
  if (row?.completion_report_url) {
    // Auto-download
    const a = document.createElement('a');
    a.href = row.completion_report_url;
    a.download = \`complaint-\${ticket}.pdf\`;
    a.click();
    break;
  }
}`;

  const curlSnippet = `# Poll the report row for its generated PDF URL
curl -X GET '${SUPABASE_URL}/rest/v1/problems?ticket_no=eq.MC-A5689420&select=completion_report_url' \\
  -H 'apikey: ${ANON_KEY}' \\
  -H 'Authorization: Bearer ${ANON_KEY}'
`;

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Auto-download complaint PDF</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs">
          <p>
            After a report is submitted, an edge function (<code>ai-draft-report-docx</code>) drafts the complaint document
            and stores its public URL on the report row. Poll <code>completion_report_url</code> and trigger a download client-side.
          </p>
          <p className="text-muted-foreground">
            Applies to <b>problems</b>, <b>welfare_issues</b>, and <b>corruption_reports</b> — the field name is identical.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">JavaScript / TypeScript</CardTitle></CardHeader>
        <CardContent><CodeBlock>{jsSnippet}</CodeBlock></CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">cURL polling</CardTitle></CardHeader>
        <CardContent><CodeBlock>{curlSnippet}</CodeBlock></CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Manual on-demand generation</CardTitle></CardHeader>
        <CardContent className="text-xs">
          To force-generate for an existing report, invoke the edge function directly:
          <CodeBlock>{`curl -X POST '${SUPABASE_URL}/functions/v1/ai-draft-report-docx' \\
  -H 'apikey: ${ANON_KEY}' \\
  -H 'Authorization: Bearer ${ANON_KEY}' \\
  -H 'Content-Type: application/json' \\
  -d '{"problem_id":"<uuid>"}'`}</CodeBlock>
        </CardContent>
      </Card>
    </div>
  );
};

/* --------------------- Cadre-filed (reported on behalf) ------------------- */

const CadreFiledGuide: React.FC = () => {
  const submitSnippet = `// 1. Submit the report exactly like a citizen would
const { data } = await supabase.rpc('submit_problem', payload);

// 2. Mark it as cadre-filed using the cadre's UUID from the cadres table
await supabase.from('problems').update({
  is_cadre_filed: true,
  reported_by_cadre_id: '<CADRE_UUID>',
}).eq('ticket_no', data.ticket_no);`;

  const curlSnippet = `# Step 1: submit_problem as usual (see the Problem tab), returns ticket_no.
# Step 2: flag the record cadre-filed
curl -X PATCH '${SUPABASE_URL}/rest/v1/problems?ticket_no=eq.MC-A5689420' \\
  -H 'apikey: ${ANON_KEY}' \\
  -H 'Authorization: Bearer ${ANON_KEY}' \\
  -H 'Content-Type: application/json' \\
  -d '{"is_cadre_filed": true, "reported_by_cadre_id": "<CADRE_UUID>"}'`;

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Report on behalf of a citizen</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs">
          <p>
            Cadres can file reports on behalf of citizens. Every such report is flagged so admins and the public tracker
            display a <b>"Reported by cadre"</b> badge. The mechanism is a 2-step flow: create the report, then patch the flags.
          </p>
          <p className="text-muted-foreground">
            Applies to <code>problems</code>, <code>welfare_issues</code>, and <code>corruption_reports</code>. Both columns
            (<code>is_cadre_filed</code>, <code>reported_by_cadre_id</code>) exist on all three tables.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">JavaScript / TypeScript</CardTitle></CardHeader>
        <CardContent><CodeBlock>{submitSnippet}</CodeBlock></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">cURL</CardTitle></CardHeader>
        <CardContent><CodeBlock>{curlSnippet}</CodeBlock></CardContent>
      </Card>
    </div>
  );
};

/* --------------------------- QR & Auto-Track tab --------------------------- */

const TRACK_URL_BASE = 'https://makkal-connect.tvk.upcurv.in/#track';

const QrAutoTrack: React.FC = () => {
  const [ticket, setTicket] = useState('TVK-2026-000123');
  const url = `${TRACK_URL_BASE}?ticket=${encodeURIComponent(ticket)}&auto=1`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}`;
  const injectScript = `<!-- Paste this at the bottom of the tracker page (https://makkal-connect.tvk.upcurv.in/#track) -->
<script>
(function () {
  function run() {
    var p = new URLSearchParams(location.search + '&' + location.hash.split('?')[1]);
    var t = p.get('ticket');
    if (!t) return;
    var input = document.getElementById('ticketInput');
    var btn = document.querySelector('.submit-btn');
    if (input) input.value = t;
    if (p.get('auto') === '1' && btn) setTimeout(function(){ btn.click(); }, 250);
  }
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run);
})();
</script>`;

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Complaint QR (auto-track link)</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground text-xs">
            Every complaint PDF (problems / welfare / fund requests) should embed a QR that opens the public tracker with
            the ticket pre-filled and the "Track" button auto-clicked. Bribe reports are excluded to preserve anonymity.
          </p>
          <div className="grid md:grid-cols-2 gap-3 items-start">
            <div className="space-y-2">
              <Label className="text-xs">Ticket number</Label>
              <Input value={ticket} onChange={e => setTicket(e.target.value)} placeholder="TVK-2026-000123" />
              <div className="flex items-center gap-2">
                <code className="text-[11px] bg-muted px-2 py-1 rounded flex-1 truncate">{url}</code>
                <CopyBtn text={url} />
              </div>
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline inline-flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />Open tracker
              </a>
            </div>
            <div className="flex flex-col items-center gap-2">
              <img src={qrSrc} alt="Ticket QR" className="w-40 h-40 border rounded bg-white p-2" />
              <a href={qrSrc} download={`ticket-${ticket}.png`} className="text-xs text-primary underline">Download QR PNG</a>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Snippet to paste on the tracker page</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground text-xs">
            The tracker page uses <code>#ticketInput</code> and <code>.submit-btn</code>. This tiny script reads
            <code>?ticket=…&amp;auto=1</code>, fills the input and clicks Track automatically.
          </p>
          <CodeBlock>{injectScript}</CodeBlock>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Auto-download complaint PDF</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground text-xs">
            After submitting a report via the RPCs on the other tabs, generate the PDF client-side (or via
            <code>ai-draft-report-docx</code> for closed problems) and store it in the <code>problem-media</code> bucket.
            Include the QR above on the last page so citizens scan and track instantly. Bribe reports skip this step.
          </p>
          <CodeBlock>{`// Pseudo-code (browser)
import { buildComplaintPdf } from '@/lib/complaintPdf';

const { data } = await supabase.rpc('submit_problem', payload);
const ticket = data.ticket_no;

const blob = await buildComplaintPdf({
  ticket, ...payload,
  qrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=' +
         encodeURIComponent('${TRACK_URL_BASE}?ticket=' + ticket + '&auto=1'),
});

// upload
const path = 'complaint-pdfs/' + ticket + '.pdf';
await supabase.storage.from('problem-media').upload(path, blob, { contentType: 'application/pdf' });
const { data: pub } = supabase.storage.from('problem-media').getPublicUrl(path);
// pub.publicUrl — share this download link with the citizen`}</CodeBlock>
        </CardContent>
      </Card>
    </div>
  );
};

/* --------------------------------- Main ----------------------------------- */

const AdminSettings: React.FC = () => {
  const [tab, setTab] = useState('guide');
  return (
    <div className="space-y-3">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="guide" className="text-xs"><BookOpen className="w-3 h-3 mr-1" />Integration Guide</TabsTrigger>
          {ENDPOINTS.map(e => (
            <TabsTrigger key={e.id} value={e.id} className="text-xs">{e.title.replace(/^Report /,'').replace(/^Submit /,'')}</TabsTrigger>
          ))}
          <TabsTrigger value="auto_pdf" className="text-xs">Auto PDF</TabsTrigger>
          <TabsTrigger value="qr_track" className="text-xs">QR &amp; Auto-Track</TabsTrigger>
          <TabsTrigger value="cadre_filed" className="text-xs">Cadre-filed</TabsTrigger>
          <TabsTrigger value="voice" className="text-xs"><Mic className="w-3 h-3 mr-1" />Voice AI</TabsTrigger>
          <TabsTrigger value="track" className="text-xs"><Search className="w-3 h-3 mr-1" />Ticket Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="guide" className="mt-3"><IntegrationGuide /></TabsContent>
        {ENDPOINTS.map(e => (
          <TabsContent key={e.id} value={e.id} className="mt-3"><EndpointPlayground endpoint={e} /></TabsContent>
        ))}
        <TabsContent value="auto_pdf" className="mt-3"><AutoPdfGuide /></TabsContent>
        <TabsContent value="qr_track" className="mt-3"><QrAutoTrack /></TabsContent>
        <TabsContent value="cadre_filed" className="mt-3"><CadreFiledGuide /></TabsContent>
        <TabsContent value="voice" className="mt-3"><VoiceTranscription /></TabsContent>
        <TabsContent value="track" className="mt-3"><TicketTracking /></TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;

