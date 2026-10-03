import React from 'react';
import HarvestPlannerSupabaseView from './HarvestPlannerSupabaseView';

const HarvestPlannerView: React.FC<{
  onStartHarvest?: (planId: string) => void;
  initialParcelId?: string | null;
  initialPlanId?: string | null;
  onContextConsumed?: () => void;
}> = ({ onStartHarvest, initialParcelId, initialPlanId, onContextConsumed }) => {
  return <HarvestPlannerSupabaseView
    onStartHarvest={onStartHarvest}
    initialParcelId={initialParcelId}
    initialPlanId={initialPlanId}
    onContextConsumed={onContextConsumed}
  />;
};

export default HarvestPlannerView;
