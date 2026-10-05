import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { PostgrestError } from '@supabase/supabase-js';
import type { SensorType } from '../types';
import type {
  FarmGeoLandmark,
  FarmObservation,
  FarmZoneGeoSample,
  FarmZone,
  IrrigationEvent,
  SensorAlert,
  SensorDevice,
  SensorReading,
  TreeGroup,
} from '../types/farmIoT';

type AdvisorSeverity = 'optimal' | 'watch' | 'warning' | 'critical';

export interface FarmDecisionAdvice {
  severity: AdvisorSeverity;
  title: string;
  message: string;
  recommended_action:
    | 'no_action'
    | 'monitor'
    | 'irrigate'
    | 'inspect_dripline'
    | 'reduce_irrigation'
    | 'check_salinity'
    | 'calibrate_sensor';
  reasons: string[];
}

function throwFarmIoTError(label: string, error: PostgrestError | { message: string; code?: string; details?: string; hint?: string }): never {
  console.error(`[farmIoT] ${label}`, error);
  const code = (error as any).code || '';
  const msg = error.message || '';

  if (code === '42P01' || /relation .* does not exist/i.test(msg)) {
    throw new Error('Farm IoT-tabellene mangler i Supabase schema olivia. Kjør migrasjonen supabase/migrations/20260603_olivia_farm_iot.sql.');
  }
  if (code === '42501' || /permission denied|rls/i.test(msg)) {
    throw new Error('Tilgang nektet av Supabase RLS. Sjekk policy for Farm IoT-tabellene i olivia schema.');
  }
  throw new Error(`Farm IoT-operasjon feilet: ${msg || 'ukjent feil fra Supabase'}`);
}

function warnIfSupabaseMissing(label: string): boolean {
  if (isSupabaseConfigured) return false;
  console.warn(`[farmIoT] ${label}: Supabase er ikke konfigurert. Returnerer tom respons.`);
  return true;
}

export async function fetchFarmZones(parcelId?: string): Promise<FarmZone[]> {
  if (warnIfSupabaseMissing('fetchFarmZones')) return [];
  let query = supabase.from('farm_zones').select('*').order('name', { ascending: true });
  if (parcelId) query = query.eq('parcel_id', parcelId);
  const { data, error } = await query;
  if (error) { console.error('fetchFarmZones', error); return []; }
  return (data ?? []) as FarmZone[];
}

export async function upsertFarmZone(zone: Partial<FarmZone> & { parcel_id: string; name: string }): Promise<FarmZone> {
  if (warnIfSupabaseMissing('upsertFarmZone')) throw new Error('Supabase er ikke konfigurert.');
  const { data, error } = await supabase
    .from('farm_zones')
    .upsert(zone)
    .select('*')
    .single();
  if (error) throwFarmIoTError('upsertFarmZone', error);
  return data as FarmZone;
}

export async function fetchTreeGroups(zoneId?: string): Promise<TreeGroup[]> {
  if (warnIfSupabaseMissing('fetchTreeGroups')) return [];
  let query = supabase.from('tree_groups').select('*').order('name', { ascending: true });
  if (zoneId) query = query.eq('zone_id', zoneId);
  const { data, error } = await query;
  if (error) { console.error('fetchTreeGroups', error); return []; }
  return (data ?? []) as TreeGroup[];
}

export async function upsertTreeGroup(group: Partial<TreeGroup> & { parcel_id: string; name: string }): Promise<TreeGroup> {
  if (warnIfSupabaseMissing('upsertTreeGroup')) throw new Error('Supabase er ikke konfigurert.');
  const { data, error } = await supabase
    .from('tree_groups')
    .upsert(group)
    .select('*')
    .single();
  if (error) throwFarmIoTError('upsertTreeGroup', error);
  return data as TreeGroup;
}

