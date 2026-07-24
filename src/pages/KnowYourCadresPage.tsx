import React from 'react';
import BackButton from '@/components/BackButton';
import KnowYourCadres from '@/components/landing/KnowYourCadres';

const KnowYourCadresPage: React.FC = () => (
  <div className="min-h-screen bg-background overflow-x-hidden">
    <main className="pt-16">
      <BackButton to="/" />
      <KnowYourCadres />
    </main>
  </div>
);

export default KnowYourCadresPage;