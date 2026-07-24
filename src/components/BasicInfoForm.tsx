import React from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { ArrowRight, User, MapPin, Briefcase, Calendar, Building, Home } from 'lucide-react';
import { getConstituenciesForCity } from '@/lib/constituencies';

interface BasicInfoFormProps {
  data: {
    name: string;
    age: string;
    city: string;
    constituency: string;
    area?: string;
    pollingBooth?: string;
    pincode: string;
    occupation: string;
  };
  onChange: (field: string, value: string) => void;
  onNext: () => void;
  areas?: { area_name: string; polling_booths: string[] }[];
}

const tamilNaduCities = [
  'Chennai / சென்னை',
  'Coimbatore / கோயம்புத்தூர்',
  'Madurai / மதுரை',
  'Tiruchirappalli / திருச்சிராப்பள்ளி',
  'Salem / சேலம்',
  'Tirunelveli / திருநெல்வேலி',
  'Tiruppur / திருப்பூர்',
  'Erode / ஈரோடு',
  'Vellore / வேலூர்',
  'Thoothukudi / தூத்துக்குடி',
  'Dindigul / திண்டுக்கல்',
  'Thanjavur / தஞ்சாவூர்',
  'Nagercoil / நாகர்கோவில்',
  'Kanchipuram / காஞ்சிபுரம்',
  'Cuddalore / கடலூர்',
  'Karur / கரூர்',
  'Krishnagiri / கிருஷ்ணகிரி',
  'Dharmapuri / தர்மபுரி',
  'Namakkal / நாமக்கல்',
  'Ariyalur / அரியலூர்',
  'Other / மற்றவை',
];

const occupations = [
  'Student / மாணவர்',
  'Farmer / விவசாயி',
  'Business Owner / தொழிலதிபர்',
  'Government Employee / அரசு ஊழியர்',
  'Private Employee / தனியார் ஊழியர்',
  'Doctor / மருத்துவர்',
  'Teacher / ஆசிரியர்',
  'Engineer / பொறியாளர்',
  'Lawyer / வழக்கறிஞர்',
  'Homemaker / இல்லத்தரசி',
  'Daily Wage Worker / கூலி தொழிலாளி',
  'Self Employed / சுயதொழில்',
  'Retired / ஓய்வு பெற்றவர்',
  'Unemployed / வேலையில்லாதவர்',
  'Other / மற்றவை',
];

