import { supabase } from '@/integrations/supabase/client';
import { DEPARTMENTS, URGENCY_LEVELS } from '@/lib/departments';
import { WELFARE_SCHEMES } from '@/lib/welfareSchemes';
import { FUND_CATEGORIES } from '@/components/FundAssistanceForm';

export type Mode = 'report' | 'welfare' | 'fund' | 'corruption';

export type StepId =
  | 'greeting'
  // problem-only
  | 'category' | 'subcategory' | 'urgency'
  // welfare-only
  | 'scheme_type' | 'scheme_subcategory' | 'application_id'
  // fund-only
  | 'fund_category' | 'fund_amount' | 'fund_purpose' | 'fund_bank'
  // shared location
  | 'district' | 'constituency' | 'belongs_to_constituency'
  | 'pincode' | 'area'
  // shared narrative
  | 'title_mode' | 'title' | 'desc_mode' | 'description'
  | 'months_pending' | 'photos'
  // reporter/beneficiary
  | 'citizen_name' | 'citizen_phone'
  | 'review' | 'done';

export interface ChatAnswers {
  mode?: Mode;
  // problem
  department?: string;
  category?: string;
  urgency?: string;
  // welfare
  scheme_type?: string;         // WELFARE_SCHEMES[].id
  scheme_subcategory?: string;
  application_id?: string;
  // fund
  fund_category?: string;
  fund_amount?: string;
  fund_purpose?: string;
  fund_bank?: string;
  // location
  district?: string;
  belongs_to_constituency?: boolean;
  pincode?: string;
  area?: string;
  constituency?: string;
  // narrative
  title?: string;
  description?: string;
  months_pending?: string;
  voice_note_url?: string;
  files?: File[];
  // reporter / beneficiary
  name?: string;
  phone?: string;
  citizen_name?: string;
  citizen_phone?: string;
}

// Mode-aware next step. Undefined mode falls back to legacy problem flow.
export function nextStep(current: StepId, mode: Mode = 'report'): StepId {
  if (mode === 'welfare') {
    switch (current) {
      case 'greeting':               return 'scheme_type';
      case 'scheme_type':            return 'scheme_subcategory';
      case 'scheme_subcategory':     return 'district';
      case 'district':               return 'constituency';
      case 'constituency':           return 'belongs_to_constituency';
      case 'belongs_to_constituency':return 'pincode';
      case 'pincode':                return 'area';
      case 'area':                   return 'title_mode';
      case 'title_mode':             return 'title';
      case 'title':                  return 'desc_mode';
      case 'desc_mode':              return 'description';
      case 'description':            return 'application_id';
      case 'application_id':         return 'months_pending';
      case 'months_pending':         return 'photos';
      case 'photos':                 return 'citizen_name';
      case 'citizen_name':           return 'citizen_phone';
      case 'citizen_phone':          return 'review';
      case 'review':                 return 'done';
    }
  }
  if (mode === 'fund') {
    switch (current) {
      case 'greeting':               return 'fund_category';
      case 'fund_category':          return 'fund_amount';
      case 'fund_amount':            return 'urgency';
      case 'urgency':                return 'district';
      case 'district':               return 'constituency';
      case 'constituency':           return 'belongs_to_constituency';
      case 'belongs_to_constituency':return 'pincode';
      case 'pincode':                return 'area';
      case 'area':                   return 'title_mode';
      case 'title_mode':             return 'title';
      case 'title':                  return 'desc_mode';
      case 'desc_mode':              return 'fund_purpose';
      case 'fund_purpose':           return 'fund_bank';
      case 'fund_bank':              return 'photos';
      case 'photos':                 return 'citizen_name';
      case 'citizen_name':           return 'citizen_phone';
      case 'citizen_phone':          return 'review';
      case 'review':                 return 'done';
    }
  }
  // Default: problem
  switch (current) {
    case 'greeting':               return 'category';
    case 'category':               return 'subcategory';
    case 'subcategory':            return 'urgency';
    case 'urgency':                return 'district';
    case 'district':               return 'constituency';
    case 'constituency':           return 'belongs_to_constituency';
    case 'belongs_to_constituency':return 'pincode';
    case 'pincode':                return 'area';
    case 'area':                   return 'title_mode';
    case 'title_mode':             return 'title';
    case 'title':                  return 'description';
    case 'desc_mode':              return 'description';
    case 'description':            return 'months_pending';
    case 'months_pending':         return 'photos';
    case 'photos':                 return 'citizen_name';
    case 'citizen_name':           return 'citizen_phone';
    case 'citizen_phone':          return 'review';
    case 'review':                 return 'done';
    default:                       return 'done';
  }
}

export const subCategoriesFor = (deptId?: string) =>
  DEPARTMENTS.find(d => d.id === deptId)?.categories || [];

export const welfareSchemes = () => WELFARE_SCHEMES;
export const welfareSubcategoriesFor = (schemeId?: string) =>
  WELFARE_SCHEMES.find(s => s.id === schemeId)?.subcategories || [];
