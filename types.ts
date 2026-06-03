import { PruningPlan, PlantDiagnosis } from './services/geminiService';

export type Language = 'en' | 'no' | 'es';

export interface FarmInsight {
    id: string;
    tittel: string;
    beskrivelse: string;
}

export enum EquipmentStatus {
  ACTIVE = 'ACTIVE',
  SERVICE = 'SERVICE',
  BROKEN = 'BROKEN'
}

export type UserRole = 'farmer' | 'super_admin';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  subscription: 'monthly' | 'annual' | 'lifetime' | 'trial';
  subscriptionStart: string;
  avatar?: string;
  company?: string;
  phone?: string;
  billingAddress?: string;
  shippingAddress?: string;
  taxId?: string;
}

export type TableOliveStage = 'PLUKKING' | 'LAKE' | 'SKYLLING' | 'MARINERING' | 'LAGRING' | 'PAKKING' | 'SALG';

export type FlavorProfile = 'mild' | 'syrlig' | 'krydret' | 'urterik' | 'sitrus' | 'hvitlok' | 'middelhav';

export interface AppDocument {
  id: string;
  name: string;
  type: 'Nota Simple' | 'Skjøte' | 'Tillatelse' | 'Annet';
  uploadDate: string;
  fileSize: string;
  url: string; 
  parcelId?: string; 
}

export interface Parcel {
  id: string;
  name: string;
  municipality?: string;
  cadastralId?: string;
  cropType?: string;
  crop?: string;
  treeVariety?: string;
  area: number;
  treeCount?: number;
  irrigationStatus?: 'Optimal' | 'Low' | 'Critical';
  coordinates?: [number, number][];
  lat?: number;
  lon?: number;
  soilType?: string;
  registrationDate?: string;
  boundaries?: any[];
  documentIds?: string[];
  registryDetails?: string;
}

export interface ComprehensiveAnalysis {
  diagnosis: PlantDiagnosis;
  pruning: PruningPlan;
  varietyConfidence: number;
  needsMoreImages: boolean;
  missingDetails: string[];
}

export interface BatchSale {
  id: string;
  date: string;
  kg: number;
  pricePerKg: number;
  buyer?: string;
  note?: string;
}

export interface BatchLog {
  stage: TableOliveStage;
  startDate: string;
  notes: string;
}

export interface BatchQualityMetrics {
  acidity?: number;
  peroxide?: number;
  k232?: number;
  k270?: number;
  deltaK?: number;
  phenols?: number;
}

export interface Batch {
  id: string;
  parcelId: string;
  recipeId?: string;
  recipeName?: string;
  recipeSnapshot?: Ingredient[];
  oliveType?: string;
  harvestDate: string;
  weight: number;
  quality: 'Premium' | 'Good' | 'Standard' | 'Commercial';
  qualityScore?: number;
  status: 'ACTIVE' | 'ARCHIVED';
  laborHours?: number;
  laborCost?: number;
  yieldType: 'Oil' | 'Table';
  oilYieldLiters?: number;
  tableOliveYieldKg?: number;
  traceabilityCode?: string;
  currentStage?: TableOliveStage;
  stageStartDate?: string;
  completedStages?: TableOliveStage[];
  sales?: BatchSale[];
  logs?: BatchLog[];
  qualityMetrics?: BatchQualityMetrics;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
  note: string;
  parcelId?: string;
  batchId?: string;
}

export type SensorType =
  | 'soil_moisture'
  | 'soil_temperature'
  | 'soil_ec'
  | 'soil_ph'
  | 'water_ec'
  | 'water_ph'
  | 'flow'
  | 'pressure'
  | 'rain'
  | 'air_temperature'
  | 'air_humidity'
  | 'humidity'
  | 'leaf_wetness'
  | 'battery'
  | 'Moisture'
  | 'Temperature'
  | 'NPK'
  | 'PH';

export interface Sensor {
  id: string;
  sensor_id?: string;
  name: string;
  type: SensorType;
  parcelId: string;
  parcel_id?: string;
  zone_id?: string;
  tree_group?: string;
  depth_cm?: number;
  value: string;
  unit: string;
  battery_percent?: number;
  signal_rssi?: number;
  calibrated_at?: string;
  measured_at?: string;
  source?: 'manual' | 'lorawan' | 'modbus' | 'wifi' | 'bluetooth' | 'api' | 'simulation' | string;
  status: 'Online' | 'Offline' | 'Low Battery';
}

export interface Task {
  id: string;
  title: string;
  priority: 'Lav' | 'Middels' | 'Høy' | 'Kritisk';
  category: string;
  user: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  parcelId?: string;
  dueDate?: string; 
}

export interface Ingredient {
  name: string;
  amount: string;
  unit: string;
}

export interface Recipe {
  id: string;
  name: string;
  flavorProfile?: FlavorProfile;
  description?: string;
  recommendedOliveTypes?: string[];
  ingredients: Ingredient[];
  brineChangeDays?: number[];
  marinadeDayFrom?: number;
  readyAfterDays?: number;
  rating: number;
  notes: string;
  isAiGenerated: boolean;
  isQualityAssured: boolean;
}

export interface PruningHistoryItem {
  id: string;
  date: string;
  images: string[]; 
  treeType: string;
  ageEstimate: string;
  analysis?: ComprehensiveAnalysis;
  plan?: PruningPlan;
  scheduledTime?: string;
  parcelId?: string;
}

export interface HarvestRecord {
  id: string;
  parcelId: string;
  season: string;
  date: string;
  variety: string;
  kg: number;
  channel: 'cooperativa' | 'bordoliven' | 'olje_premier' | 'olje_export';
  pricePerKg: number;
  notes?: string;
}

export interface FarmExpense {
  id: string;
  date: string;
  season: string;
  category: string;
  description: string;
  amount: number;
  scope: 'farm' | 'parcel';
  parcelId?: string;
}

export interface SubsidyIncome {
  id: string;
  date: string;
  season: string;
  type: string;
  amount: number;
  description: string;
}
