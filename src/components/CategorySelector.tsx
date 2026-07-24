import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ArrowRight, ArrowLeft, GraduationCap, Heart, Briefcase, Building2, Tractor, Trophy, Users, Leaf, Shield, Car, Droplets, Scale, Landmark, Wifi, Plus, Home, Accessibility, Mountain, Factory, Baby, Truck, Palette, Gavel, Banknote, Radio, Thermometer, Warehouse } from 'lucide-react';


interface Category {
  id: string;
  name: string;
  tamilName: string;
  icon: React.ElementType;
  description: string;
}

const categories: Category[] = [
  { id: 'education', name: 'Education', tamilName: 'கல்வி', icon: GraduationCap, description: 'Schools, colleges, learning facilities' },
  { id: 'healthcare', name: 'Healthcare', tamilName: 'சுகாதாரம்', icon: Heart, description: 'Hospitals, clinics, maternal care' },
  { id: 'jobs', name: 'Jobs & Economy', tamilName: 'வேலைவாய்ப்பு', icon: Briefcase, description: 'Employment, small business support' },
  { id: 'infrastructure', name: 'Infrastructure', tamilName: 'உட்கட்டமைப்பு', icon: Building2, description: 'Roads, electricity, water' },
  { id: 'housing', name: 'Housing', tamilName: 'வீடமைப்பு', icon: Home, description: 'Affordable housing, rent, basic amenities' },
  { id: 'agriculture', name: 'Agriculture', tamilName: 'விவசாயம்', icon: Tractor, description: 'Farmers support & farming tech' },
  { id: 'industry', name: 'Industry', tamilName: 'தொழில்துறை', icon: Factory, description: 'Manufacturing, MSME, investment, exports' },
  { id: 'tourism', name: 'Tourism & Culture', tamilName: 'சுற்றுலா & பண்பாடு', icon: Mountain, description: 'Tourism, heritage, local economy' },
  { id: 'youth', name: 'Youth & Sports', tamilName: 'இளைஞர் & விளையாட்டு', icon: Trophy, description: 'Youth programs, sports centers' },
  { id: 'women', name: 'Women Empowerment', tamilName: 'பெண்கள் அதிகாரம்', icon: Users, description: 'Safety, education, jobs' },
  { id: 'disability', name: 'Disability Rights', tamilName: 'மாற்றுத் திறனாளர் உரிமைகள்', icon: Accessibility, description: 'Accessibility, benefits, inclusive services' },
  { id: 'seniors', name: 'Senior Citizens', tamilName: 'மூத்த குடிமக்கள்', icon: Users, description: 'Elderly welfare, pensions, healthcare' },
  { id: 'children', name: 'Child Welfare', tamilName: 'குழந்தை நலன்', icon: Baby, description: 'Child protection, nutrition, education' },
  { id: 'environment', name: 'Environment', tamilName: 'சுற்றுச்சூழல்', icon: Leaf, description: 'Pollution, green initiatives' },
  { id: 'law-order', name: 'Law & Order', tamilName: 'சட்டம் & ஒழுங்கு', icon: Shield, description: 'Police, safety, crime prevention' },
  { id: 'transport', name: 'Transport', tamilName: 'போக்குவரத்து', icon: Car, description: 'Public transport, traffic management' },
  { id: 'water-sanitation', name: 'Water & Sanitation', tamilName: 'நீர் & சுகாதாரம்', icon: Droplets, description: 'Drinking water, drainage, toilets' },
  { id: 'social-justice', name: 'Social Justice', tamilName: 'சமூக நீதி', icon: Scale, description: 'Caste discrimination, equality' },
  { id: 'corruption', name: 'Anti-Corruption', tamilName: 'ஊழல் எதிர்ப்பு', icon: Landmark, description: 'Government transparency, bribes' },
  { id: 'digital', name: 'Digital Services', tamilName: 'டிஜிட்டல் சேவைகள்', icon: Wifi, description: 'Internet, e-governance, apps' },
  { id: 'arts-culture', name: 'Arts & Culture', tamilName: 'கலை & கலாச்சாரம்', icon: Palette, description: 'Tamil arts, music, theatre, heritage' },
  { id: 'legal-aid', name: 'Legal Aid', tamilName: 'சட்ட உதவி', icon: Gavel, description: 'Free legal help, rights awareness' },
  { id: 'banking-finance', name: 'Banking & Finance', tamilName: 'வங்கி & நிதி', icon: Banknote, description: 'Loans, insurance, financial literacy' },
  { id: 'media', name: 'Media & Press', tamilName: 'ஊடகம் & பத்திரிகை', icon: Radio, description: 'Press freedom, local media support' },
  { id: 'climate', name: 'Climate Action', tamilName: 'காலநிலை நடவடிக்கை', icon: Thermometer, description: 'Climate change, disaster preparedness' },
  { id: 'ration-pds', name: 'Ration & PDS', tamilName: 'ரேஷன் & பி.டி.எஸ்', icon: Warehouse, description: 'Food security, fair price shops' },
  { id: 'other', name: 'Other', tamilName: 'மற்றவை', icon: Plus, description: 'Any other category' },
];

