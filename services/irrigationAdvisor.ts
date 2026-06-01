import type { SensorReading, IrrigationEvent } from '../types/farmIoT';

export type IrrigationAdvisorSeverity = 'optimal' | 'watch' | 'warning' | 'critical';

export type IrrigationAdvisorAction =
  | 'no_action'
  | 'monitor'
  | 'irrigate_evening'
  | 'inspect_dripline'
  | 'check_salinity'
  | 'reduce_irrigation'
  | 'calibrate_sensor';

export interface ClimateWaterInput {
  rain7d?: number;
  rain30d?: number;
  et0_7d?: number;
  et0_30d?: number;
  deficit7d?: number;
  deficit30d?: number;
  vpdAvg7d?: number;
  hotDays7d?: number;
  forecastRain7d?: number;
}

export interface IrrigationZoneAdvice {
  zone_id: string;
  zone_name: string;
  tree_group?: string;
  severity: IrrigationAdvisorSeverity;
  action: IrrigationAdvisorAction;
  title: string;
  message: string;
  recommended_minutes?: number;
  recommended_timing?: string;
  confidence: number;
  reasons: string[];
  values: {
    soil_moisture_30cm?: number;
    soil_moisture_60cm?: number;
    soil_ec?: number;
    water_ec?: number;
    flow?: number;
    pressure?: number;
    rain7d?: number;
    deficit7d?: number;
    forecastRain7d?: number;
  };
}

function latestByType(readings: SensorReading[], type: string, zoneId?: string): SensorReading | undefined {
  return readings
    .filter(reading => reading.type === type && (!zoneId || reading.zone_id === zoneId))
    .sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime())[0];
}

function latestByTypeAndDepth(readings: SensorReading[], type: string, depth: number, zoneId?: string): SensorReading | undefined {
  return readings
    .filter(reading => {
      const depthOk = typeof reading.depth_cm === 'number' ? Math.abs(reading.depth_cm - depth) <= 15 : false;
      return reading.type === type && depthOk && (!zoneId || reading.zone_id === zoneId);
    })
    .sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime())[0];
}

function uniqueZones(readings: SensorReading[]): string[] {
  const zones = readings.map(reading => reading.zone_id || 'farm').filter(Boolean);
  return Array.from(new Set(zones));
}

function confidenceScore(reasons: string[], values: IrrigationZoneAdvice['values']): number {
  let score = 0.35;
  if (typeof values.soil_moisture_30cm === 'number') score += 0.18;
  if (typeof values.soil_moisture_60cm === 'number') score += 0.18;
  if (typeof values.pressure === 'number') score += 0.08;
  if (typeof values.flow === 'number') score += 0.08;
  if (typeof values.soil_ec === 'number' || typeof values.water_ec === 'number') score += 0.08;
  if (typeof values.deficit7d === 'number' || typeof values.rain7d === 'number') score += 0.08;
  if (typeof values.forecastRain7d === 'number') score += 0.05;
  if (reasons.length >= 4) score += 0.06;
  return Math.min(0.98, Math.round(score * 100) / 100);
}

function minutesFromSeverity(severity: IrrigationAdvisorSeverity, treeGroup?: string): number | undefined {
  const youngTrees = (treeGroup || '').toLowerCase().includes('unge') || (treeGroup || '').toLowerCase().includes('young');
  if (severity === 'critical') return youngTrees ? 150 : 120;
  if (severity === 'warning') return youngTrees ? 90 : 75;
  if (severity === 'watch') return youngTrees ? 45 : undefined;
  return undefined;
}

function recentIrrigationForZone(events: IrrigationEvent[], zoneId: string): IrrigationEvent | undefined {
  return events
    .filter(event => event.zone_id === zoneId || event.irrigation_sector_id === zoneId)
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0];
}

