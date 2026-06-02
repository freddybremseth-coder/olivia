import React from 'react';
import type { Language, Parcel } from '../types';
import ProductionOliviaView from './ProductionOliviaView';

interface ProductionViewProps {
  language: Language;
  parcels: Parcel[];
}

const ProductionView: React.FC<ProductionViewProps> = ({ language, parcels }) => {
  return <ProductionOliviaView language={language} parcels={parcels} />;
};

export default ProductionView;
