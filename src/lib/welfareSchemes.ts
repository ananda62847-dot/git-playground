// Welfare / Scheme Issue taxonomy. Used by citizen wizard + admin filters.

export interface WelfareScheme {
  id: string;
  ta: string;
  en: string;
  icon: string;
  routedDepartment?: string;       // maps to DEPARTMENTS.id for routing
  subcategories: { id: string; ta: string; en: string }[];
  extraFields?: Array<'scheme_name' | 'application_id' | 'months_pending'>;
}

export const WELFARE_SCHEMES: WelfareScheme[] = [
  {
    id: 'ration',
    en: 'Ration / PDS',
    ta: 'ரேஷன் / PDS',
    icon: '🍚',
    routedDepartment: 'ration',
    extraFields: ['application_id'],
    subcategories: [
      { id: 'denied', ta: 'ரேஷன் மறுக்கப்பட்டது', en: 'Ration denied' },
      { id: 'inactive', ta: 'கார்டு செயலிழந்தது', en: 'Card inactive' },
      { id: 'missing_name', ta: 'பெயர் இல்லை', en: 'Name missing' },
      { id: 'wrong_qty', ta: 'தவறான அளவு', en: 'Wrong quantity issued' },
      { id: 'biometric', ta: 'பயோமெட்ரிக் தோல்வி', en: 'Biometric failure' },
      { id: 'shop_corruption', ta: 'கடை ஊழல்', en: 'Shop corruption' },
      { id: 'poor_quality', ta: 'குறைந்த தரம்', en: 'Poor quality' },
      { id: 'shop_closed', ta: 'கடை மூடப்பட்டது', en: 'Shop not open' },
      { id: 'duplicate', ta: 'நகல் சிக்கல்', en: 'Duplicate issue' },
    ],
  },
  {
    id: 'pension',
    en: 'Pension Schemes',
    ta: 'ஓய்வூதியம்',
    icon: '👴',
    extraFields: ['scheme_name', 'application_id', 'months_pending'],
    subcategories: [
      { id: 'not_received', ta: 'ஓய்வூதியம் கிடைக்கவில்லை', en: 'Pension not received' },
      { id: 'delayed', ta: 'தாமதம்', en: 'Pension delayed' },
      { id: 'stopped', ta: 'நிறுத்தப்பட்டது', en: 'Pension stopped' },
      { id: 'pending', ta: 'விண்ணப்பம் காத்திருக்கிறது', en: 'Application pending' },
      { id: 'rejected', ta: 'காரணம் இல்லாமல் நிராகரிக்கப்பட்டது', en: 'Rejected without reason' },
      { id: 'wrong_bank', ta: 'தவறான வங்கி இணைப்பு', en: 'Wrong bank linkage' },
      { id: 'widow', ta: 'விதவை ஓய்வூதியம்', en: 'Widow pension issue' },
      { id: 'senior', ta: 'மூத்த குடிமக்கள்', en: 'Senior citizen pension' },
      { id: 'disability', ta: 'மாற்றுத் திறனாளி ஓய்வூதியம்', en: 'Disability pension' },
    ],
  },
  {
    id: 'scholarship',
    en: 'Scholarship / Education',
    ta: 'கல்வி உதவித்தொகை',
    icon: '🎓',
    routedDepartment: 'education',
    extraFields: ['scheme_name', 'application_id'],
    subcategories: [
      { id: 'pending', ta: 'உதவித்தொகை காத்திருக்கிறது', en: 'Scholarship pending' },
      { id: 'not_credited', ta: 'வரவு வைக்கப்படவில்லை', en: 'Amount not credited' },
      { id: 'rejected', ta: 'நிராகரிக்கப்பட்டது', en: 'Application rejected' },
      { id: 'name_mismatch', ta: 'பெயர் பொருந்தவில்லை', en: 'Name mismatch' },
      { id: 'college_delay', ta: 'கல்லூரி சரிபார்ப்பு தாமதம்', en: 'College verification delay' },
      { id: 'cert_issue', ta: 'சான்றிதழ் சிக்கல்', en: 'Certificate issue' },
      { id: 'hostel_aid', ta: 'விடுதி உதவி', en: 'Hostel aid issue' },
      { id: 'uniform_books', ta: 'சீருடை / புத்தக உதவி', en: 'Uniform / book support delay' },
    ],
  },
  {
    id: 'housing',
    en: 'Housing / PMAY',
    ta: 'வீட்டு வசதி',
    icon: '🏠',
    extraFields: ['scheme_name', 'application_id'],
    subcategories: [
      { id: 'approval_pending', ta: 'அனுமதி காத்திருக்கிறது', en: 'House approval pending' },
      { id: 'subsidy_delay', ta: 'மானியம் தாமதம்', en: 'Subsidy delay' },
      { id: 'construction_halt', ta: 'கட்டுமானம் நிறுத்தம்', en: 'Construction halted' },
      { id: 'corruption', ta: 'லஞ்சம் கோரிக்கை', en: 'Corruption demand' },
      { id: 'wrong_reject', ta: 'தவறான நிராகரிப்பு', en: 'Wrong rejection' },
      { id: 'not_listed', ta: 'பெயர் இல்லை', en: 'Name not listed' },
      { id: 'fund_pending', ta: 'நிதி வெளியிடப்படவில்லை', en: 'Fund not released' },
    ],
  },
  {
    id: 'women',
    en: 'Women Welfare',
    ta: 'பெண்கள் நலம்',
    icon: '👩',
    extraFields: ['scheme_name', 'application_id'],
    subcategories: [
      { id: 'assist_not_recv', ta: 'உதவி கிடைக்கவில்லை', en: 'Assistance not received' },
      { id: 'pending', ta: 'விண்ணப்பம் காத்திருக்கிறது', en: 'Application pending' },
      { id: 'safety', ta: 'பாதுகாப்பு உதவி', en: 'Safety support issue' },
      { id: 'marriage_assist', ta: 'திருமண உதவி தாமதம்', en: 'Marriage assistance delay' },
      { id: 'shg', ta: 'சுய உதவிக் குழு', en: 'Self-help group issue' },
      { id: 'financial', ta: 'நிதி உதவி', en: 'Financial support issue' },
    ],
  },
  {
    id: 'health',
    en: 'Health Scheme',
    ta: 'சுகாதார திட்டம்',
    icon: '🏥',
    routedDepartment: 'health',
    extraFields: ['scheme_name', 'application_id'],
    subcategories: [
      { id: 'insurance_reject', ta: 'காப்பீடு நிராகரிப்பு', en: 'Insurance rejected' },
      { id: 'hospital_refuse', ta: 'மருத்துவமனை மறுப்பு', en: 'Hospital refusal' },
      { id: 'aid_delay', ta: 'மருத்துவ உதவி தாமதம்', en: 'Medical assistance delay' },
      { id: 'card_inactive', ta: 'கார்டு செயலிழந்தது', en: 'Card inactive' },
      { id: 'treatment_reject', ta: 'சிகிச்சை அங்கீகரிக்கப்படவில்லை', en: 'Treatment not approved' },
      { id: 'wrong_claim', ta: 'தவறான கூற்று நிராகரிப்பு', en: 'Wrong claim denial' },
    ],
  },
  {
    id: 'employment',
    en: 'Employment / Subsidy',
    ta: 'வேலைவாய்ப்பு / மானியம்',
    icon: '💼',
    extraFields: ['scheme_name', 'application_id'],
    subcategories: [
      { id: 'subsidy_pending', ta: 'மானியம் வரவு வைக்கப்படவில்லை', en: 'Subsidy not credited' },
      { id: 'training', ta: 'பயிற்சி சிக்கல்', en: 'Training issue' },
      { id: 'loan_pending', ta: 'கடன் உதவி காத்திருக்கிறது', en: 'Loan assistance pending' },
      { id: 'shg', ta: 'SHG உதவி', en: 'SHG support issue' },
      { id: 'farmer', ta: 'விவசாயி மானியம்', en: 'Farmer subsidy issue' },
      { id: 'self_employ', ta: 'சுய வேலைவாய்ப்பு உதவி', en: 'Self-employment support delay' },
    ],
  },
  {
    id: 'certificates',
    en: 'Certificates & Revenue',
    ta: 'சான்றிதழ் & வருவாய்',
    icon: '📄',
    extraFields: ['application_id'],
    subcategories: [
      { id: 'community', ta: 'சாதிச் சான்றிதழ் தாமதம்', en: 'Community certificate delay' },
      { id: 'income', ta: 'வருமான சான்றிதழ்', en: 'Income certificate delay' },
      { id: 'nativity', ta: 'தாயக சான்றிதழ்', en: 'Nativity certificate delay' },
      { id: 'birth', ta: 'பிறப்புச் சான்றிதழ்', en: 'Birth certificate issue' },
      { id: 'death', ta: 'இறப்புச் சான்றிதழ்', en: 'Death certificate issue' },
      { id: 'patta', ta: 'பட்டா சிக்கல்', en: 'Patta issue' },
      { id: 'chitta', ta: 'சிட்டா சிக்கல்', en: 'Chitta issue' },
      { id: 'aadhaar', ta: 'ஆதார் இணைப்பு', en: 'Aadhaar linkage issue' },
      { id: 'mutation', ta: 'நில மாற்றம் தாமதம்', en: 'Land mutation delay' },
    ],
  },
  {
    id: 'other',
    en: 'Other Welfare Issue',
    ta: 'மற்றவை',
    icon: '📌',
    subcategories: [
      { id: 'general', ta: 'மற்றவை', en: 'Other' },
    ],
  },
];

