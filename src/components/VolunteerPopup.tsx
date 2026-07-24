import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Heart, Users, Megaphone, Database, Calendar, X, CheckCircle } from 'lucide-react';
import TVKLogo from './TVKLogo';

interface VolunteerPopupProps {
  submissionId: string;
  submissionType: 'suggestion' | 'grievance';
  userData: {
    name: string;
    city: string;
    constituency: string;
    area?: string;
    pollingBooth?: string;
  };
  onClose: () => void;
}

const volunteerInterests = [
  { id: 'online-promotion', label: 'Online Promotion / ஆன்லைன் விளம்பரம்', icon: Megaphone },
  { id: 'booth-work', label: 'Booth Work / வாக்குச்சாவடி பணி', icon: Users },
  { id: 'event-help', label: 'Event Help / நிகழ்வு உதவி', icon: Calendar },
  { id: 'data-work', label: 'Data Work / தரவு பணி', icon: Database },
];

const availabilityOptions = [
  'Weekdays / வாரநாட்கள்',
  'Weekends / வார இறுதி',
  'Full Time / முழு நேரம்',
  'Flexible / நெகிழ்வான',
];

const VolunteerPopup: React.FC<VolunteerPopupProps> = ({
  submissionId,
  submissionType,
  userData,
  onClose,
}) => {
  const [step, setStep] = useState<'ask' | 'form' | 'success'>('ask');
  const [phone, setPhone] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [availability, setAvailability] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleInterest = (id: string) => {
    if (selectedInterests.includes(id)) {
      setSelectedInterests(selectedInterests.filter(i => i !== id));
    } else {
      setSelectedInterests([...selectedInterests, id]);
    }
  };

  const handleSubmitVolunteer = async () => {
    if (!phone || phone.length < 10 || selectedInterests.length === 0) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('volunteers').insert({
        name: userData.name,
        phone,
        city: userData.city,
        constituency: userData.constituency || null,
        area: userData.area || null,
        polling_booth: userData.pollingBooth || null,
        interests: selectedInterests,
        availability,
        submission_id: submissionId,
        submission_type: submissionType,
      });

      if (error) throw error;

      setStep('success');
      toast.success('Thank you for volunteering!');
    } catch (err) {
      toast.error('Failed to register. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">நன்றி!</h2>
            <p className="text-xl text-muted-foreground mb-4">Thank You!</p>
            <p className="text-muted-foreground mb-6">
              உங்கள் பதிவு மற்றும் தன்னார்வ பதிவு வெற்றிகரமாக முடிந்தது.
              <br />
              Your submission and volunteer registration are complete.
            </p>
            <Button variant="hero" onClick={onClose} className="w-full">
              முகப்புக்கு திரும்பு / Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'ask') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-tvk-yellow/20 flex items-center justify-center">
                <Heart className="w-10 h-10 text-tvk-maroon" />
              </div>
            </div>
            <CardTitle className="text-2xl">TVK-யை ஆதரிக்க விரும்புகிறீர்களா?</CardTitle>
            <CardDescription className="text-lg">
              Do you want to support TVK?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              தன்னார்வலராக இணைந்து தமிழ்நாட்டின் மாற்றத்தில் பங்கேற்கவும்!
              <br />
              <span className="text-sm">Join as a volunteer and be part of the change!</span>
            </p>

            <div className="flex flex-col gap-3">
              <Button variant="hero" size="lg" onClick={() => setStep('form')}>
                ஆம், ஆதரிக்க விரும்புகிறேன் / Yes, I want to support
              </Button>
              <Button variant="outline" size="lg" onClick={onClose}>
                பின்னர் / Maybe Later
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute right-4 top-4"
          >
            <X className="w-4 h-4" />
          </Button>
          <div className="flex justify-center mb-2">
            <TVKLogo size="md" />
          </div>
          <CardTitle className="text-center">தன்னார்வலராக இணையுங்கள்</CardTitle>
          <CardDescription className="text-center">Join as a Volunteer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Phone */}
          <div className="space-y-2">
            <Label>தொலைபேசி எண் / Phone Number *</Label>
            <Input
              type="tel"
              placeholder="+91 9876543210"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              maxLength={10}
            />
          </div>

          {/* Interests */}
          <div className="space-y-3">
            <Label>ஆர்வமுள்ள பணிகள் / Areas of Interest *</Label>
            <div className="grid grid-cols-1 gap-2">
              {volunteerInterests.map(interest => {
                const Icon = interest.icon;
                const isSelected = selectedInterests.includes(interest.id);
                return (
                  <div
                    key={interest.id}
                    onClick={() => toggleInterest(interest.id)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all flex items-center gap-3 ${
                      isSelected ? 'border-tvk-maroon bg-tvk-maroon/5' : 'border-border hover:border-tvk-yellow/50'
                    }`}
                  >
                    <Checkbox checked={isSelected} />
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-tvk-maroon' : 'text-muted-foreground'}`} />
                    <span className={isSelected ? 'font-medium' : ''}>{interest.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Availability */}
          <div className="space-y-2">
            <Label>கிடைக்கும் நேரம் / Availability</Label>
            <Select value={availability} onValueChange={setAvailability}>
              <SelectTrigger>
                <SelectValue placeholder="Select availability" />
              </SelectTrigger>
              <SelectContent>
                {availabilityOptions.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="hero"
            className="w-full"
            onClick={handleSubmitVolunteer}
            disabled={isSubmitting || phone.length < 10 || selectedInterests.length === 0}
          >
            {isSubmitting ? 'Submitting...' : 'பதிவு செய்யவும் / Register'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default VolunteerPopup;
