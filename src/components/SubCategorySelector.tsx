import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ArrowRight, ArrowLeft, Check, Plus } from 'lucide-react';

interface SubCategory {
  id: string;
  name: string;
  tamilName: string;
}

const subCategoriesMap: Record<string, SubCategory[]> = {
  education: [
    { id: 'gov-schools', name: 'Government Schools', tamilName: 'அரசு பள்ளிகள்' },
    { id: 'skill-training', name: 'Skill Training', tamilName: 'திறன் பயிற்சி' },
    { id: 'digital-literacy', name: 'Digital Literacy', tamilName: 'டிஜிட்டல் கல்வி' },
    { id: 'scholarships', name: 'Scholarships', tamilName: 'உதவித்தொகை' },
    { id: 'higher-education', name: 'Higher Education', tamilName: 'உயர்கல்வி' },
    { id: 'teacher-quality', name: 'Teacher Quality', tamilName: 'ஆசிரியர் தரம்' },
    { id: 'school-infra', name: 'School Infrastructure', tamilName: 'பள்ளி உட்கட்டமைப்பு' },
    { id: 'midday-meal', name: 'Mid-day Meal', tamilName: 'மதிய உணவு' },
    { id: 'education-other', name: 'Other', tamilName: 'மற்றவை' },
  ],
  healthcare: [
    { id: 'maternal-care', name: 'Maternal Care', tamilName: 'தாய்மை பராமரிப்பு' },
    { id: 'rural-clinics', name: 'Rural Clinics', tamilName: 'கிராமப்புற மருத்துவமனை' },
    { id: 'ambulance', name: 'Ambulance Services', tamilName: 'ஆம்புலன்ஸ் சேவை' },
    { id: 'health-insurance', name: 'Health Insurance', tamilName: 'சுகாதார காப்பீடு' },
    { id: 'mental-health', name: 'Mental Health', tamilName: 'மனநல சேவை' },
    { id: 'doctor-shortage', name: 'Doctor Shortage', tamilName: 'மருத்துவர் பற்றாக்குறை' },
    { id: 'medicine-availability', name: 'Medicine Availability', tamilName: 'மருந்து கிடைக்கும் தன்மை' },
    { id: 'hospital-cleanliness', name: 'Hospital Cleanliness', tamilName: 'மருத்துவமனை சுத்தம்' },
    { id: 'healthcare-other', name: 'Other', tamilName: 'மற்றவை' },
  ],
  jobs: [
    { id: 'employment', name: 'Employment Exchange', tamilName: 'வேலைவாய்ப்பு பரிமாற்றம்' },
    { id: 'msme', name: 'MSME Support', tamilName: 'சிறு தொழில் ஆதரவு' },
    { id: 'startup', name: 'Startup Ecosystem', tamilName: 'தொடக்க நிறுவனங்கள்' },
    { id: 'skill-dev', name: 'Skill Development', tamilName: 'திறன் மேம்பாடு' },
    { id: 'govt-jobs', name: 'Government Jobs', tamilName: 'அரசு வேலைகள்' },
    { id: 'private-sector', name: 'Private Sector Jobs', tamilName: 'தனியார் வேலைகள்' },
    { id: 'unemployment', name: 'Unemployment Benefits', tamilName: 'வேலையின்மை நலன்கள்' },
    { id: 'jobs-other', name: 'Other', tamilName: 'மற்றவை' },
  ],
  infrastructure: [
    { id: 'roads', name: 'Roads & Highways', tamilName: 'சாலைகள்' },
    { id: 'electricity', name: 'Electricity', tamilName: 'மின்சாரம்' },
    { id: 'water', name: 'Water Supply', tamilName: 'குடிநீர்' },
    { id: 'public-transport', name: 'Public Transport', tamilName: 'பொது போக்குவரத்து' },
    { id: 'bridges', name: 'Bridges & Flyovers', tamilName: 'பாலங்கள்' },
    { id: 'streetlights', name: 'Street Lights', tamilName: 'தெரு விளக்குகள்' },
    { id: 'drainage', name: 'Drainage System', tamilName: 'வடிகால் அமைப்பு' },
    { id: 'infra-other', name: 'Other', tamilName: 'மற்றவை' },
  ],
  housing: [
    { id: 'affordable-housing', name: 'Affordable Housing', tamilName: 'மலிவு வீடுகள்' },
    { id: 'rent-regulation', name: 'Rent & Regulation', tamilName: 'வாடகை & கட்டுப்பாடு' },
    { id: 'slum-rehab', name: 'Slum Rehabilitation', tamilName: 'குடிசை மறுவாழ்வு' },
    { id: 'basic-amenities', name: 'Basic Amenities', tamilName: 'அடிப்படை வசதிகள்' },
    { id: 'housing-other', name: 'Other', tamilName: 'மற்றவை' },
  ],
  agriculture: [
    { id: 'irrigation', name: 'Irrigation', tamilName: 'நீர்ப்பாசனம்' },
    { id: 'market-access', name: 'Market Access', tamilName: 'சந்தை அணுகல்' },
    { id: 'farm-tech', name: 'Farm Technology', tamilName: 'விவசாய தொழில்நுட்பம்' },
    { id: 'crop-insurance', name: 'Crop Insurance', tamilName: 'பயிர் காப்பீடு' },
    { id: 'loans', name: 'Farmer Loans', tamilName: 'விவசாய கடன்' },
    { id: 'fertilizer-subsidy', name: 'Fertilizer Subsidy', tamilName: 'உர மானியம்' },
    { id: 'minimum-price', name: 'Minimum Support Price', tamilName: 'குறைந்தபட்ச ஆதார விலை' },
    { id: 'organic-farming', name: 'Organic Farming', tamilName: 'இயற்கை விவசாயம்' },
    { id: 'agri-other', name: 'Other', tamilName: 'மற்றவை' },
  ],
  industry: [
    { id: 'msme-support', name: 'MSME Support', tamilName: 'சிறு தொழில் ஆதரவு' },
    { id: 'industrial-safety', name: 'Industrial Safety', tamilName: 'தொழிற்சாலை பாதுகாப்பு' },
    { id: 'skill-upgrade', name: 'Skill Upgrade', tamilName: 'திறன் மேம்பாடு' },
    { id: 'investment', name: 'Investment & Jobs', tamilName: 'முதலீடு & வேலை' },
    { id: 'industry-other', name: 'Other', tamilName: 'மற்றவை' },
  ],
  tourism: [
    { id: 'heritage', name: 'Heritage Sites', tamilName: 'பாரம்பரிய இடங்கள்' },
    { id: 'local-economy', name: 'Local Economy', tamilName: 'உள்ளூர் பொருளாதாரம்' },
    { id: 'cleanliness', name: 'Tourist Cleanliness', tamilName: 'சுற்றுலா சுத்தம்' },
    { id: 'tourism-other', name: 'Other', tamilName: 'மற்றவை' },
  ],
  youth: [
    { id: 'sports-infra', name: 'Sports Infrastructure', tamilName: 'விளையாட்டு உட்கட்டமைப்பு' },
    { id: 'youth-centers', name: 'Youth Centers', tamilName: 'இளைஞர் மையங்கள்' },
    { id: 'career-guidance', name: 'Career Guidance', tamilName: 'தொழில் வழிகாட்டுதல்' },
    { id: 'cultural', name: 'Cultural Programs', tamilName: 'கலாச்சார நிகழ்ச்சிகள்' },
    { id: 'coaching', name: 'Sports Coaching', tamilName: 'விளையாட்டு பயிற்சி' },
    { id: 'talent-hunt', name: 'Talent Hunt', tamilName: 'திறமை தேடல்' },
    { id: 'youth-other', name: 'Other', tamilName: 'மற்றவை' },
  ],
  women: [
    { id: 'safety', name: 'Women Safety', tamilName: 'பெண்கள் பாதுகாப்பு' },
    { id: 'women-edu', name: 'Women Education', tamilName: 'பெண் கல்வி' },
    { id: 'self-help', name: 'Self Help Groups', tamilName: 'சுய உதவிக் குழுக்கள்' },
    { id: 'maternity', name: 'Maternity Benefits', tamilName: 'மகப்பேறு நலன்கள்' },
    { id: 'harassment', name: 'Harassment Issues', tamilName: 'துன்புறுத்தல் பிரச்சினைகள்' },
    { id: 'women-employment', name: 'Women Employment', tamilName: 'பெண்கள் வேலைவாய்ப்பு' },
    { id: 'women-other', name: 'Other', tamilName: 'மற்றவை' },
  ],
  disability: [
    { id: 'accessibility', name: 'Accessibility', tamilName: 'அணுகல் வசதி' },
    { id: 'benefits', name: 'Benefits & Pensions', tamilName: 'நலன் & ஓய்வூதியம்' },
    { id: 'education-support', name: 'Education Support', tamilName: 'கல்வி ஆதரவு' },
    { id: 'jobs-support', name: 'Jobs Support', tamilName: 'வேலை ஆதரவு' },
    { id: 'disability-other', name: 'Other', tamilName: 'மற்றவை' },
  ],
  environment: [
    { id: 'pollution', name: 'Pollution Control', tamilName: 'மாசு கட்டுப்பாடு' },
    { id: 'green-cover', name: 'Green Cover', tamilName: 'பசுமை பரப்பு' },
    { id: 'waste', name: 'Waste Management', tamilName: 'கழிவு மேலாண்மை' },
    { id: 'renewable', name: 'Renewable Energy', tamilName: 'புதுப்பிக்கத்தக்க எரிசக்தி' },
    { id: 'air-quality', name: 'Air Quality', tamilName: 'காற்று தரம்' },
    { id: 'noise-pollution', name: 'Noise Pollution', tamilName: 'ஒலி மாசு' },
    { id: 'env-other', name: 'Other', tamilName: 'மற்றவை' },
  ],
  'law-order': [
    { id: 'police-response', name: 'Police Response', tamilName: 'காவல் துறை பதில்' },
    { id: 'crime-prevention', name: 'Crime Prevention', tamilName: 'குற்றம் தடுப்பு' },
    { id: 'cctv', name: 'CCTV Coverage', tamilName: 'சிசிடிவி' },
    { id: 'night-patrol', name: 'Night Patrol', tamilName: 'இரவு ரோந்து' },
    { id: 'law-other', name: 'Other', tamilName: 'மற்றவை' },
  ],
  transport: [
    { id: 'bus-service', name: 'Bus Service', tamilName: 'பேருந்து சேவை' },
    { id: 'train-service', name: 'Train Service', tamilName: 'ரயில் சேவை' },
    { id: 'traffic-mgmt', name: 'Traffic Management', tamilName: 'போக்குவரத்து மேலாண்மை' },
    { id: 'parking', name: 'Parking Facilities', tamilName: 'வாகன நிறுத்துமிடம்' },
    { id: 'transport-other', name: 'Other', tamilName: 'மற்றவை' },
  ],
  'water-sanitation': [
    { id: 'drinking-water', name: 'Drinking Water', tamilName: 'குடிநீர்' },
    { id: 'sewage', name: 'Sewage System', tamilName: 'கழிவுநீர் அமைப்பு' },
    { id: 'public-toilets', name: 'Public Toilets', tamilName: 'பொது கழிவறைகள்' },
    { id: 'water-quality', name: 'Water Quality', tamilName: 'நீர் தரம்' },
    { id: 'water-other', name: 'Other', tamilName: 'மற்றவை' },
  ],
  'social-justice': [
    { id: 'caste-discrimination', name: 'Caste Discrimination', tamilName: 'சாதி பாகுபாடு' },
    { id: 'reservation', name: 'Reservation Issues', tamilName: 'இட ஒதுக்கீடு' },
    { id: 'sc-st-welfare', name: 'SC/ST Welfare', tamilName: 'தலித் நலன்' },
    { id: 'minority-rights', name: 'Minority Rights', tamilName: 'சிறுபான்மையினர் உரிமைகள்' },
    { id: 'social-other', name: 'Other', tamilName: 'மற்றவை' },
  ],
  corruption: [
    { id: 'bribe-demand', name: 'Bribe Demand', tamilName: 'லஞ்ச கோரிக்கை' },
    { id: 'govt-transparency', name: 'Government Transparency', tamilName: 'அரசு வெளிப்படைத்தன்மை' },
    { id: 'tender-issues', name: 'Tender Issues', tamilName: 'ஒப்பந்த பிரச்சினைகள்' },
    { id: 'land-grabbing', name: 'Land Grabbing', tamilName: 'நில ஆக்கிரமிப்பு' },
    { id: 'corruption-other', name: 'Other', tamilName: 'மற்றவை' },
  ],
  digital: [
    { id: 'internet-access', name: 'Internet Access', tamilName: 'இணைய அணுகல்' },
    { id: 'e-governance', name: 'E-Governance', tamilName: 'மின்-ஆளுமை' },
    { id: 'mobile-network', name: 'Mobile Network', tamilName: 'மொபைல் நெட்வொர்க்' },
    { id: 'digital-literacy', name: 'Digital Literacy', tamilName: 'டிஜிட்டல் கல்வி' },
    { id: 'digital-other', name: 'Other', tamilName: 'மற்றவை' },
  ],
  seniors: [
    { id: 'pension', name: 'Pension & Benefits', tamilName: 'ஓய்வூதியம் & நலன்கள்' },
    { id: 'senior-healthcare', name: 'Healthcare', tamilName: 'சுகாதாரம்' },
    { id: 'old-age-homes', name: 'Old Age Homes', tamilName: 'முதியோர் இல்லங்கள்' },
    { id: 'senior-recreation', name: 'Recreation', tamilName: 'பொழுதுபோக்கு' },
    { id: 'seniors-other', name: 'Other', tamilName: 'மற்றவை' },
  ],
  children: [
    { id: 'child-nutrition', name: 'Child Nutrition', tamilName: 'குழந்தை ஊட்டச்சத்து' },
    { id: 'child-education', name: 'Child Education', tamilName: 'குழந்தை கல்வி' },
    { id: 'child-protection', name: 'Child Protection', tamilName: 'குழந்தை பாதுகாப்பு' },
    { id: 'orphanages', name: 'Orphanages', tamilName: 'அனாதை இல்லங்கள்' },
    { id: 'children-other', name: 'Other', tamilName: 'மற்றவை' },
  ],
  'arts-culture': [
    { id: 'tamil-arts', name: 'Tamil Arts', tamilName: 'தமிழ் கலைகள்' },
    { id: 'music-dance', name: 'Music & Dance', tamilName: 'இசை & நடனம்' },
    { id: 'theatre-drama', name: 'Theatre & Drama', tamilName: 'நாடகம்' },
    { id: 'heritage-preservation', name: 'Heritage Preservation', tamilName: 'பாரம்பரிய பாதுகாப்பு' },
    { id: 'arts-culture-other', name: 'Other', tamilName: 'மற்றவை' },
  ],
  'legal-aid': [
    { id: 'free-legal-help', name: 'Free Legal Help', tamilName: 'இலவச சட்ட உதவி' },
    { id: 'rights-awareness', name: 'Rights Awareness', tamilName: 'உரிமை விழிப்புணர்வு' },
    { id: 'court-access', name: 'Court Access', tamilName: 'நீதிமன்ற அணுகல்' },
    { id: 'legal-aid-other', name: 'Other', tamilName: 'மற்றவை' },
  ],
  'banking-finance': [
    { id: 'loans', name: 'Loans & Credit', tamilName: 'கடன்கள்' },
    { id: 'insurance', name: 'Insurance', tamilName: 'காப்பீடு' },
    { id: 'financial-literacy', name: 'Financial Literacy', tamilName: 'நிதி கல்வி' },
    { id: 'banking-access', name: 'Banking Access', tamilName: 'வங்கி அணுகல்' },
    { id: 'banking-other', name: 'Other', tamilName: 'மற்றவை' },
  ],
  media: [
    { id: 'press-freedom', name: 'Press Freedom', tamilName: 'பத்திரிகை சுதந்திரம்' },
    { id: 'local-media', name: 'Local Media Support', tamilName: 'உள்ளூர் ஊடக ஆதரவு' },
    { id: 'fake-news', name: 'Fake News Prevention', tamilName: 'போலி செய்தி தடுப்பு' },
    { id: 'media-other', name: 'Other', tamilName: 'மற்றவை' },
  ],
  climate: [
    { id: 'climate-adaptation', name: 'Climate Adaptation', tamilName: 'காலநிலை தழுவல்' },
    { id: 'disaster-prep', name: 'Disaster Preparedness', tamilName: 'பேரிடர் தயார்நிலை' },
    { id: 'carbon-reduction', name: 'Carbon Reduction', tamilName: 'கார்பன் குறைப்பு' },
    { id: 'climate-other', name: 'Other', tamilName: 'மற்றவை' },
  ],
  'ration-pds': [
    { id: 'ration-cards', name: 'Ration Cards', tamilName: 'ரேஷன் அட்டைகள்' },
    { id: 'fair-price-shops', name: 'Fair Price Shops', tamilName: 'நியாய விலை கடைகள்' },
    { id: 'food-quality', name: 'Food Quality', tamilName: 'உணவு தரம்' },
    { id: 'ration-other', name: 'Other', tamilName: 'மற்றவை' },
  ],
  other: [
    { id: 'general-other', name: 'General Issue', tamilName: 'பொது பிரச்சினை' },
  ],
};