export const WELFARE_STATUS = [
  { id: 'submitted',         en: 'Submitted',           ta: 'சமர்ப்பிக்கப்பட்டது',     color: 'bg-blue-100 text-blue-800' },
  { id: 'verified',          en: 'Verified',            ta: 'சரிபார்க்கப்பட்டது',      color: 'bg-indigo-100 text-indigo-800' },
  { id: 'dept_contacted',    en: 'Department Contacted',ta: 'துறை தொடர்பு கொள்ளப்பட்டது',color: 'bg-violet-100 text-violet-800' },
  { id: 'under_processing',  en: 'Under Processing',    ta: 'செயலாக்கத்தில்',          color: 'bg-purple-100 text-purple-800' },
  { id: 'awaiting_govt',     en: 'Awaiting Govt Response', ta: 'அரசு பதிலுக்கு காத்திருப்பு', color: 'bg-amber-100 text-amber-800' },
  { id: 'resolved',          en: 'Resolved',            ta: 'தீர்க்கப்பட்டது',         color: 'bg-green-100 text-green-800' },
  { id: 'citizen_confirmed', en: 'Citizen Confirmed',   ta: 'குடிமகன் உறுதிசெய்தார்',  color: 'bg-emerald-100 text-emerald-800' },
];

export const MONTHS_PENDING_OPTIONS = [
  { id: '<1',  en: 'Less than 1 month',  ta: '1 மாதத்திற்கு குறைவாக' },
  { id: '1-3', en: '1–3 months',         ta: '1–3 மாதங்கள்' },
  { id: '3-6', en: '3–6 months',         ta: '3–6 மாதங்கள்' },
  { id: '6+',  en: 'More than 6 months', ta: '6+ மாதங்கள்' },
];
