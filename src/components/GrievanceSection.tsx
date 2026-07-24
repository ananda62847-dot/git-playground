import React from 'react';
import { Button } from './ui/button';
import { AlertTriangle, ArrowRight } from 'lucide-react';

interface GrievanceSectionProps {
  onStart: () => void;
}

const GrievanceSection: React.FC<GrievanceSectionProps> = ({ onStart }) => {
  return (
    <section id="grievances" className="py-20 bg-gradient-to-b from-red-50 to-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-6">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            குறைகளை தெரிவிக்கவும்
          </h2>
          <p className="text-xl text-muted-foreground mb-2">Report Your Grievances</p>
          
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            உங்கள் பகுதியில் உள்ள பிரச்சனைகளை எங்களிடம் தெரிவிக்கவும். 
            உங்கள் குறைகள் நேரடியாக TVK தலைமைக்கு செல்லும்.
            <br />
            <span className="text-sm">
              Report problems in your area. Your grievances will reach TVK leadership directly.
            </span>
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <div className="p-6 rounded-xl bg-card border border-border">
              <div className="text-3xl mb-3">🏗️</div>
              <h3 className="font-bold text-foreground mb-1">உட்கட்டமைப்பு</h3>
              <p className="text-sm text-muted-foreground">Infrastructure Issues</p>
            </div>
            <div className="p-6 rounded-xl bg-card border border-border">
              <div className="text-3xl mb-3">💧</div>
              <h3 className="font-bold text-foreground mb-1">குடிநீர் பிரச்சனை</h3>
              <p className="text-sm text-muted-foreground">Water Problems</p>
            </div>
            <div className="p-6 rounded-xl bg-card border border-border">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="font-bold text-foreground mb-1">மின்சாரம்</h3>
              <p className="text-sm text-muted-foreground">Electricity Issues</p>
            </div>
          </div>

          <Button variant="hero" size="xl" onClick={onStart} className="group">
            குறை தெரிவிக்க / Report Grievance
            <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default GrievanceSection;