export async function fetchFarmGeoLandmarks(parcelId?:string):Promise<FarmGeoLandmark[]>{
  if(warnIfSupabaseMissing('fetchFarmGeoLandmarks'))return[];
  let query=supabase.from('farm_geo_landmarks').select('*').eq('status','active').order('created_at',{ascending:false});
  if(parcelId)query=query.eq('parcel_id',parcelId);
  const {data,error}=await query;
  if(error)throwFarmIoTError('fetchFarmGeoLandmarks',error);
  return(data??[]) as FarmGeoLandmark[];
}

export async function upsertFarmGeoLandmark(
  landmark:Partial<FarmGeoLandmark>&Pick<FarmGeoLandmark,'name'|'landmark_type'|'lat'|'lon'>
):Promise<FarmGeoLandmark>{
  if(warnIfSupabaseMissing('upsertFarmGeoLandmark'))throw new Error('Supabase er ikke konfigurert.');
  const row={...landmark,status:landmark.status||'active',updated_at:new Date().toISOString()};
  const {data,error}=await supabase.from('farm_geo_landmarks').upsert(row).select('*').single();
  if(error)throwFarmIoTError('upsertFarmGeoLandmark',error);
  return data as FarmGeoLandmark;
}

export async function fetchFarmZoneGeoSamples(zoneId?:string,parcelId?:string):Promise<FarmZoneGeoSample[]>{
  if(warnIfSupabaseMissing('fetchFarmZoneGeoSamples'))return[];
  let query=supabase.from('farm_zone_geo_samples').select('*').order('captured_at',{ascending:false});
  if(zoneId)query=query.eq('zone_id',zoneId);
  if(parcelId)query=query.eq('parcel_id',parcelId);
  const {data,error}=await query;
  if(error)throwFarmIoTError('fetchFarmZoneGeoSamples',error);
  return(data??[]) as FarmZoneGeoSample[];
}

export async function insertFarmZoneGeoSample(
  sample:Omit<FarmZoneGeoSample,'id'|'created_at'> & {id?:string}
):Promise<FarmZoneGeoSample>{
  if(warnIfSupabaseMissing('insertFarmZoneGeoSample'))throw new Error('Supabase er ikke konfigurert.');
  const row={
    ...sample,
    id:sample.id||((typeof crypto!=='undefined'&&'randomUUID' in crypto)?crypto.randomUUID():'zone-sample-'+Date.now()+'-'+Math.random().toString(36).slice(2,8)),
  };
  const {data,error}=await supabase.from('farm_zone_geo_samples').insert(row).select('*').single();
  if(error)throwFarmIoTError('insertFarmZoneGeoSample',error);
  return data as FarmZoneGeoSample;
}

export async function fetchSensorDevices(): Promise<SensorDevice[]> {
  if (warnIfSupabaseMissing('fetchSensorDevices')) return [];
  const { data, error } = await supabase
    .from('sensor_devices')
    .select('*')
    .order('name', { ascending: true });
  if (error) { console.error('fetchSensorDevices', error); return []; }
  return (data ?? []) as SensorDevice[];
}

export async function upsertSensorDevice(device: SensorDevice): Promise<SensorDevice> {
  if (warnIfSupabaseMissing('upsertSensorDevice')) throw new Error('Supabase er ikke konfigurert.');
  const { data, error } = await supabase
    .from('sensor_devices')
    .upsert(device, { onConflict: 'sensor_id' })
    .select('*')
    .single();
  if (error) throwFarmIoTError('upsertSensorDevice', error);
  return data as SensorDevice;
}

export async function insertSensorReading(reading: Omit<SensorReading, 'id'>): Promise<SensorReading> {
  if (warnIfSupabaseMissing('insertSensorReading')) throw new Error('Supabase er ikke konfigurert.');
  const { data, error } = await supabase
    .from('sensor_readings')
    .insert(reading)
    .select('*')
    .single();
  if (error) throwFarmIoTError('insertSensorReading', error);
  return data as SensorReading;
}

