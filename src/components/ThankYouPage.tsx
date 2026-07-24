import React from 'react';
import { Button } from './ui/button';
import TVKLogo from './TVKLogo';
import { CheckCircle, Home, Share2, Twitter, Facebook, MessageCircle } from 'lucide-react';
import { categories } from './CategorySelector';

interface FormData {
  basicInfo: {
    name: string;
    age: string;
    city: string;
    pincode: string;
    occupation: string;
  };
  categories: string[];
  subCategories: string[];
  suggestion: string;
}

interface ThankYouPageProps {
  formData: FormData;
  onReset: () => void;
}

const ThankYouPage: React.FC<ThankYouPageProps> = ({ formData, onReset }) => {
  const selectedCategoryNames = formData.categories
    .map((catId) => categories.find((c) => c.id === catId)?.tamilName)
    .filter(Boolean);

  const shareText = `நான் TVK - தமிழக வெற்றி கழகம் தேர்தல் கருத்துக்கணிப்பில் பங்கேற்றேன்! உங்கள் கருத்துக்களையும் பகிருங்கள். #TVK #TamilNadu`;

  const handleShare = (platform: string) => {
    const url = window.location.href;
    let shareUrl = '';

    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + url)}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-tvk-cream to-background py-12 px-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8 animate-slide-up">
          {/* Success Icon */}
          <div className="relative inline-block mb-6">
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-14 h-14 text-green-600" />
            </div>
            <div className="absolute -bottom-2 -right-2">
              <TVKLogo size="sm" />
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            நன்றி! / Thank You!
          </h1>
          <p className="text-lg text-muted-foreground">
            உங்கள் பங்களிப்புக்கு நன்றி
          </p>
          <p className="text-muted-foreground">
            Your contribution has been recorded successfully
          </p>
        </div>

        {/* Summary Card */}
        <div className="bg-card rounded-2xl shadow-lg border border-border p-6 mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <span className="text-2xl">📋</span>
            சுருக்கம் / Summary
          </h2>

          <div className="space-y-4">
            <div className="flex justify-between items-start py-2 border-b border-border">
              <span className="text-muted-foreground">பெயர் / Name</span>
              <span className="font-medium text-foreground">{formData.basicInfo.name}</span>
            </div>
            <div className="flex justify-between items-start py-2 border-b border-border">
              <span className="text-muted-foreground">நகரம் / City</span>
              <span className="font-medium text-foreground">{formData.basicInfo.city}</span>
            </div>
            <div className="flex justify-between items-start py-2 border-b border-border">
              <span className="text-muted-foreground">பிரிவுகள் / Categories</span>
              <span className="font-medium text-foreground text-right">
                {selectedCategoryNames.join(', ')}
              </span>
            </div>
            <div className="py-2">
              <span className="text-muted-foreground block mb-2">யோசனை / Suggestion</span>
              <p className="text-foreground bg-muted/50 p-3 rounded-lg text-sm">
                {formData.suggestion.length > 200
                  ? formData.suggestion.substring(0, 200) + '...'
                  : formData.suggestion}
              </p>
            </div>
          </div>
        </div>

        {/* Share Section */}
        <div className="bg-tvk-maroon/5 rounded-2xl p-6 mb-8 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-tvk-maroon" />
            நண்பர்களுடன் பகிருங்கள் / Share with friends
          </h3>
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleShare('twitter')}
              className="flex-1 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600"
            >
              <Twitter className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleShare('facebook')}
              className="flex-1 hover:bg-blue-50 hover:border-blue-600 hover:text-blue-700"
            >
              <Facebook className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleShare('whatsapp')}
              className="flex-1 hover:bg-green-50 hover:border-green-500 hover:text-green-600"
            >
              <MessageCircle className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <Button variant="hero" size="xl" onClick={onReset} className="group">
            <Home className="mr-2" />
            முகப்புக்குத் திரும்பு / Back to Home
          </Button>
        </div>

        {/* TVK Tagline */}
        <div className="text-center mt-8 animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <p className="text-tvk-maroon font-tamil font-semibold text-lg">
            "பிறப்பொக்கும் எல்லா உயிர்க்கும்"
          </p>
          <p className="text-muted-foreground text-sm">All are equal by birth</p>
        </div>
      </div>
    </div>
  );
};

export default ThankYouPage;
