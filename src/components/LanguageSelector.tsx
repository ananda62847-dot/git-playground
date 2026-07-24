import React from 'react';
import { Button } from './ui/button';
import { Globe } from 'lucide-react';

export type Language = 'ta' | 'en';

interface LanguageSelectorProps {
  language: Language;
  onChange: (lang: Language) => void;
  className?: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ language, onChange, className = '' }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Globe className="w-4 h-4 text-muted-foreground" />
      <div className="flex rounded-lg overflow-hidden border border-border">
        <Button
          variant={language === 'ta' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onChange('ta')}
          className={`rounded-none text-xs px-3 ${
            language === 'ta' ? 'bg-tvk-maroon hover:bg-tvk-maroon/90' : ''
          }`}
        >
          தமிழ்
        </Button>
        <Button
          variant={language === 'en' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onChange('en')}
          className={`rounded-none text-xs px-3 ${
            language === 'en' ? 'bg-tvk-maroon hover:bg-tvk-maroon/90' : ''
          }`}
        >
          English
        </Button>
      </div>
    </div>
  );
};

// Translation strings
export const translations = {
  ta: {
    // Basic Info Form
    tellAboutYourself: 'உங்களைப் பற்றி சொல்லுங்கள்',
    name: 'பெயர்',
    age: 'வயது',
    city: 'நகரம்',
    constituency: 'தொகுதி',
    area: 'பகுதி',
    pollingBooth: 'வாக்குச்சாவடி',
    pincode: 'அஞ்சல் குறியீடு',
    occupation: 'தொழில்',
    next: 'அடுத்து',
    back: 'பின்னால்',
    submit: 'சமர்ப்பிக்கவும்',
    enterName: 'உங்கள் பெயரை உள்ளிடுக',
    enterAge: 'உங்கள் வயதை உள்ளிடுக',
    selectCity: 'நகரத்தை தேர்ந்தெடுக்கவும்',
    selectConstituency: 'தொகுதியைத் தேர்ந்தெடுக்கவும்',
    selectArea: 'பகுதியைத் தேர்ந்தெடுக்கவும்',
    selectBooth: 'வாக்குச்சாவடியைத் தேர்ந்தெடுக்கவும்',
    enterPincode: '6 இலக்க அஞ்சல் குறியீடு',
    selectOccupation: 'தொழிலைத் தேர்ந்தெடுக்கவும்',
    
    // Category Selector
    selectCategories: 'முன்னுரிமை பிரிவுகளைத் தேர்ந்தெடுக்கவும்',
    selectOneOrMore: 'ஒன்று அல்லது அதற்கு மேற்பட்டவற்றைத் தேர்வுசெய்க',
    otherCategory: 'மற்ற பிரிவை குறிப்பிடவும்',
    
    // Sub-Category Selector
    selectSubCategories: 'துணை-பிரிவுகளைத் தேர்ந்தெடுக்கவும்',
    chooseSpecificAreas: 'குறிப்பிட்ட பகுதிகளைத் தேர்வுசெய்க',
    pleaseSpecify: 'குறிப்பிடவும்',
    
    // Suggestion Form
    shareYourSuggestion: 'உங்கள் யோசனையை பகிர்ந்து கொள்ளுங்கள்',
    detailedSuggestion: 'விரிவான பரிந்துரை',
    additionalNotes: 'கூடுதல் குறிப்புகள் (விருப்பமானது)',
    minCharacters: 'குறைந்தபட்சம் 50 எழுத்துக்கள்',
    securityNote: 'தயவுசெய்து மரியாதையான மொழியைப் பயன்படுத்தவும். தகவல்கள் பாதுகாப்பாக வைக்கப்படும்.',
    suggestionPlaceholder: 'உங்கள் யோசனை அல்லது பரிந்துரையை இங்கே எழுதுங்கள்...',
    
    // Grievance Form
    describeGrievance: 'உங்கள் குறையை விவரிக்கவும்',
    detailedGrievance: 'விரிவான குறை',
    grievancePlaceholder: 'உங்கள் பகுதியில் உள்ள பிரச்சனையை விரிவாக எழுதுங்கள்...',
    
    // Volunteer Popup
    wantToHelp: 'TVK-க்கு உதவ விரும்புகிறீர்களா?',
    joinVolunteer: 'தன்னார்வலராக இணையுங்கள்',
    phone: 'தொலைபேசி எண்',
    interests: 'ஆர்வங்கள்',
    availability: 'கிடைக்கும் நேரம்',
    onlinePromotion: 'ஆன்லைன் ஊக்குவிப்பு',
    boothWork: 'வாக்குச்சாவடி பணி',
    eventHelp: 'நிகழ்வு உதவி',
    dataWork: 'தரவு பணி',
    weekends: 'வார இறுதிகள்',
    weekdays: 'வார நாட்கள்',
    anytime: 'எப்போது வேண்டுமானாலும்',
    skipForNow: 'இப்போது தவிர்க்கவும்',
    
    // Thank You
    thankYou: 'நன்றி!',
    submissionReceived: 'உங்கள் சமர்ப்பிப்பு பெறப்பட்டது',
    goHome: 'முகப்புக்கு செல்ல',
    
    // Common
    yourInfoSecure: 'உங்கள் தகவல்கள் பாதுகாப்பாக வைக்கப்படும்',
    submitting: 'சமர்ப்பிக்கிறது...',
    error: 'பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.',
    success: 'வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது!',
    
    // Language
    selectLanguage: 'மொழியைத் தேர்ந்தெடுக்கவும்',
    continueInTamil: 'தமிழில் தொடரவும்',
    continueInEnglish: 'ஆங்கிலத்தில் தொடரவும்',
  },
  en: {
    // Basic Info Form
    tellAboutYourself: 'Tell us about yourself',
    name: 'Name',
    age: 'Age',
    city: 'City',
    constituency: 'Constituency',
    area: 'Area',
    pollingBooth: 'Polling Booth',
    pincode: 'Pincode',
    occupation: 'Occupation',
    next: 'Next',
    back: 'Back',
    submit: 'Submit',
    enterName: 'Enter your name',
    enterAge: 'Enter your age',
    selectCity: 'Select city',
    selectConstituency: 'Select constituency',
    selectArea: 'Select area',
    selectBooth: 'Select polling booth',
    enterPincode: 'Enter 6-digit pincode',
    selectOccupation: 'Select occupation',
    
    // Category Selector
    selectCategories: 'Select priority categories',
    selectOneOrMore: 'Select one or more',
    otherCategory: 'Specify other category',
    
    // Sub-Category Selector
    selectSubCategories: 'Select sub-categories',
    chooseSpecificAreas: 'Choose specific areas',
    pleaseSpecify: 'Please specify',
    
    // Suggestion Form
    shareYourSuggestion: 'Share your suggestion',
    detailedSuggestion: 'Detailed Suggestion',
    additionalNotes: 'Additional Notes (Optional)',
    minCharacters: 'Minimum 50 characters',
    securityNote: 'Please use respectful language. Your information will be kept secure.',
    suggestionPlaceholder: 'Write your idea or suggestion here...',
    
    // Grievance Form
    describeGrievance: 'Describe your grievance',
    detailedGrievance: 'Detailed Grievance',
    grievancePlaceholder: 'Describe the problem in your area in detail...',
    
    // Volunteer Popup
    wantToHelp: 'Want to help TVK?',
    joinVolunteer: 'Join as Volunteer',
    phone: 'Phone Number',
    interests: 'Interests',
    availability: 'Availability',
    onlinePromotion: 'Online Promotion',
    boothWork: 'Booth Work',
    eventHelp: 'Event Help',
    dataWork: 'Data Work',
    weekends: 'Weekends',
    weekdays: 'Weekdays',
    anytime: 'Anytime',
    skipForNow: 'Skip for now',
    
    // Thank You
    thankYou: 'Thank You!',
    submissionReceived: 'Your submission has been received',
    goHome: 'Go to Home',
    
    // Common
    yourInfoSecure: 'Your information will be kept secure',
    submitting: 'Submitting...',
    error: 'Error occurred. Please try again.',
    success: 'Successfully submitted!',
    
    // Language
    selectLanguage: 'Select Language',
    continueInTamil: 'Continue in Tamil',
    continueInEnglish: 'Continue in English',
  },
};

export const useTranslation = (language: Language) => {
  return translations[language];
};

export default LanguageSelector;
