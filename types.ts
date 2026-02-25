
import { PruningPlan, PlantDiagnosis } from './services/geminiService';

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
}

export type TableOliveStage = 'PLUKKING' | 'LAKE' | 'SKYLLING' | 'MARINERING' | 'LAGRING' | 'PAKKING' | 'SALG';

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
  cadastralId: string;
  cropType: string; 
  treeVariety?: string; 
  area: number; 
  treeCount: number;
  irrigationStatus: 'Optimal' | 'Low' | 'Critical';
  coordinates: [number, number][]; 
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

export interface Batch {
  id: string;
  parcelId: string;
  harvestDate: string;
  weight: number; 
  quality: 'Premium' | 'Standard' | 'Commercial';
  qualityScore: number; 
  status: 'ACTIVE' | 'ARCHIVED';
  laborHours: number;
  laborCost: number;
  yieldType: 'Oil' | 'Table';
  oilYieldLiters?: number;
  tableOliveYieldKg?: number;
  traceabilityCode: string;
  currentStage?: TableOliveStage;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
  note: string;
  parcelId?: string;
}

export interface Sensor {
  id: string;
  name: string;
  type: 'Moisture' | 'Temperature' | 'NPK' | 'PH';
  value: string;
  unit: string;
  parcelId: string;
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

// Added Ingredient interface
export interface Ingredient {
  name: string;
  amount: string;
  unit: string;
}

// Added Recipe interface
export interface Recipe {
  id: string;
  name: string;
  ingredients: Ingredient[];
  rating: number;
  notes: string;
  isAiGenerated: boolean;
  isQualityAssured: boolean;
}

// Updated PruningHistoryItem to support PruningAdvisorView fields
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
