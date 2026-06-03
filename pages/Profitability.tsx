import React from 'react';
import ProfitabilityOliviaSeasonView from '../components/ProfitabilityOliviaSeasonView';
import { Language, Parcel } from '../types';

interface ProfitabilityPageProps {
  language: Language;
  parcels: Parcel[];
}

const ProfitabilityPage: React.FC<ProfitabilityPageProps> = ({ language, parcels }) => {
  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <ProfitabilityOliviaSeasonView language={language} parcels={parcels} />
    </div>
  );
};

export default ProfitabilityPage;
