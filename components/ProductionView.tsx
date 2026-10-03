import React from 'react';
import type { Language, Parcel } from '../types';
import ProductionOliviaView from './ProductionOliviaView';

interface ProductionViewProps {
  language: Language;
  parcels: Parcel[];
  initialHarvestPlanId?: string | null;
  onHarvestPlanConsumed?: () => void;
}

const ProductionView: React.FC<ProductionViewProps> = ({ language, parcels, initialHarvestPlanId, onHarvestPlanConsumed }) => {
  return <ProductionOliviaView language={language} parcels={parcels} initialHarvestPlanId={initialHarvestPlanId} onHarvestPlanConsumed={onHarvestPlanConsumed} />;
};

export default ProductionView;
