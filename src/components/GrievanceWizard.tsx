import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import FormStep from './FormStep';
import TVKLogo from './TVKLogo';
import LanguageSelector, { Language, useTranslation, translations } from './LanguageSelector';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowLeft, ArrowRight, Send, User, MapPin, Briefcase, Calendar, Building, AlertTriangle, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getConstituenciesForCity } from '@/lib/constituencies';
import { getDefaultAreasForConstituency } from '@/lib/areas';
import { categories } from './CategorySelector';
import VolunteerPopup from './VolunteerPopup';

interface GrievanceWizardProps {
  onClose: () => void;
}

const tamilNaduCities = [
  'Chennai / சென்னை', 'Coimbatore / கோயம்புத்தூர்', 'Madurai / மதுரை',
  'Tiruchirappalli / திருச்சிராப்பள்ளி', 'Salem / சேலம்', 'Tirunelveli / திருநெல்வேலி',
  'Tiruppur / திருப்பூர்', 'Erode / ஈரோடு', 'Vellore / வேலூர்',
  'Thoothukudi / தூத்துக்குடி', 'Dindigul / திண்டுக்கல்', 'Thanjavur / தஞ்சாவூர்',
  'Nagercoil / நாகர்கோவில்', 'Kanchipuram / காஞ்சிபுரம்', 'Cuddalore / கடலூர்',
  'Karur / கரூர்', 'Krishnagiri / கிருஷ்ணகிரி', 'Dharmapuri / தர்மபுரி',
  'Namakkal / நாமக்கல்', 'Ariyalur / அரியலூர்', 'Other / மற்றவை',
];

const occupations = [
  'Student / மாணவர்', 'Farmer / விவசாயி', 'Business Owner / தொழிலதிபர்',
  'Government Employee / அரசு ஊழியர்', 'Private Employee / தனியார் ஊழியர்',
  'Doctor / மருத்துவர்', 'Teacher / ஆசிரியர்', 'Engineer / பொறியாளர்',
  'Lawyer / வழக்கறிஞர்', 'Homemaker / இல்லத்தரசி', 'Daily Wage Worker / கூலி தொழிலாளி',
  'Self Employed / சுயதொழில்', 'Retired / ஓய்வு பெற்றவர்', 'Other / மற்றவை',
];