interface SubCategorySelectorProps {
  selectedCategories: string[];
  selectedSubCategories: string[];
  onChange: (subCategories: string[]) => void;
  onNext: () => void;
  onBack: () => void;
  otherSubCategories?: Record<string, string>;
  onOtherSubCategoryChange?: (categoryId: string, value: string) => void;
}

const SubCategorySelector: React.FC<SubCategorySelectorProps> = ({
  selectedCategories,
  selectedSubCategories,
  onChange,
  onNext,
  onBack,
  otherSubCategories = {},
  onOtherSubCategoryChange,
}) => {
  const toggleSubCategory = (subCategoryId: string) => {
    if (selectedSubCategories.includes(subCategoryId)) {
      onChange(selectedSubCategories.filter((id) => id !== subCategoryId));
    } else {
      onChange([...selectedSubCategories, subCategoryId]);
    }
  };

  // Group subcategories by their parent category
  const groupedSubCategories = selectedCategories.map(catId => ({
    categoryId: catId,
    subCategories: subCategoriesMap[catId] || [],
  })).filter(g => g.subCategories.length > 0);

  const hasOtherSelected = selectedSubCategories.some(id => id.endsWith('-other') || id === 'general-other');
  
  // Check if all selected "other" options have values
  const otherOptionsValid = selectedSubCategories
    .filter(id => id.endsWith('-other') || id === 'general-other')
    .every(id => {
      const catId = id.replace('-other', '');
      return otherSubCategories[catId]?.trim().length > 0;
    });

  const isValid = selectedSubCategories.length > 0 && (!hasOtherSelected || otherOptionsValid);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          துணை-பிரிவுகளைத் தேர்ந்தெடுக்கவும்
        </h2>
        <p className="text-lg text-muted-foreground">Select sub-categories</p>
        <p className="text-sm text-muted-foreground mt-1">
          (குறிப்பிட்ட பகுதிகளைத் தேர்வுசெய்க / Choose specific areas)
        </p>
      </div>

      <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-1">
        {groupedSubCategories.map(({ categoryId, subCategories }) => (
          <div key={categoryId} className="space-y-3">
            <h3 className="font-semibold text-primary capitalize border-b border-border pb-2">
              {categoryId.replace(/-/g, ' ')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {subCategories.map((subCategory) => {
                const isSelected = selectedSubCategories.includes(subCategory.id);
                const isOtherOption = subCategory.id.endsWith('-other') || subCategory.id === 'general-other';

                return (
                  <button
                    key={subCategory.id}
                    onClick={() => toggleSubCategory(subCategory.id)}
                    className={`p-3 rounded-lg border-2 transition-all duration-300 text-left flex items-center gap-3 ${
                      isSelected
                        ? 'border-tvk-maroon bg-tvk-maroon text-primary-foreground shadow-md'
                        : 'border-border hover:border-tvk-yellow/50 hover:bg-muted/50'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'border-primary-foreground bg-primary-foreground' : 'border-muted-foreground'
                      }`}
                    >
                      {isSelected && (isOtherOption ? <Plus className="w-3 h-3 text-tvk-maroon" /> : <Check className="w-3 h-3 text-tvk-maroon" />)}
                    </div>
                    <div>
                      <p className={`font-medium text-sm ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>
                        {subCategory.tamilName}
                      </p>
                      <p className={`text-xs ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        {subCategory.name}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            
            {/* Other input for this category */}
            {selectedSubCategories.some(id => id === `${categoryId}-other` || (categoryId === 'other' && id === 'general-other')) && (
              <div className="mt-2 animate-fade-in">
                <Input
                  placeholder="குறிப்பிடவும் / Please specify..."
                  value={otherSubCategories[categoryId] || ''}
                  onChange={(e) => onOtherSubCategoryChange?.(categoryId, e.target.value)}
                  className="h-10"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-4 pt-6">
        <Button variant="outline" size="xl" onClick={onBack} className="flex-1">
          <ArrowLeft className="mr-2" />
          பின்னால் / Back
        </Button>
        <Button
          variant="hero"
          size="xl"
          onClick={onNext}
          disabled={!isValid}
          className="flex-1 group"
        >
          அடுத்து / Next
          <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );
};

export { subCategoriesMap };
export default SubCategorySelector;