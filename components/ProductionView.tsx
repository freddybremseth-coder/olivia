import React from 'react';
import type { Language, Parcel } from '../types';
import ProductionOliviaView from './ProductionOliviaView';

interface ProductionViewProps {
  language: Language;
  parcels: Parcel[];
  initialHarvestPlanId?: string | null;
  onHarvestPlanConsumed?: () => void;
  initialBatchId?: string | null;
  onBatchContextConsumed?: () => void;
}

const ProductionView: React.FC<ProductionViewProps> = ({ language, parcels, initialHarvestPlanId, onHarvestPlanConsumed, initialBatchId, onBatchContextConsumed }) => {
  return <ProductionOliviaView
    language={language}
    parcels={parcels}
    initialHarvestPlanId={initialHarvestPlanId}
    onHarvestPlanConsumed={onHarvestPlanConsumed}
    initialBatchId={initialBatchId}
    onBatchContextConsumed={onBatchContextConsumed}
  />;
};

export default ProductionView;
