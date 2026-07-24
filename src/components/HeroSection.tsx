import React from 'react';
import { Button } from './ui/button';
import TVKLogo from './TVKLogo';
import { ArrowRight, Users, Lightbulb, MapPin } from 'lucide-react';
import vijayHeroImage from '@/assets/vijay-hero.webp';

interface HeroSectionProps {
  onStart: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onStart }) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden tvk-gradient-bg">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-tvk-yellow blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full bg-tvk-yellow blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 pt-24 relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left order-2 lg:order-1">
            {/* Logo */}
            <div className="flex justify-center lg:justify-start mb-4 animate-float">
              <TVKLogo size="lg" />
            </div>

            {/* Party Name */}
            <h2 className="text-lg md:text-xl font-tamil text-tvk-yellow mb-1 animate-fade-in">
              தமிழக வெற்றி கழகம்
            </h2>
            <h1 className="text-base md:text-lg text-primary-foreground/90 mb-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Tamilaga Vettri Kazhagam
            </h1>

            {/* Tagline */}
            <div className="bg-tvk-yellow/20 backdrop-blur-sm rounded-full px-4 py-2 inline-block mb-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <p className="text-tvk-yellow font-tamil text-base md:text-lg font-semibold">
                "பிறப்பொக்கும் எல்லா உயிர்க்கும்"
              </p>
              <p className="text-primary-foreground/80 text-xs mt-0.5">
                All are equal by birth
              </p>
            </div>

            {/* Main Heading */}
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4 leading-tight animate-slide-up">
              Shape the Future of{' '}
              <span className="text-tvk-yellow">Tamil Nadu</span>
            </h2>
            <p className="font-tamil text-lg md:text-2xl lg:text-3xl text-primary-foreground/90 mb-4">
              தமிழ்நாட்டின் எதிர்காலத்தை வடிவமைப்போம்
            </p>

            {/* Description */}
            <p className="text-sm md:text-base text-primary-foreground/80 mb-6 max-w-xl mx-auto lg:mx-0 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              உங்கள் கருத்துக்கள் முக்கியம். தேர்தல் அறிக்கையை உருவாக்க உதவுங்கள்.
              <br className="hidden md:block" />
              <span className="text-sm">Your voice matters. Help shape the election manifesto.</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start animate-slide-up" style={{ animationDelay: '0.5s' }}>
              <Button variant="hero" size="lg" onClick={onStart} className="group w-full sm:w-auto">
                தொடங்கு / Start Now
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="heroOutline" size="lg" className="w-full sm:w-auto">
                மேலும் அறிய
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 md:gap-4 mt-8 max-w-lg mx-auto lg:mx-0 animate-fade-in" style={{ animationDelay: '0.6s' }}>
              <div className="text-center p-2 md:p-4 rounded-xl bg-primary-foreground/10 backdrop-blur-sm">
                <Users className="w-5 h-5 md:w-8 md:h-8 text-tvk-yellow mx-auto mb-1" />
                <p className="text-lg md:text-2xl font-bold text-primary-foreground">10K+</p>
                <p className="text-xs md:text-sm text-primary-foreground/70">பங்களிப்பாளர்கள்</p>
              </div>
              <div className="text-center p-2 md:p-4 rounded-xl bg-primary-foreground/10 backdrop-blur-sm">
                <Lightbulb className="w-5 h-5 md:w-8 md:h-8 text-tvk-yellow mx-auto mb-1" />
                <p className="text-lg md:text-2xl font-bold text-primary-foreground">25K+</p>
                <p className="text-xs md:text-sm text-primary-foreground/70">யோசனைகள்</p>
              </div>
              <div className="text-center p-2 md:p-4 rounded-xl bg-primary-foreground/10 backdrop-blur-sm">
                <MapPin className="w-5 h-5 md:w-8 md:h-8 text-tvk-yellow mx-auto mb-1" />
                <p className="text-lg md:text-2xl font-bold text-primary-foreground">38</p>
                <p className="text-xs md:text-sm text-primary-foreground/70">மாவட்டங்கள்</p>
              </div>
            </div>
          </div>

          {/* Right Content - Vijay Image */}
          <div className="order-1 lg:order-2 flex justify-center lg:justify-end animate-fade-in">
            <div className="relative">
              <img 
                src={vijayHeroImage} 
                alt="TVK Leader" 
                className="w-48 h-auto md:w-72 lg:w-96 object-contain drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Wave Divider */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" className="w-full">
          <path
            d="M0 120L48 110C96 100 192 80 288 70C384 60 480 60 576 65C672 70 768 80 864 85C960 90 1056 90 1152 85C1248 80 1344 70 1392 65L1440 60V120H1392C1344 120 1248 120 1152 120C1056 120 960 120 864 120C768 120 672 120 576 120C480 120 384 120 288 120C192 120 96 120 48 120H0Z"
            fill="hsl(var(--background))"
          />
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;