interface CategorySelectorProps {
  selectedCategories: string[];
  onChange: (categories: string[]) => void;
  onNext: () => void;
  onBack: () => void;
  otherCategory?: string;
  onOtherCategoryChange?: (value: string) => void;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ 
  selectedCategories, 
  onChange, 
  onNext, 
  onBack,
  otherCategory = '',
  onOtherCategoryChange 
}) => {
  const [localOther, setLocalOther] = useState(otherCategory);

  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      onChange(selectedCategories.filter((id) => id !== categoryId));
      if (categoryId === 'other') {
        setLocalOther('');
        onOtherCategoryChange?.('');
      }
    } else {
      onChange([...selectedCategories, categoryId]);
    }
  };

  const handleOtherChange = (value: string) => {
    setLocalOther(value);
    onOtherCategoryChange?.(value);
  };

  const isOtherSelected = selectedCategories.includes('other');
  const isValid = selectedCategories.length > 0 && (!isOtherSelected || localOther.trim().length > 0);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="text-center mb-4 md:mb-8">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-2">
          முன்னுரிமை பிரிவுகளைத் தேர்ந்தெடுக்கவும்
        </h2>
        <p className="text-base md:text-lg text-muted-foreground">Select priority categories</p>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          (ஒன்று அல்லது அதற்கு மேற்பட்டவற்றைத் தேர்வுசெய்க / Select one or more)
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 max-h-[50vh] overflow-y-auto pr-1">
        {categories.map((category) => {
          const Icon = category.icon;
          const isSelected = selectedCategories.includes(category.id);

          return (
            <button
              key={category.id}
              onClick={() => toggleCategory(category.id)}
              className={`p-3 md:p-4 rounded-xl border-2 transition-all duration-300 text-left group ${
                isSelected
                  ? 'border-tvk-maroon bg-tvk-maroon/5 shadow-md'
                  : 'border-border hover:border-tvk-yellow/50 hover:bg-muted/50'
              }`}
            >
              <div className="flex items-start gap-3 md:gap-4">
                <div
                  className={`p-2 md:p-3 rounded-lg transition-all duration-300 flex-shrink-0 ${
                    isSelected
                      ? 'bg-tvk-maroon text-primary-foreground'
                      : 'bg-muted text-muted-foreground group-hover:bg-tvk-yellow/20 group-hover:text-tvk-maroon'
                  }`}
                >
                  <Icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-sm md:text-base ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                    {category.tamilName}
                  </h3>
                  <p className="text-xs md:text-sm text-muted-foreground">{category.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 md:mt-1 hidden sm:block">{category.description}</p>
                </div>
                <div
                  className={`w-5 h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
                    isSelected
                      ? 'border-tvk-maroon bg-tvk-maroon'
                      : 'border-muted-foreground'
                  }`}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 md:w-4 md:h-4 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Other category input */}
      {isOtherSelected && (
        <div className="space-y-2 animate-fade-in">
          <label className="text-sm font-medium text-foreground">
            மற்ற பிரிவை குறிப்பிடவும் / Specify other category
          </label>
          <Input
            placeholder="உங்கள் பிரிவை எழுதுங்கள் / Type your category..."
            value={localOther}
            onChange={(e) => handleOtherChange(e.target.value)}
            className="h-11"
          />
        </div>
      )}

      <div className="flex gap-3 md:gap-4 pt-4 md:pt-6">
        <Button variant="outline" size="lg" onClick={onBack} className="flex-1 text-sm md:text-base">
          <ArrowLeft className="mr-1 md:mr-2 w-4 h-4" />
          Back
        </Button>
        <Button
          variant="hero"
          size="lg"
          onClick={onNext}
          disabled={!isValid}
          className="flex-1 group text-sm md:text-base"
        >
          Next
          <ArrowRight className="ml-1 md:ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );
};

export { categories };
export default CategorySelector;