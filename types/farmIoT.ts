import type { SensorType } from '../types';

export type FarmSeasonProfile = 'coastal_lowland' | 'biar_mountain_650m';

export type ZoneStatus = 'optimal' | 'watch' | 'warning' | 'critical' | 'offline';

export type IrrigationRecommendationAction =
  | 'no_action'
  | 'monitor'
  | 'irrigate'
  | 'inspect_dripline'
  | 'reduce_irrigation'
  | 'check_salinity'
  | 'calibrate_sensor';

export interface FarmZone {
  id: string;
  parcel_id: string;
  name: string;
  description?: string;
  slope?: 'flat' | 'north' | 'south' | 'east' | 'west' | 'mixed';
  altitude_m?: number;
  soil_type?: string;
  irrigation_sector_id?: string;
  boundaries?: [number, number][];
  status?: ZoneStatus;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TreeGroup {
  id: string;
  parcel_id: string;
  zone_id: string;
  name: string;
  variety?: string;
  tree_count?: number;
  age_years?: number;
  production_goal?: 'oil' | 'table_olives' | 'mixed';
  health_status?: ZoneStatus;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SensorDevice {
  id?: string;
  sensor_id: string;
  name: string;
  type: SensorType;
  parcel_id?: string;
  zone_id?: string;
  tree_group_id?: string;
  tree_group?: string;
  depth_cm?: number;
  unit: string;
  source: 'manual' | 'lorawan' | 'modbus' | 'wifi' | 'bluetooth' | 'api' | 'simulation' | string;
  status: 'Online' | 'Offline' | 'Low Battery';
  battery_percent?: number;
  signal_rssi?: number;
  calibrated_at?: string;
  installed_at?: string;
  last_seen_at?: string;
  notes?: string;
}

export interface SensorReading {
  id: string;
  sensor_id: string;
  parcel_id?: string;
  zone_id?: string;
  tree_group_id?: string;
  tree_group?: string;
  depth_cm?: number;
  type: SensorType;
  value: number;
  unit: string;
  battery_percent?: number;
  signal_rssi?: number;
  calibrated_at?: string;
  measured_at: string;
  received_at?: string;
  source?: 'manual' | 'lorawan' | 'modbus' | 'wifi' | 'bluetooth' | 'api' | 'simulation' | string;
  quality_score?: number;
}

export interface SensorAlert {
  id: string;
  sensor_id?: string;
  parcel_id?: string;
  zone_id?: string;
  tree_group_id?: string;
  tree_group?: string;
  type: SensorType | 'irrigation' | 'calibration' | 'connectivity' | 'season' | 'harvest';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  recommended_action?: IrrigationRecommendationAction;
  created_at: string;
  resolved_at?: string;
}

export interface IrrigationEvent {
  id: string;
  parcel_id: string;
  zone_id?: string;
  irrigation_sector_id?: string;
  started_at: string;
  ended_at?: string;
  duration_minutes?: number;
  estimated_liters?: number;
  flow_l_min?: number;
  pressure_bar?: number;
  trigger: 'manual' | 'schedule' | 'recommendation' | 'automation';
  notes?: string;
}

export interface FarmObservation {
  id: string;
  parcel_id?: string;
  zone_id?: string;
  tree_group_id?: string;
  tree_group?: string;
  category:
    | 'soil'
    | 'water'
    | 'tree_health'
    | 'pest'
    | 'disease'
    | 'irrigation'
    | 'harvest'
    | 'maintenance'
    | 'organic_certification'
    | 'other';
  title: string;
  notes?: string;
  image_urls?: string[];
  observed_at: string;
  created_by?: string;
}

export interface BiarSeasonSettings {
  profile: FarmSeasonProfile;
  altitude_m: number;
  location: 'Biar, Alicante';
  harvest_window_table_olives: { start_month: number; end_month: number; note: string };
  harvest_window_oil: { start_month: number; end_month: number; note: string };
  notes: string;
}

export const DONA_ANNA_BIAR_SEASON_SETTINGS: BiarSeasonSettings = {
  profile: 'biar_mountain_650m',
  altitude_m: 650,
  location: 'Biar, Alicante',
  harvest_window_table_olives: {
    start_month: 10,
    end_month: 11,
    note: 'Bordoliven vurderes fra oktober, men faktisk tidspunkt styres av sort, størrelse, modenhet og vær.'
  },
  harvest_window_oil: {
    start_month: 11,
    end_month: 12,
    note: 'Biar ligger høyt og kjøligere enn kysten, så oljehøsting kan normalt ligge senere enn lavere/varmere områder.'
  },
  notes: 'Bruk modenhet, vær, sort, ønsket oljeprofil og laboratoriedata som fasit. Kalenderen er kun veiledende.'
};
