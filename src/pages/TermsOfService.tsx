import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TVKLogo from '@/components/TVKLogo';

const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-tvk-maroon text-primary-foreground py-4 sticky top-0 z-50">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <Link to="/">
            <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Home
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <TVKLogo size="sm" />
            <span className="font-bold">TVK</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <FileText className="w-8 h-8 text-tvk-maroon" />
          <div>
            <h1 className="text-3xl font-bold">சேவை விதிமுறைகள்</h1>
            <p className="text-muted-foreground">Terms of Service</p>
          </div>
        </div>

        <div className="prose prose-lg max-w-none space-y-8">
          {/* Tamil Version */}
          <section className="bg-muted/30 p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-tvk-maroon mb-4">தமிழ் பதிப்பு</h2>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">1. ஏற்றுக்கொள்ளுதல்</h3>
            <p>
              இந்த இணையதளத்தைப் பயன்படுத்துவதன் மூலம், நீங்கள் இந்த விதிமுறைகளை ஏற்றுக்கொள்கிறீர்கள். 
              ஏற்றுக்கொள்ளவில்லை என்றால், தயவுசெய்து இந்த இணையதளத்தைப் பயன்படுத்த வேண்டாம்.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">2. சேவையின் நோக்கம்</h3>
            <p>
              இந்த தளம் தமிழக மக்களின் குரலைக் கேட்டு, அவர்களின் யோசனைகள் மற்றும் குறைகளை 
              தமிழக வெற்றி கழகத்திற்கு தெரிவிக்க உதவுகிறது.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">3. பயனர் நடத்தை</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>உண்மையான தகவல்களை மட்டுமே வழங்க வேண்டும்</li>
              <li>மரியாதையான மொழியைப் பயன்படுத்த வேண்டும்</li>
              <li>வெறுப்பூட்டும் அல்லது அவதூறான உள்ளடக்கம் தடைசெய்யப்படுகிறது</li>
              <li>ஒரே நபர் பல சமர்ப்பிப்புகளை செய்யக்கூடாது</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">4. உள்ளடக்க உரிமைகள்</h3>
            <p>
              நீங்கள் சமர்ப்பிக்கும் யோசனைகள் மற்றும் குறைகள் TVK-யின் கொள்கை உருவாக்கத்திற்கு 
              பயன்படுத்தப்படலாம். உங்கள் தனிப்பட்ட அடையாளம் பகிரப்படாது.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">5. பொறுப்புத்துறப்பு</h3>
            <p>
              இந்த சேவை "உள்ளபடியே" வழங்கப்படுகிறது. தொழில்நுட்ப சிக்கல்கள் அல்லது சேவை 
              இடையூறுகளுக்கு நாங்கள் பொறுப்பேற்க மாட்டோம்.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">6. மாற்றங்கள்</h3>
            <p>
              இந்த விதிமுறைகளை எந்த நேரத்திலும் மாற்றும் உரிமையை TVK கொண்டுள்ளது. 
              மாற்றங்கள் இந்த பக்கத்தில் வெளியிடப்படும்.
            </p>
          </section>

          {/* English Version */}
          <section className="bg-muted/30 p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-tvk-maroon mb-4">English Version</h2>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">1. Acceptance</h3>
            <p>
              By using this website, you agree to these terms. If you do not agree, 
              please do not use this website.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">2. Purpose of Service</h3>
            <p>
              This platform helps Tamil Nadu citizens voice their suggestions and grievances 
              to Tamilaga Vettri Kazhagam (TVK).
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">3. User Conduct</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide only truthful information</li>
              <li>Use respectful language</li>
              <li>Hate speech or defamatory content is prohibited</li>
              <li>Multiple submissions by the same person are not allowed</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">4. Content Rights</h3>
            <p>
              The suggestions and grievances you submit may be used for TVK's policy formulation. 
              Your personal identity will not be shared.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">5. Disclaimer</h3>
            <p>
              This service is provided "as is". We are not responsible for technical issues 
              or service interruptions.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">6. Changes</h3>
            <p>
              TVK reserves the right to modify these terms at any time. 
              Changes will be posted on this page.
            </p>
          </section>

          <p className="text-sm text-muted-foreground text-center pt-4">
            Last updated: January 2026 | கடைசியாக புதுப்பிக்கப்பட்டது: ஜனவரி 2026
          </p>
        </div>
      </main>
    </div>
  );
};

export default TermsOfService;
