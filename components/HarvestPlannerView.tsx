import React from 'react';
import HarvestPlannerSupabaseView from './HarvestPlannerSupabaseView';

const HarvestPlannerView: React.FC<{ onStartHarvest?: (planId: string) => void }> = ({ onStartHarvest }) => {
  return <HarvestPlannerSupabaseView onStartHarvest={onStartHarvest} />;
};

export default HarvestPlannerView;