const BasicInfoForm: React.FC<BasicInfoFormProps> = ({ data, onChange, onNext, areas = [] }) => {
  const isValid = data.name && data.age && data.city && data.pincode && data.occupation;
  const constituencies = data.city ? getConstituenciesForCity(data.city) : [];
  const selectedArea = areas.find(a => a.area_name === data.area);
  const pollingBooths = selectedArea?.polling_booths || [];

  const handleCityChange = (city: string) => {
    onChange('city', city);
    onChange('constituency', '');
    onChange('area', '');
    onChange('pollingBooth', '');
  };

  const handleConstituencyChange = (constituency: string) => {
    onChange('constituency', constituency);
    onChange('area', '');
    onChange('pollingBooth', '');
  };

  const handleAreaChange = (area: string) => {
    onChange('area', area);
    onChange('pollingBooth', '');
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-2">
          உங்களைப் பற்றி சொல்லுங்கள்
        </h2>
        <p className="text-base md:text-lg text-muted-foreground">Tell us about yourself</p>
      </div>

      <div className="grid gap-4 md:gap-5">
        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name" className="flex items-center gap-2 text-sm md:text-base">
            <User className="w-4 h-4 text-primary flex-shrink-0" />
            <span>பெயர் / Name</span>
          </Label>
          <Input
            id="name"
            placeholder="உங்கள் பெயர் / Enter your name"
            value={data.name}
            onChange={(e) => onChange('name', e.target.value)}
            className="h-11 md:h-12 text-sm md:text-base"
          />
        </div>

        {/* Age */}
        <div className="space-y-1.5">
          <Label htmlFor="age" className="flex items-center gap-2 text-sm md:text-base">
            <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
            <span>வயது / Age</span>
          </Label>
          <Input
            id="age"
            type="number"
            min="18"
            max="100"
            placeholder="உங்கள் வயது / Enter your age"
            value={data.age}
            onChange={(e) => onChange('age', e.target.value)}
            className="h-11 md:h-12 text-sm md:text-base"
          />
        </div>

        {/* City */}
        <div className="space-y-1.5">
          <Label htmlFor="city" className="flex items-center gap-2 text-sm md:text-base">
            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
            <span>நகரம் / City</span>
          </Label>
          <Select value={data.city} onValueChange={handleCityChange}>
            <SelectTrigger className="h-11 md:h-12 text-sm md:text-base">
              <SelectValue placeholder="நகரத்தை தேர்ந்தெடுக்கவும் / Select city" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {tamilNaduCities.map((city) => (
                <SelectItem key={city} value={city} className="text-sm md:text-base">
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Constituency */}
        {data.city && constituencies.length > 0 && (
          <div className="space-y-1.5 animate-fade-in">
            <Label htmlFor="constituency" className="flex items-center gap-2 text-sm md:text-base">
              <Building className="w-4 h-4 text-primary flex-shrink-0" />
              <span>தொகுதி / Constituency</span>
            </Label>
            <Select value={data.constituency} onValueChange={handleConstituencyChange}>
              <SelectTrigger className="h-11 md:h-12 text-sm md:text-base">
                <SelectValue placeholder="தொகுதியைத் தேர்ந்தெடுக்கவும் / Select constituency" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {constituencies.map((constituency) => (
                  <SelectItem key={constituency} value={constituency} className="text-sm md:text-base">
                    {constituency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Area */}
        {data.constituency && areas.length > 0 && (
          <div className="space-y-1.5 animate-fade-in">
            <Label htmlFor="area" className="flex items-center gap-2 text-sm md:text-base">
              <Home className="w-4 h-4 text-primary flex-shrink-0" />
              <span>பகுதி / Area</span>
            </Label>
            <Select value={data.area || ''} onValueChange={handleAreaChange}>
              <SelectTrigger className="h-11 md:h-12 text-sm md:text-base">
                <SelectValue placeholder="பகுதியைத் தேர்ந்தெடுக்கவும் / Select area" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {areas.map((area) => (
                  <SelectItem key={area.area_name} value={area.area_name} className="text-sm md:text-base">
                    {area.area_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Polling Booth */}
        {data.area && pollingBooths.length > 0 && (
          <div className="space-y-1.5 animate-fade-in">
            <Label htmlFor="pollingBooth" className="flex items-center gap-2 text-sm md:text-base">
              <Building className="w-4 h-4 text-primary flex-shrink-0" />
              <span>வாக்குச்சாவடி / Polling Booth</span>
            </Label>
            <Select value={data.pollingBooth || ''} onValueChange={(v) => onChange('pollingBooth', v)}>
              <SelectTrigger className="h-11 md:h-12 text-sm md:text-base">
                <SelectValue placeholder="வாக்குச்சாவடியைத் தேர்ந்தெடுக்கவும் / Select booth" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {pollingBooths.map((booth) => (
                  <SelectItem key={booth} value={booth} className="text-sm md:text-base">
                    {booth}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Pincode */}
        <div className="space-y-1.5">
          <Label htmlFor="pincode" className="flex items-center gap-2 text-sm md:text-base">
            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
            <span>அஞ்சல் குறியீடு / Pincode</span>
          </Label>
          <Input
            id="pincode"
            placeholder="6 இலக்க அஞ்சல் குறியீடு / Enter 6-digit pincode"
            value={data.pincode}
            onChange={(e) => onChange('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="h-11 md:h-12 text-sm md:text-base"
            maxLength={6}
          />
        </div>

        {/* Occupation - Now a dropdown */}
        <div className="space-y-1.5">
          <Label htmlFor="occupation" className="flex items-center gap-2 text-sm md:text-base">
            <Briefcase className="w-4 h-4 text-primary flex-shrink-0" />
            <span>தொழில் / Occupation</span>
          </Label>
          <Select value={data.occupation} onValueChange={(v) => onChange('occupation', v)}>
            <SelectTrigger className="h-11 md:h-12 text-sm md:text-base">
              <SelectValue placeholder="தொழிலைத் தேர்ந்தெடுக்கவும் / Select occupation" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {occupations.map((occupation) => (
                <SelectItem key={occupation} value={occupation} className="text-sm md:text-base">
                  {occupation}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="pt-4 md:pt-6">
        <Button
          variant="hero"
          size="lg"
          onClick={onNext}
          disabled={!isValid}
          className="w-full group text-sm md:text-base"
        >
          அடுத்து / Next
          <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );
};

export default BasicInfoForm;