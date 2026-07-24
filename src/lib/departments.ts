export interface Department {
  id: string;
  ta: string;
  en: string;
  icon: string;
  categories: { id: string; ta: string; en: string }[];
}

export const DEPARTMENTS: Department[] = [
  {
    id: 'roads',
    ta: 'சாலை & போக்குவரத்து',
    en: 'Roads & Transport',
    icon: '🛣️',
    categories: [
      { id: 'pothole', ta: 'குழி / சேதமான சாலை', en: 'Potholes / Damaged road' },
      { id: 'streetlight', ta: 'தெரு விளக்கு', en: 'Street light failure' },
      { id: 'signage', ta: 'போக்குவரத்து அடையாளம்', en: 'Signage / Signal' },
      { id: 'bus', ta: 'பேருந்து சேவை', en: 'Bus service / timing' },
    ],
  },
  {
    id: 'water',
    ta: 'குடிநீர் & வடிகால்',
    en: 'Water & Drainage',
    icon: '💧',
    categories: [
      { id: 'no-water', ta: 'குடிநீர் வரவில்லை', en: 'No water supply' },
      { id: 'leak', ta: 'குழாய் கசிவு', en: 'Pipe leak' },
      { id: 'drainage', ta: 'வடிகால் அடைப்பு', en: 'Drainage block' },
      { id: 'flooding', ta: 'தண்ணீர் தேக்கம்', en: 'Flooding / waterlogging' },
    ],
  },
  {
    id: 'electricity',
    ta: 'மின்சாரம் (EB)',
    en: 'Electricity (EB)',
    icon: '⚡',
    categories: [
      { id: 'power-cut', ta: 'மின்வெட்டு', en: 'Power cut' },
      { id: 'transformer', ta: 'டிரான்ஸ்பார்மர் கோளாறு', en: 'Transformer issue' },
      { id: 'wire', ta: 'தொங்கும் கம்பி', en: 'Loose / hanging wire' },
      { id: 'billing', ta: 'பில்லிங் பிரச்சனை', en: 'Billing issue' },
    ],
  },
  {
    id: 'sanitation',
    ta: 'துப்புரவு & குப்பை',
    en: 'Sanitation & Garbage',
    icon: '🗑️',
    categories: [
      { id: 'garbage', ta: 'குப்பை குவியல்', en: 'Garbage cluster' },
      { id: 'no-collection', ta: 'குப்பை சேகரிப்பு இல்லை', en: 'No garbage collection' },
      { id: 'public-toilet', ta: 'பொது கழிப்பறை', en: 'Public toilet issue' },
      { id: 'dead-animal', ta: 'இறந்த கால்நடை', en: 'Dead animal / carcass' },
    ],
  },
  {
    id: 'health',
    ta: 'சுகாதாரம்',
    en: 'Health',
    icon: '🏥',
    categories: [
      { id: 'phc', ta: 'ஆரம்ப சுகாதார மையம்', en: 'PHC / Hospital service' },
      { id: 'medicine', ta: 'மருந்து கிடைப்பு', en: 'Medicine availability' },
      { id: 'ambulance', ta: 'ஆம்புலன்ஸ்', en: 'Ambulance' },
      { id: 'mosquito', ta: 'கொசு / நோய்', en: 'Mosquito / disease outbreak' },
    ],
  },
  {
    id: 'ration',
    ta: 'ரேஷன் & PDS',
    en: 'Ration & PDS',
    icon: '🍚',
    categories: [
      { id: 'no-ration', ta: 'ரேஷன் கிடைக்கவில்லை', en: 'Ration not given' },
      { id: 'short-weight', ta: 'குறைவான அளவு', en: 'Short weight' },
      { id: 'card-issue', ta: 'ரேஷன் கார்டு பிரச்சனை', en: 'Ration card issue' },
      { id: 'shop-closed', ta: 'கடை மூடப்பட்டுள்ளது', en: 'Shop closed' },
    ],
  },
  {
    id: 'women-safety',
    ta: 'பெண்கள் பாதுகாப்பு',
    en: 'Women Safety',
    icon: '🛡️',
    categories: [
      { id: 'harassment', ta: 'தொல்லை', en: 'Harassment' },
      { id: 'unsafe-area', ta: 'பாதுகாப்பற்ற பகுதி', en: 'Unsafe area' },
      { id: 'no-streetlight', ta: 'வெளிச்சம் இல்லை', en: 'No street lighting' },
      { id: 'domestic', ta: 'குடும்ப வன்முறை', en: 'Domestic violence' },
    ],
  },
  {
    id: 'corruption',
    ta: 'ஊழல் / லஞ்சம்',
    en: 'Corruption / Bribery',
    icon: '⚖️',
    categories: [
      { id: 'bribe', ta: 'லஞ்சம் கேட்டார்', en: 'Bribe demanded' },
      { id: 'fake-rejection', ta: 'போலி நிராகரிப்பு', en: 'Fake welfare rejection' },
      { id: 'misuse', ta: 'அதிகார துஷ்பிரயோகம்', en: 'Power misuse' },
      { id: 'diversion', ta: 'திட்ட திருப்பி விடுதல்', en: 'Scheme diversion' },
    ],
  },
  {
    id: 'education',
    ta: 'கல்வி',
    en: 'Education',
    icon: '🏫',
    categories: [
      { id: 'school', ta: 'பள்ளி வசதி', en: 'School facility' },
      { id: 'teacher', ta: 'ஆசிரியர் இல்லை', en: 'No teacher' },
      { id: 'midday', ta: 'மதிய உணவு', en: 'Midday meal issue' },
      { id: 'fees', ta: 'கட்டண பிரச்சனை', en: 'Fee issue' },
    ],
  },
  {
    id: 'other',
    ta: 'மற்றவை',
    en: 'Other',
    icon: '📌',
    categories: [
      { id: 'general', ta: 'மற்றவை', en: 'Other' },
    ],
  },
];

export const URGENCY_LEVELS = [
  { id: 'low', ta: 'குறைவு', en: 'Low', color: 'bg-blue-100 text-blue-800' },
  { id: 'medium', ta: 'நடுத்தர', en: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'high', ta: 'அதிகம்', en: 'High', color: 'bg-orange-100 text-orange-800' },
  { id: 'emergency', ta: 'அவசரம்', en: 'Emergency', color: 'bg-red-100 text-red-800' },
];

export const STATUS_STAGES = [
  { id: 'reported', ta: 'புகாரளிக்கப்பட்டது', en: 'Reported', color: 'bg-slate-100 text-slate-800' },
  { id: 'verified', ta: 'சரிபார்க்கப்பட்டது', en: 'Verified', color: 'bg-blue-100 text-blue-800' },
  { id: 'assigned', ta: 'ஒதுக்கப்பட்டது', en: 'Assigned', color: 'bg-indigo-100 text-indigo-800' },
  { id: 'work_started', ta: 'பணி தொடங்கியது', en: 'Work Started', color: 'bg-purple-100 text-purple-800' },
  { id: 'in_progress', ta: 'நடைபெற்று வருகிறது', en: 'In Progress', color: 'bg-orange-100 text-orange-800' },
  { id: 'completed', ta: 'முடிக்கப்பட்டது', en: 'Completed', color: 'bg-green-100 text-green-800' },
  { id: 'citizen_confirmed', ta: 'குடிமகன் உறுதி', en: 'Citizen Confirmed', color: 'bg-emerald-100 text-emerald-800' },
];
