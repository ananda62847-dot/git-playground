import React from 'react';
import { Link } from 'react-router-dom';
import TVKLogo from './TVKLogo';
import { Mail, Phone, MapPin, FileText, Shield, HelpCircle, Map as MapIcon, AlertTriangle, Megaphone, Lightbulb } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-tvk-maroon text-primary-foreground">
      <div className="container mx-auto px-4 py-10 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
              <TVKLogo size="md" />
              <div>
                <h3 className="text-lg md:text-xl font-bold">Makkal Connect</h3>
                <p className="text-xs md:text-sm font-tamil text-tvk-yellow">TVK · மக்கள் கனெக்ட்</p>
              </div>
            </div>
            <p className="text-primary-foreground/80 text-xs md:text-sm">
              A grievance redressal & governance portal — built for the people of Coimbatore district.
            </p>
          </div>

          {/* Use links — 2-column on mobile so they aren't 1 per row */}
          <div className="text-left">
            <h4 className="font-bold mb-3 text-tvk-yellow text-sm text-center md:text-left">பயன்பாடு / Use</h4>
            <ul className="grid grid-cols-2 md:grid-cols-1 gap-x-3 gap-y-2 text-xs md:text-sm">
              <li><Link to="/" className="hover:text-tvk-yellow inline-flex items-center gap-1.5"><AlertTriangle className="w-3 h-3 flex-shrink-0" /><span className="truncate">Report</span></Link></li>
              <li><Link to="/track" className="hover:text-tvk-yellow inline-flex items-center gap-1.5"><HelpCircle className="w-3 h-3 flex-shrink-0" /><span className="truncate">Track</span></Link></li>
              <li><Link to="/map" className="hover:text-tvk-yellow inline-flex items-center gap-1.5"><MapIcon className="w-3 h-3 flex-shrink-0" /><span className="truncate">Live Map</span></Link></li>
              <li><Link to="/feed" className="hover:text-tvk-yellow inline-flex items-center gap-1.5"><Megaphone className="w-3 h-3 flex-shrink-0" /><span className="truncate">Updates</span></Link></li>
              <li><Link to="/completed-works" className="hover:text-tvk-yellow inline-flex items-center gap-1.5"><FileText className="w-3 h-3 flex-shrink-0" /><span className="truncate">Works</span></Link></li>
            </ul>
          </div>

          <div className="text-left">
            <h4 className="font-bold mb-3 text-tvk-yellow text-sm text-center md:text-left">சட்டம் / Legal</h4>
            <ul className="grid grid-cols-2 md:grid-cols-1 gap-x-3 gap-y-2 text-xs md:text-sm">
              <li><Link to="/privacy" className="hover:text-tvk-yellow inline-flex items-center gap-1.5"><Shield className="w-3 h-3 flex-shrink-0" /><span className="truncate">Privacy</span></Link></li>
              <li><Link to="/terms" className="hover:text-tvk-yellow inline-flex items-center gap-1.5"><FileText className="w-3 h-3 flex-shrink-0" /><span className="truncate">Terms</span></Link></li>
            </ul>
          </div>

          <div className="text-center md:text-left">
            <h4 className="font-bold mb-3 text-tvk-yellow text-sm">தொடர்பு / Contact</h4>
            <ul className="space-y-2 text-xs md:text-sm">
              <li className="flex items-center justify-center md:justify-start gap-2"><Mail className="w-4 h-4 text-tvk-yellow flex-shrink-0" /><span className="truncate">info@tvk.org</span></li>
              <li className="flex items-center justify-center md:justify-start gap-2"><Phone className="w-4 h-4 text-tvk-yellow flex-shrink-0" /><span className="truncate">+91 44 XXXX XXXX</span></li>
              <li className="flex items-start justify-center md:justify-start gap-2"><MapPin className="w-4 h-4 text-tvk-yellow mt-0.5 flex-shrink-0" /><span>Coimbatore, Tamil Nadu</span></li>
            </ul>
            <div className="mt-4 pt-4 border-t border-primary-foreground/20 text-center md:text-left space-y-1.5">
              <Link to="/cadre/login" className="block text-xs text-primary-foreground/70 hover:text-tvk-yellow">Cadre Login →</Link>
              <Link to="/admin" className="block text-xs text-primary-foreground/50 hover:text-tvk-yellow">Admin Portal →</Link>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-8 pt-6 text-center">
          <p className="text-primary-foreground/70 text-xs md:text-sm">
            © 2026 Makkal Connect · TVK Coimbatore Governance Portal
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