export const fundCategories = () => FUND_CATEGORIES;

export const URGENCY = URGENCY_LEVELS;

// ————————————————————————————————————————
// Submit dispatch — routes to correct RPC based on mode.
// ————————————————————————————————————————
export async function submitReport(a: ChatAnswers, filedByCadreId: string | null) {
  if (a.mode === 'welfare') return submitWelfare(a, filedByCadreId);
  if (a.mode === 'fund')    return submitFund(a, filedByCadreId);
  return submitProblem(a, filedByCadreId);
}

async function uploadFiles(files: File[] | undefined, bucket: string, prefix: string): Promise<string[]> {
  if (!files?.length) return [];
  const urls: string[] = [];
  for (const f of files) {
    const path = `${prefix}/${Date.now()}-${f.name.replace(/[^a-z0-9.]/gi, '_')}`;
    const { error } = await supabase.storage.from(bucket).upload(path, f);
    if (!error) urls.push(supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl);
  }
  return urls;
}

async function submitProblem(a: ChatAnswers, filedByCadreId: string | null) {
  const insert: any = {
    reporter_name: (filedByCadreId ? a.citizen_name : a.name)?.trim(),
    reporter_phone: filedByCadreId ? a.citizen_phone : a.phone,
    city: a.area || null,
    constituency: a.constituency || null,
    area: a.area || null,
    pincode: a.pincode || null,
    department: a.department,
    category: a.category,
    urgency: a.urgency || 'medium',
    title: a.title?.trim(),
    description: a.description?.trim(),
    status: 'reported',
    belongs_to_constituency: a.belongs_to_constituency ?? null,
    voice_note_url: a.voice_note_url || null,
  };
  if (filedByCadreId) {
    insert.reported_by_cadre_id = filedByCadreId;
    insert.is_cadre_filed = true;
  }
  const { data: inserted, error } = await supabase
    .from('problems').insert(insert).select('id, ticket_no').single();
  if (error) throw error;

  const urls = await uploadFiles(a.files, 'problem-media', inserted.id);
  for (const url of urls) {
    await supabase.from('problem_media').insert({
      problem_id: inserted.id, url,
      media_type: /\.(mp4|webm|mov)$/i.test(url) ? 'video' : 'image',
    });
  }
  await supabase.from('problem_updates').insert({
    problem_id: inserted.id, status: 'reported',
    note: filedByCadreId ? 'Filed by cadre on behalf of citizen' : 'Complaint registered',
  });
  return inserted as { id: string; ticket_no: string };
}

async function submitWelfare(a: ChatAnswers, filedByCadreId: string | null) {
  const urls = await uploadFiles(a.files, 'problem-media', `welfare/${Date.now()}`);
  const { data, error } = await supabase.rpc('submit_welfare_issue', {
    _reporter_name: (filedByCadreId ? a.citizen_name : a.name)?.trim() || '',
    _reporter_phone: (filedByCadreId ? a.citizen_phone : a.phone) || '',
    _pincode: a.pincode || '',
    _city: a.area || '',
    _scheme_type: a.scheme_type || '',
    _subcategory: a.scheme_subcategory || '',
    _title: a.title?.trim() || '',
    _description: a.description?.trim() || '',
    _application_id: a.application_id || null,
    _constituency: a.constituency || null,
    _area: a.area || null,
    _scheme_name: null,
    _months_pending: a.months_pending || null,
    _proof_urls: urls,
    _filed_by_cadre_id: filedByCadreId,
    _voice_note_url: a.voice_note_url || null,
    _belongs_to_constituency: a.belongs_to_constituency ?? null,
  } as any);
  if (error) throw error;
  const row: any = Array.isArray(data) ? data[0] : data;
  return { id: row?.id || '', ticket_no: row?.ticket_no || '' };
}

async function submitFund(a: ChatAnswers, filedByCadreId: string | null) {
  const urls = await uploadFiles(a.files, 'problem-media', `fund-docs/${Date.now()}`);
  const { data, error } = await supabase.rpc('submit_fund_request', {
    _category: a.fund_category || 'other',
    _beneficiary_name: (filedByCadreId ? a.citizen_name : a.name)?.trim() || '',
    _beneficiary_phone: (filedByCadreId ? a.citizen_phone : a.phone) || '',
    _purpose: (a.fund_purpose || a.description || a.title || '').trim(),
    _beneficiary_address: a.area || null,
    _constituency: a.constituency || null,
    _city: a.area || null,
    _amount_requested: a.fund_amount ? Number(a.fund_amount) : null,
    _urgency: a.urgency || 'medium',
    _bank_details: a.fund_bank || null,
    _supporting_docs: urls,
    _disclaimer_accepted: true,
    _filed_by_cadre_id: filedByCadreId,
    _voice_note_url: a.voice_note_url || null,
    _belongs_to_constituency: a.belongs_to_constituency ?? null,
  } as any);
  if (error) throw error;
  const row: any = Array.isArray(data) ? data[0] : data;
  return { id: row?.id || '', ticket_no: row?.ticket_no || '' };
}