const GrievanceWizard: React.FC<GrievanceWizardProps> = ({ onClose }) => {
  const [language, setLanguage] = useState<Language | null>(null);
  const t = language ? useTranslation(language) : null;
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVolunteerPopup, setShowVolunteerPopup] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [areas, setAreas] = useState<{ area_name: string; polling_booths: string[] }[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    city: '',
    constituency: '',
    area: '',
    pollingBooth: '',
    pincode: '',
    occupation: '',
    categories: [] as string[],
    subCategories: [] as string[],
    grievance: '',
  });

  const constituencies = formData.city ? getConstituenciesForCity(formData.city) : [];

  useEffect(() => {
    if (formData.constituency) {
      fetchAreas();
    }
  }, [formData.constituency]);

  const fetchAreas = async () => {
    const { data } = await supabase
      .from('areas')
      .select('area_name, polling_booths')
      .eq('city', formData.city)
      .eq('constituency', formData.constituency);
    
    if (data && data.length > 0) {
      setAreas(data);
    } else {
      const defaultAreas = getDefaultAreasForConstituency(formData.constituency);
      setAreas(defaultAreas);
    }
  };

  const selectedPollingBooths = areas.find(a => a.area_name === formData.area)?.polling_booths || [];

  const updateField = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'city') {
      setFormData(prev => ({ ...prev, constituency: '', area: '', pollingBooth: '' }));
    }
    if (field === 'constituency') {
      setFormData(prev => ({ ...prev, area: '', pollingBooth: '' }));
    }
    if (field === 'area') {
      setFormData(prev => ({ ...prev, pollingBooth: '' }));
    }
  };

  const toggleCategory = (catId: string) => {
    const current = formData.categories;
    if (current.includes(catId)) {
      updateField('categories', current.filter(c => c !== catId));
    } else {
      updateField('categories', [...current, catId]);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      let sentiment = 'neutral';
      let sentimentScore = 0.5;

      try {
        const { data: sentimentData } = await supabase.functions.invoke('analyze-sentiment', {
          body: { text: formData.grievance, type: 'grievance' },
        });
        if (sentimentData) {
          sentiment = sentimentData.sentiment || 'neutral';
          sentimentScore = sentimentData.score || 0.5;
        }
      } catch {
        // ignore
      }

      const newId = crypto.randomUUID();

      const insertData = {
        id: newId,
        name: formData.name.trim(),
        age: Number(formData.age),
        city: formData.city,
        constituency: formData.constituency || null,
        area: formData.area || null,
        polling_booth: formData.pollingBooth || null,
        pincode: formData.pincode,
        occupation: formData.occupation,
        categories: formData.categories.length > 0 ? formData.categories : ['other'],
        sub_categories: formData.subCategories.length > 0 ? formData.subCategories : ['general-other'],
        grievance: formData.grievance.trim(),
        sentiment,
        sentiment_score: sentimentScore,
        status: 'received',
      };

      console.log('Submitting grievance:', insertData);

      const { error } = await supabase.from('grievances').insert(insertData);

      if (error) {
        console.error('Supabase insert error:', error);
        toast.error(`${t?.error || 'Error'}: ${error.message || error.code || 'Unknown error'}`);
        return;
      }

      toast.success(t?.success || 'Successfully submitted!');
      setSubmissionId(newId);
      setShowVolunteerPopup(true);
    } catch (err) {
      console.error(err);
      toast.error(t?.error || 'Error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStep1Valid = formData.name && formData.age && formData.city && formData.pincode && formData.occupation;
  const isStep2Valid = formData.categories.length > 0;
  const isStep3Valid = formData.grievance.length >= 50;

  // Language selection screen
  if (!language) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl shadow-xl border border-border p-8 max-w-md w-full text-center"
        >
          <TVKLogo size="lg" className="mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-foreground mb-2">மொழியைத் தேர்ந்தெடுக்கவும்</h2>
          <p className="text-muted-foreground mb-8">Select Language</p>
          
          <div className="space-y-4">
            <Button variant="outline" size="lg" className="w-full py-6 text-lg border-2 hover:border-tvk-maroon hover:bg-tvk-maroon/5" onClick={() => setLanguage('ta')}>
              🇮🇳 தமிழில் தொடரவும்
            </Button>
            <Button variant="outline" size="lg" className="w-full py-6 text-lg border-2 hover:border-tvk-maroon hover:bg-tvk-maroon/5" onClick={() => setLanguage('en')}>
              🇬🇧 Continue in English
            </Button>
          </div>
          
          <Button variant="ghost" onClick={onClose} className="mt-6 text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </motion.div>
      </div>
    );
  }

  if (showVolunteerPopup) {
    return (
      <VolunteerPopup
        submissionId={submissionId!}
        submissionType="grievance"
        userData={{ name: formData.name, city: formData.city, constituency: formData.constituency, area: formData.area, pollingBooth: formData.pollingBooth }}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background py-4 md:py-8 px-3 md:px-4 overflow-x-hidden">
      <div className="container mx-auto max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={onClose} className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> {t?.back}
          </Button>
          <div className="flex items-center gap-4">
            <LanguageSelector language={language} onChange={setLanguage} />
            <div className="flex items-center gap-2">
              <TVKLogo size="sm" />
              <span className="font-bold text-primary">{language === 'ta' ? 'குறை' : 'Grievance'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className={`w-10 h-2 rounded-full transition-all ${s <= step ? 'bg-tvk-maroon' : 'bg-muted'}`} />
          ))}
        </div>

        <div className="bg-card rounded-xl shadow-lg border border-border p-4 md:p-6">
          <AnimatePresence mode="wait">
            <FormStep isActive={step === 1}>
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">{t?.tellAboutYourself}</h2>
                </div>
                <div className="grid gap-4">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-2"><User className="w-4 h-4" />{t?.name}</Label>
                    <Input value={formData.name} onChange={e => updateField('name', e.target.value)} placeholder={t?.enterName} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-2"><Calendar className="w-4 h-4" />{t?.age}</Label>
                    <Input type="number" value={formData.age} onChange={e => updateField('age', e.target.value)} placeholder={t?.enterAge} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-2"><MapPin className="w-4 h-4" />{t?.city}</Label>
                    <Select value={formData.city} onValueChange={v => updateField('city', v)}>
                      <SelectTrigger><SelectValue placeholder={t?.selectCity} /></SelectTrigger>
                      <SelectContent>{tamilNaduCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {constituencies.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-2"><Building className="w-4 h-4" />{t?.constituency}</Label>
                      <Select value={formData.constituency} onValueChange={v => updateField('constituency', v)}>
                        <SelectTrigger><SelectValue placeholder={t?.selectConstituency} /></SelectTrigger>
                        <SelectContent>{constituencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  {areas.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-2"><MapPin className="w-4 h-4" />{t?.area}</Label>
                      <Select value={formData.area} onValueChange={v => updateField('area', v)}>
                        <SelectTrigger><SelectValue placeholder={t?.selectArea} /></SelectTrigger>
                        <SelectContent>{areas.map(a => <SelectItem key={a.area_name} value={a.area_name}>{a.area_name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  {selectedPollingBooths.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-2"><Building className="w-4 h-4" />{t?.pollingBooth}</Label>
                      <Select value={formData.pollingBooth} onValueChange={v => updateField('pollingBooth', v)}>
                        <SelectTrigger><SelectValue placeholder={t?.selectBooth} /></SelectTrigger>
                        <SelectContent>{selectedPollingBooths.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-2"><MapPin className="w-4 h-4" />{t?.pincode}</Label>
                    <Input value={formData.pincode} onChange={e => updateField('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder={t?.enterPincode} maxLength={6} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-2"><Briefcase className="w-4 h-4" />{t?.occupation}</Label>
                    <Select value={formData.occupation} onValueChange={v => updateField('occupation', v)}>
                      <SelectTrigger><SelectValue placeholder={t?.selectOccupation} /></SelectTrigger>
                      <SelectContent>{occupations.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <Button variant="hero" className="w-full" onClick={() => setStep(2)} disabled={!isStep1Valid}>{t?.next} <ArrowRight className="ml-2 w-4 h-4" /></Button>
              </div>
            </FormStep>

            <FormStep isActive={step === 2}>
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">{t?.selectCategories}</h2>
                  <p className="text-muted-foreground">{t?.selectOneOrMore}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {categories.map(cat => {
                    const Icon = cat.icon;
                    const isSelected = formData.categories.includes(cat.id);
                    return (
                      <button key={cat.id} onClick={() => toggleCategory(cat.id)} className={`p-4 rounded-xl border-2 text-left transition-all ${isSelected ? 'border-tvk-maroon bg-tvk-maroon/5' : 'border-border hover:border-tvk-yellow/50'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${isSelected ? 'bg-tvk-maroon text-white' : 'bg-muted'}`}><Icon className="w-5 h-5" /></div>
                          <div>
                            <p className="font-semibold text-sm">{language === 'ta' ? cat.tamilName : cat.name}</p>
                            <p className="text-xs text-muted-foreground">{language === 'ta' ? cat.name : cat.tamilName}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(1)}><ArrowLeft className="mr-2 w-4 h-4" /> {t?.back}</Button>
                  <Button variant="hero" className="flex-1" onClick={() => setStep(3)} disabled={!isStep2Valid}>{t?.next} <ArrowRight className="ml-2 w-4 h-4" /></Button>
                </div>
              </div>
            </FormStep>

            <FormStep isActive={step === 3}>
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">{t?.describeGrievance}</h2>
                </div>
                <div className="space-y-4">
                  <Label className="flex items-center gap-2"><FileText className="w-4 h-4" />{t?.detailedGrievance}</Label>
                  <Textarea value={formData.grievance} onChange={e => updateField('grievance', e.target.value)} placeholder={t?.grievancePlaceholder} className="min-h-[200px]" maxLength={2000} />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{formData.grievance.length < 50 ? `${t?.minCharacters} (${50 - formData.grievance.length} more)` : '✓ Valid'}</span>
                    <span>{formData.grievance.length} / 2000</span>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <p className="text-sm text-muted-foreground flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 text-tvk-maroon" />{t?.yourInfoSecure}</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(2)} disabled={isSubmitting}><ArrowLeft className="mr-2 w-4 h-4" /> {t?.back}</Button>
                  <Button variant="hero" className="flex-1" onClick={handleSubmit} disabled={!isStep3Valid || isSubmitting}>
                    {isSubmitting ? <><span className="animate-spin mr-2">⏳</span>{t?.submitting}</> : <><Send className="mr-2 w-4 h-4" /> {t?.submit}</>}
                  </Button>
                </div>
              </div>
            </FormStep>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default GrievanceWizard;