export async function fetchLatestSensorReadings(limit = 200): Promise<SensorReading[]> {
  if (warnIfSupabaseMissing('fetchLatestSensorReadings')) return [];
  const { data, error } = await supabase
    .from('sensor_readings')
    .select('*')
    .order('measured_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('fetchLatestSensorReadings', error); return []; }
  return (data ?? []) as SensorReading[];
}

export async function fetchReadingsForSensor(sensorId: string, limit = 100): Promise<SensorReading[]> {
  if (warnIfSupabaseMissing('fetchReadingsForSensor')) return [];
  const { data, error } = await supabase
    .from('sensor_readings')
    .select('*')
    .eq('sensor_id', sensorId)
    .order('measured_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('fetchReadingsForSensor', error); return []; }
  return (data ?? []) as SensorReading[];
}

export async function fetchOpenSensorAlerts(): Promise<SensorAlert[]> {
  if (warnIfSupabaseMissing('fetchOpenSensorAlerts')) return [];
  const { data, error } = await supabase
    .from('sensor_alerts')
    .select('*')
    .is('resolved_at', null)
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchOpenSensorAlerts', error); return []; }
  return (data ?? []) as SensorAlert[];
}

export async function insertSensorAlert(alert: Omit<SensorAlert, 'id'>): Promise<SensorAlert> {
  if (warnIfSupabaseMissing('insertSensorAlert')) throw new Error('Supabase er ikke konfigurert.');
  const { data, error } = await supabase
    .from('sensor_alerts')
    .insert(alert)
    .select('*')
    .single();
  if (error) throwFarmIoTError('insertSensorAlert', error);
  return data as SensorAlert;
}

export async function insertIrrigationEvent(event: Omit<IrrigationEvent, 'id'>): Promise<IrrigationEvent> {
  if (warnIfSupabaseMissing('insertIrrigationEvent')) throw new Error('Supabase er ikke konfigurert.');
  const { data, error } = await supabase
    .from('irrigation_events')
    .insert(event)
    .select('*')
    .single();
  if (error) throwFarmIoTError('insertIrrigationEvent', error);
  return data as IrrigationEvent;
}

export async function fetchRecentIrrigationEvents(limit = 50): Promise<IrrigationEvent[]> {
  if (warnIfSupabaseMissing('fetchRecentIrrigationEvents')) return [];
  const { data, error } = await supabase
    .from('irrigation_events')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('fetchRecentIrrigationEvents', error); return []; }
  return (data ?? []) as IrrigationEvent[];
}

export async function insertFarmObservation(observation: Omit<FarmObservation, 'id'> & {id?:string}): Promise<FarmObservation> {
  if (warnIfSupabaseMissing('insertFarmObservation')) throw new Error('Supabase er ikke konfigurert.');
  const { data, error } = await supabase
    .from('farm_observations')
    .upsert(observation,{onConflict:'id'})
    .select('*')
    .single();
  if (error) throwFarmIoTError('insertFarmObservation', error);
  return data as FarmObservation;
}

export async function fetchRecentFarmObservations(limit = 50): Promise<FarmObservation[]> {
  if (warnIfSupabaseMissing('fetchRecentFarmObservations')) return [];
  const { data, error } = await supabase
    .from('farm_observations')
    .select('*')
    .order('observed_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('fetchRecentFarmObservations', error); return []; }
  return (data ?? []) as FarmObservation[];
}

export const SENSOR_ACTION_MAX_AGE_HOURS=24;
export const SENSOR_MIN_QUALITY_SCORE=0.5;

export function sensorReadingAgeHours(reading:Pick<SensorReading,'measured_at'>,now=new Date()):number|null{
  const measured=new Date(reading.measured_at);
  if(Number.isNaN(measured.getTime()))return null;
  return Math.max(0,(now.getTime()-measured.getTime())/3600000);
}

export function isSensorReadingFresh(reading:Pick<SensorReading,'measured_at'>,maxAgeHours=SENSOR_ACTION_MAX_AGE_HOURS,now=new Date()):boolean{
  const age=sensorReadingAgeHours(reading,now);
  return age!=null&&age<=maxAgeHours;
}

export function isSensorReadingQualityAcceptable(reading:Pick<SensorReading,'quality_score'>):boolean{
  return reading.quality_score==null||Number(reading.quality_score)>=SENSOR_MIN_QUALITY_SCORE;
}

export function isSensorReadingOperationallyUsable(
  reading:Pick<SensorReading,'measured_at'|'quality_score'>,
  now=new Date()
):boolean{
  return isSensorReadingFresh(reading,SENSOR_ACTION_MAX_AGE_HOURS,now)&&isSensorReadingQualityAcceptable(reading);
}

function latestByType(readings: SensorReading[], type: SensorType, now=new Date()): SensorReading | undefined {
  return readings
    .filter(reading => reading.type === type && isSensorReadingOperationallyUsable(reading,now))
    .sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime())[0];
}

export function buildDonaAnnaDecisionAdvice(readings: SensorReading[], alerts: SensorAlert[] = [], now=new Date()): FarmDecisionAdvice {
  const criticalAlert = alerts.find(alert => alert.severity === 'critical');
  if (criticalAlert) {
    return {
      severity: 'critical',
      title: criticalAlert.title,
      message: criticalAlert.message,
      recommended_action: (criticalAlert.recommended_action as FarmDecisionAdvice['recommended_action']) || 'monitor',
      reasons: ['Det finnes et åpent kritisk varsel i sensor_alerts.'],
    };
  }

  const soilMoisture = latestByType(readings, 'soil_moisture',now);
  const soilEc = latestByType(readings, 'soil_ec',now);
  const waterEc = latestByType(readings, 'water_ec',now);
  const flow = latestByType(readings, 'flow',now);
  const pressure = latestByType(readings, 'pressure',now);
  const leafWetness = latestByType(readings, 'leaf_wetness',now);

  const reasons: string[] = [];
  const latestPerType=new Map<string,SensorReading>();
  for(const reading of readings){
    const existing=latestPerType.get(reading.type);
    if(!existing||new Date(reading.measured_at)>new Date(existing.measured_at))latestPerType.set(reading.type,reading);
  }
  const latestValues=Array.from(latestPerType.values());
  const staleLatest=latestValues.filter(reading=>!isSensorReadingFresh(reading,SENSOR_ACTION_MAX_AGE_HOURS,now));
  const freshLatest=latestValues.filter(reading=>isSensorReadingFresh(reading,SENSOR_ACTION_MAX_AGE_HOURS,now));
  const lowQualityFresh=freshLatest.filter(reading=>!isSensorReadingQualityAcceptable(reading));
  const usableFresh=freshLatest.filter(reading=>isSensorReadingQualityAcceptable(reading));

  if(!usableFresh.length){
    if(lowQualityFresh.length){
      return{
        severity:'watch',
        title:'Ferske sensordata har for lav kvalitet',
        message:lowQualityFresh.length+' sensortype'+(lowQualityFresh.length===1?' har':'r har')+' fersk måling, men quality_score er under '+SENSOR_MIN_QUALITY_SCORE+'. Disse målingene brukes ikke til operative råd.',
        recommended_action:'monitor',
        reasons:['Olivia beholder målingene som historikk, men krever fersk og tilstrekkelig kvalitetsmerket data før operative sensorbaserte råd.'],
      };
    }
    return{
      severity:'watch',
      title:readings.length?'Sensordata er for gammel':'Ingen ferske sensordata',
      message:readings.length
        ?'Siste brukbare sensormålinger er eldre enn 24 timer og brukes derfor ikke til operative vannings- eller EC-råd.'
        :'Olivia mangler ferske sensormålinger. Bruk feltobservasjoner og manuelle målinger inntil sensordata er tilgjengelig.',
      recommended_action:'monitor',
      reasons:[readings.length?'Gamle sensormålinger beholdes som historikk, men brukes ikke som dagens beslutningsgrunnlag.':'Ingen sensormålinger er tilgjengelige.'],
    };
  }

  if (soilMoisture && soilMoisture.value < 30) {
    reasons.push(`Jordfuktighet er lav: ${soilMoisture.value}${soilMoisture.unit}.`);
    return {
      severity: 'critical',
      title: 'Kritisk lav jordfuktighet',
      message: `Prioriter vanning eller feltkontroll i ${soilMoisture.zone_id || soilMoisture.parcel_id || 'berørt sone'}.`,
      recommended_action: 'irrigate',
      reasons,
    };
  }

  if (pressure && pressure.value < 0.8 && flow && flow.value > 5) {
    reasons.push(`Trykk er lavt (${pressure.value}${pressure.unit}) samtidig som flow er aktiv (${flow.value}${flow.unit}).`);
    return {
      severity: 'warning',
      title: 'Mulig lekkasje eller trykkfall',
      message: 'Sjekk pumpe, filter, koblinger og dryppslanger i aktiv vanningssektor.',
      recommended_action: 'inspect_dripline',
      reasons,
    };
  }

  if (soilEc && soilEc.value > 2.5) {
    reasons.push(`Jord-EC er forhøyet: ${soilEc.value}${soilEc.unit}.`);
    return {
      severity: 'warning',
      title: 'Følg med på salt i jord',
      message: 'Vurder vannkvalitet, drenering og om det trengs leaching/justert vanningsstrategi.',
      recommended_action: 'check_salinity',
      reasons,
    };
  }

  if (waterEc && waterEc.value > 1.8) {
    reasons.push(`Vann-EC er forhøyet: ${waterEc.value}${waterEc.unit}.`);
    return {
      severity: 'warning',
      title: 'Vanningsvann har høy EC',
      message: 'Kontroller vannkilde og følg utvikling i jord-EC før mer intensiv vanning.',
      recommended_action: 'check_salinity',
      reasons,
    };
  }

  if (leafWetness && leafWetness.value > 70) {
    reasons.push(`Bladfukt er høy: ${leafWetness.value}${leafWetness.unit}.`);
    return {
      severity: 'watch',
      title: 'Økt sykdomsrisiko',
      message: 'Følg med på bladverk, lufting og tegn til sopp/sykdom i tett vegetasjon.',
      recommended_action: 'monitor',
      reasons,
    };
  }

  if (soilMoisture && soilMoisture.value < 38) {
    reasons.push(`Jordfuktighet nærmer seg lavt nivå: ${soilMoisture.value}${soilMoisture.unit}.`);
    return {
      severity: 'watch',
      title: 'Følg med på jordfuktighet',
      message: 'Overvåk de neste målingene og vurder kvelds-/nattvanning ved fortsatt fall.',
      recommended_action: 'monitor',
      reasons,
    };
  }

  const freshTypeCount=usableFresh.length;
  if(staleLatest.length){
    return{
      severity:'watch',
      title:'Ingen kritiske avvik i tilgjengelige ferske data',
      message:'Olivia har brukbare ferske data fra '+freshTypeCount+' sensortype'+(freshTypeCount===1?'':'r')+'. '+staleLatest.length+' sensortype'+(staleLatest.length===1?'':'r')+' har siste måling eldre enn 24 timer og er utelatt fra beslutningsgrunnlaget.'+(lowQualityFresh.length?' '+lowQualityFresh.length+' fersk sensortype'+(lowQualityFresh.length===1?' har':'r har')+' for lav quality_score og er også utelatt.':''),
      recommended_action:'monitor',
      reasons:['Dette betyr ikke at hele sensorbildet er komplett. Olivia vurderer bare sensortyper som faktisk har ferske målinger.'],
    };
  }

  return {
    severity: 'optimal',
    title: 'Ingen kritiske avvik i tilgjengelige ferske data',
    message: 'Olivia har brukbare ferske data fra '+freshTypeCount+' sensortype'+(freshTypeCount===1?'':'r')+' og finner ingen prioriterte grenseverdier overskredet i disse målingene.'+(lowQualityFresh.length?' '+lowQualityFresh.length+' fersk sensortype'+(lowQualityFresh.length===1?' er':'r er')+' utelatt på grunn av lav quality_score.':''),
    recommended_action: 'no_action',
    reasons: ['Dette beskriver bare sensorene som faktisk har rapportert ferske data; manglende sensortyper tolkes ikke som normale.'],
  };
}