export function buildIrrigationZoneAdvice(params: {
  zoneId: string;
  zoneName?: string;
  readings: SensorReading[];
  climate?: ClimateWaterInput;
  irrigationEvents?: IrrigationEvent[];
}): IrrigationZoneAdvice {
  const { zoneId, zoneName, readings, climate = {}, irrigationEvents = [] } = params;

  const m30 = latestByTypeAndDepth(readings, 'soil_moisture', 30, zoneId) || latestByType(readings, 'soil_moisture', zoneId);
  const m60 = latestByTypeAndDepth(readings, 'soil_moisture', 60, zoneId);
  const soilEc = latestByType(readings, 'soil_ec', zoneId);
  const waterEc = latestByType(readings, 'water_ec') || latestByType(readings, 'water_ec', zoneId);
  const flow = latestByType(readings, 'flow', zoneId) || latestByType(readings, 'flow');
  const pressure = latestByType(readings, 'pressure', zoneId) || latestByType(readings, 'pressure');
  const recentIrrigation = recentIrrigationForZone(irrigationEvents, zoneId);

  const values: IrrigationZoneAdvice['values'] = {
    soil_moisture_30cm: m30?.value,
    soil_moisture_60cm: m60?.value,
    soil_ec: soilEc?.value,
    water_ec: waterEc?.value,
    flow: flow?.value,
    pressure: pressure?.value,
    rain7d: climate.rain7d,
    deficit7d: climate.deficit7d,
    forecastRain7d: climate.forecastRain7d,
  };

  const treeGroup = m30?.tree_group || m60?.tree_group || soilEc?.tree_group;
  const reasons: string[] = [];
  let severity: IrrigationAdvisorSeverity = 'optimal';
  let action: IrrigationAdvisorAction = 'no_action';
  let title = 'Ingen vanning nødvendig nå';
  let message = 'Sensor- og klimabildet tilsier at sonen kan overvåkes videre.';

  if (typeof pressure?.value === 'number' && typeof flow?.value === 'number' && pressure.value < 0.8 && flow.value > 5) {
    reasons.push(`Lavt trykk (${pressure.value}${pressure.unit}) samtidig som flow er aktiv (${flow.value}${flow.unit}).`);
    severity = 'warning';
    action = 'inspect_dripline';
    title = 'Sjekk vanningssystem før mer vanning';
    message = 'Trykk/flow tyder på mulig lekkasje, tett filter, pumpeproblem eller skadet dryppslange.';
  }

  if (typeof soilEc?.value === 'number' && soilEc.value > 2.5) {
    reasons.push(`Jord-EC er forhøyet (${soilEc.value}${soilEc.unit}).`);
    if (severity !== 'warning') severity = 'watch';
    if (action === 'no_action') action = 'check_salinity';
  }

  if (typeof waterEc?.value === 'number' && waterEc.value > 1.8) {
    reasons.push(`Vann-EC er forhøyet (${waterEc.value}${waterEc.unit}).`);
    if (severity !== 'warning') severity = 'watch';
    if (action === 'no_action') action = 'check_salinity';
  }

  if (typeof m60?.value === 'number' && m60.value < 28) {
    reasons.push(`Dyp jordfukt er kritisk lav (${m60.value}${m60.unit} på ca. ${m60.depth_cm || 60} cm).`);
    severity = 'critical';
    action = 'irrigate_evening';
    title = 'Prioriter vanning i rotsonen';
    message = 'Dyp jordfukt er lav. Vann etter solnedgang/kveld for bedre effekt og mindre fordamping.';
  } else if (typeof m30?.value === 'number' && m30.value < 30) {
    reasons.push(`Overflate-/middels jordfukt er kritisk lav (${m30.value}${m30.unit}).`);
    severity = 'critical';
    action = 'irrigate_evening';
    title = 'Kritisk lav jordfuktighet';
    message = 'Sonen bør vannes eller kontrolleres i felt så snart som praktisk mulig.';
  } else if (typeof m30?.value === 'number' && m30.value < 38) {
    reasons.push(`Jordfukt nærmer seg lavt nivå (${m30.value}${m30.unit}).`);
    if (severity === 'optimal') severity = 'watch';
    if (action === 'no_action') action = 'monitor';
    title = 'Følg med på jordfuktighet';
    message = 'Overvåk neste målinger. Vurder lett kvelds-/nattvanning hvis nivået fortsetter ned.';
  }

  if (typeof climate.deficit7d === 'number' && climate.deficit7d > 25) {
    reasons.push(`Siste 7 dager har klimatisk vannunderskudd på ca. ${Math.round(climate.deficit7d)} mm.`);
    if (severity === 'optimal') severity = 'watch';
    if (action === 'no_action') action = 'monitor';
  }

  if (typeof climate.rain7d === 'number' && climate.rain7d < 5) {
    reasons.push(`Lite regn siste 7 dager (${Math.round(climate.rain7d)} mm).`);
  }

  if (typeof climate.forecastRain7d === 'number' && climate.forecastRain7d > 15 && severity !== 'critical') {
    reasons.push(`Det er meldt ca. ${Math.round(climate.forecastRain7d)} mm regn de neste 7 dagene.`);
    if (action === 'irrigate_evening') action = 'monitor';
    if (severity === 'warning') severity = 'watch';
    message = 'Det er regn i prognosen. Vent med større vanning hvis felt og jordfukt tillater det.';
  }

  if (recentIrrigation) {
    const hoursSince = (Date.now() - new Date(recentIrrigation.started_at).getTime()) / 36e5;
    if (hoursSince < 24) {
      reasons.push(`Sonen ble vannet for ca. ${Math.round(hoursSince)} timer siden.`);
      if (severity !== 'critical' && action === 'irrigate_evening') action = 'monitor';
    }
  }

  const recommended_minutes = action === 'irrigate_evening' ? minutesFromSeverity(severity, treeGroup) : undefined;
  const confidence = confidenceScore(reasons, values);

  return {
    zone_id: zoneId,
    zone_name: zoneName || zoneId,
    tree_group: treeGroup,
    severity,
    action,
    title,
    message,
    recommended_minutes,
    recommended_timing: action === 'irrigate_evening' ? 'Etter kl. 20:00 / kveld-natt' : undefined,
    confidence,
    reasons: reasons.length ? reasons : ['Ingen tydelige avvik i tilgjengelige sensorer og klimadata.'],
    values,
  };
}

export function buildIrrigationAdvice(params: {
  readings: SensorReading[];
  climate?: ClimateWaterInput;
  irrigationEvents?: IrrigationEvent[];
  zoneNames?: Record<string, string>;
}): IrrigationZoneAdvice[] {
  const zones = uniqueZones(params.readings);
  const relevantZones = zones.length ? zones : ['farm'];
  return relevantZones
    .map(zoneId => buildIrrigationZoneAdvice({
      zoneId,
      zoneName: params.zoneNames?.[zoneId],
      readings: params.readings,
      climate: params.climate,
      irrigationEvents: params.irrigationEvents,
    }))
    .sort((a, b) => {
      const order = { critical: 4, warning: 3, watch: 2, optimal: 1 };
      return order[b.severity] - order[a.severity] || b.confidence - a.confidence;
    });
}
