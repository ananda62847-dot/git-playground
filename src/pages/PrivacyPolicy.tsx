import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TVKLogo from '@/components/TVKLogo';

const PrivacyPolicy: React.FC = () => {
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
          <Shield className="w-8 h-8 text-tvk-maroon" />
          <div>
            <h1 className="text-3xl font-bold">தனியுரிமைக் கொள்கை</h1>
            <p className="text-muted-foreground">Privacy Policy</p>
          </div>
        </div>

        <div className="prose prose-lg max-w-none space-y-8">
          {/* Tamil Version */}
          <section className="bg-muted/30 p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-tvk-maroon mb-4">தமிழ் பதிப்பு</h2>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">1. அறிமுகம்</h3>
            <p>
              தமிழக வெற்றி கழகம் (TVK) உங்கள் தனியுரிமையை மதிக்கிறது. இந்த கொள்கை நாங்கள் சேகரிக்கும் தகவல்கள், 
              அவற்றை எவ்வாறு பயன்படுத்துகிறோம், பாதுகாக்கிறோம் என்பதை விளக்குகிறது.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">2. சேகரிக்கப்படும் தகவல்கள்</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>பெயர், வயது, தொழில்</li>
              <li>நகரம், தொகுதி, பகுதி, வாக்குச்சாவடி</li>
              <li>அஞ்சல் குறியீடு</li>
              <li>யோசனைகள் மற்றும் குறைகள்</li>
              <li>தன்னார்வலர் தகவல்கள் (விருப்பமானது)</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">3. தகவல்களின் பயன்பாடு</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>மக்களின் குரலைக் கேட்டு, அவர்களின் தேவைகளை புரிந்துகொள்ள</li>
              <li>பகுதி அடிப்படையில் பிரச்சனைகளை பகுப்பாய்வு செய்ய</li>
              <li>கட்சியின் கொள்கைகளை வகுக்க</li>
              <li>தன்னார்வலர்களை ஒருங்கிணைக்க</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">4. தகவல் பாதுகாப்பு</h3>
            <p>
              உங்கள் தகவல்கள் மிகவும் பாதுகாப்பான சேவையகங்களில் சேமிக்கப்படுகின்றன. 
              அங்கீகரிக்கப்பட்ட நிர்வாகிகள் மட்டுமே அணுக முடியும்.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">5. மூன்றாம் தரப்பு பகிர்வு</h3>
            <p>
              உங்கள் தனிப்பட்ட தகவல்களை எந்த மூன்றாம் தரப்பினருக்கும் விற்கமாட்டோம் அல்லது பகிரமாட்டோம். 
              கூட்டு புள்ளிவிவரங்கள் மட்டுமே பொது நலனுக்காக பயன்படுத்தப்படலாம்.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">6. தொடர்பு கொள்ளுங்கள்</h3>
            <p>
              தனியுரிமை தொடர்பான கேள்விகளுக்கு: <strong>privacy@tvk.org</strong>
            </p>
          </section>

          {/* English Version */}
          <section className="bg-muted/30 p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-tvk-maroon mb-4">English Version</h2>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">1. Introduction</h3>
            <p>
              Tamilaga Vettri Kazhagam (TVK) respects your privacy. This policy explains what information 
              we collect, how we use it, and how we protect it.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">2. Information Collected</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Name, age, occupation</li>
              <li>City, constituency, area, polling booth</li>
              <li>Pincode</li>
              <li>Suggestions and grievances</li>
              <li>Volunteer information (optional)</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">3. Use of Information</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>To listen to people's voices and understand their needs</li>
              <li>To analyze issues on a regional basis</li>
              <li>To formulate party policies</li>
              <li>To coordinate volunteers</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">4. Data Security</h3>
            <p>
              Your information is stored on highly secure servers. Only authorized administrators can access it.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">5. Third-Party Sharing</h3>
            <p>
              We will not sell or share your personal information with any third party. 
              Only aggregate statistics may be used for public benefit.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">6. Contact Us</h3>
            <p>
              For privacy-related questions: <strong>privacy@tvk.org</strong>
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

export default PrivacyPolicy;
