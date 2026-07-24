import React from 'react';
import FundAssistanceForm from '@/components/FundAssistanceForm';
import { HeartPulse } from 'lucide-react';

const FundAssistancePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <div className="text-center space-y-2 pt-2">
          <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold">
            <HeartPulse className="w-4 h-4" /> Fund Assistance Request
          </div>
          <h1 className="text-2xl font-bold">Request financial assistance</h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Submit a request for medical, education, or other assistance. The Super Admin office
            will review your request and reach out via phone.
          </p>
        </div>
        <FundAssistanceForm />
      </div>
    </div>
  );
};

export default FundAssistancePage;