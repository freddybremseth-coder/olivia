import type { SensorReading, SensorAlert } from '../types/farmIoT';
import type { Task } from '../types';

export type AutoTaskSource =
  | 'soil_moisture'
  | 'salinity'
  | 'irrigation_system'
  | 'sensor_health'
  | 'weather'
  | 'harvest'
  | 'organic_certification';

export type AutoTaskSuggestion = {
  id: string;
  title: string;
  priority: Task['priority'];
  category: string;
  dueDate: string;
  user?: string;
  parcelId?: string;
  zone_id?: string;
  source: AutoTaskSource;
  reason: string;
  suggestedAction: string;
  confidence: number;
};

type WeatherSignal = {
  rainNext7d?: number;
  minTempNext7d?: number;
  hotDaysNext7d?: number;
  deficit7d?: number;
};

function todayPlus(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function latest(readings: SensorReading[], type: string, zoneId?: string, depth?: number): SensorReading | undefined {
  return readings
    .filter(reading => {
      const typeOk = reading.type === type;
      const zoneOk = !zoneId || reading.zone_id === zoneId;
      const depthOk = typeof depth !== 'number' || (typeof reading.depth_cm === 'number' && Math.abs(reading.depth_cm - depth) <= 15);
      return typeOk && zoneOk && depthOk;
    })
    .sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime())[0];
}

function uniqueZones(readings: SensorReading[]): string[] {
  const zones = readings.map(reading => reading.zone_id || 'farm').filter(Boolean);
  return Array.from(new Set(zones));
}

function makeId(source: AutoTaskSource, zoneId: string, suffix: string): string {
  return `auto-${source}-${zoneId}-${suffix}`.replace(/[^a-zA-Z0-9-_]/g, '-');
}

function suggestion(params: Omit<AutoTaskSuggestion, 'id'> & { id: string }): AutoTaskSuggestion {
  return params;
}

export function buildAutoTaskSuggestions(params: {
  readings: SensorReading[];
  alerts?: SensorAlert[];
  weather?: WeatherSignal;
  includeSeasonal?: boolean;
}): AutoTaskSuggestion[] {
  const { readings, alerts = [], weather = {}, includeSeasonal = true } = params;
  const zones = uniqueZones(readings);
  const suggestions: AutoTaskSuggestion[] = [];

  zones.forEach(zoneId => {
    const m30 = latest(readings, 'soil_moisture', zoneId, 30) || latest(readings, 'soil_moisture', zoneId);
    const m60 = latest(readings, 'soil_moisture', zoneId, 60);
    const soilEc = latest(readings, 'soil_ec', zoneId);
    const waterEc = latest(readings, 'water_ec') || latest(readings, 'water_ec', zoneId);
    const flow = latest(readings, 'flow', zoneId) || latest(readings, 'flow');
    const pressure = latest(readings, 'pressure', zoneId) || latest(readings, 'pressure');
    const zoneReadings = readings.filter(reading => reading.zone_id === zoneId);
    const batteryValues = zoneReadings.map(reading => reading.battery_percent).filter((value): value is number => typeof value === 'number');
    const minBattery = batteryValues.length ? Math.min(...batteryValues) : undefined;

    if (typeof m60?.value === 'number' && m60.value < 28) {
      suggestions.push(suggestion({
        id: makeId('soil_moisture', zoneId, 'deep-dry'),
        title: `Kontroller/vann rotsonen i ${zoneId}`,
        priority: 'Kritisk',
        category: 'Vanning',
        dueDate: todayPlus(0),
        zone_id: zoneId,
        source: 'soil_moisture',
        reason: `Dyp jordfukt er kritisk lav: ${m60.value}${m60.unit || '%'}.`,
        suggestedAction: 'Sjekk sonen i felt og vann på kvelden hvis dryppsystemet fungerer normalt.',
        confidence: 0.9,
      }));
    } else if (typeof m30?.value === 'number' && m30.value < 32) {
      suggestions.push(suggestion({
        id: makeId('soil_moisture', zoneId, 'surface-dry'),
        title: `Følg lav jordfukt i ${zoneId}`,
        priority: 'Høy',
        category: 'Vanning',
        dueDate: todayPlus(1),
        zone_id: zoneId,
        source: 'soil_moisture',
        reason: `Jordfukt er lav: ${m30.value}${m30.unit || '%'}.`,
        suggestedAction: 'Sammenlign med vær/ET₀ og vurder lett vanning hvis trenden fortsetter ned.',
        confidence: 0.78,
      }));
    }

    if (typeof soilEc?.value === 'number' && soilEc.value > 2.5) {
      suggestions.push(suggestion({
        id: makeId('salinity', zoneId, 'soil-ec'),
        title: `Ta jordprøve / kontroller EC i ${zoneId}`,
        priority: soilEc.value > 3.5 ? 'Kritisk' : 'Høy',
        category: 'Salt / EC',
        dueDate: todayPlus(3),
        zone_id: zoneId,
        source: 'salinity',
        reason: `Jord-EC er forhøyet: ${soilEc.value}${soilEc.unit || ' dS/m'}.`,
        suggestedAction: 'Bekreft med jordprøve, sjekk drenering og sammenlign med vann-EC før store vanningsendringer.',
        confidence: 0.82,
      }));
    }

    if (typeof waterEc?.value === 'number' && waterEc.value > 1.8) {
      suggestions.push(suggestion({
        id: makeId('salinity', zoneId, 'water-ec'),
        title: 'Kontroller vannkilde og vann-EC',
        priority: 'Høy',
        category: 'Salt / EC',
        dueDate: todayPlus(2),
        zone_id: zoneId,
        source: 'salinity',
        reason: `Vann-EC er forhøyet: ${waterEc.value}${waterEc.unit || ' dS/m'}.`,
        suggestedAction: 'Ta vannprøve, vurder om vannkilden bidrar til saltoppbygging og loggfør verdien.',
        confidence: 0.8,
      }));
    }

    if (typeof pressure?.value === 'number' && typeof flow?.value === 'number' && pressure.value < 0.8 && flow.value > 5) {
      suggestions.push(suggestion({
        id: makeId('irrigation_system', zoneId, 'low-pressure-flow'),
        title: `Sjekk dryppslange/filter i ${zoneId}`,
        priority: 'Kritisk',
        category: 'Vanning',
        dueDate: todayPlus(0),
        zone_id: zoneId,
        source: 'irrigation_system',
        reason: `Lavt trykk (${pressure.value}${pressure.unit || ' bar'}) samtidig med aktiv flow (${flow.value}${flow.unit || ' L/min'}).`,
        suggestedAction: 'Se etter lekkasje, tett filter, pumpeproblem eller kaninskade på dryppslanger.',
        confidence: 0.88,
      }));
    }

    if (typeof minBattery === 'number' && minBattery < 30) {
      suggestions.push(suggestion({
        id: makeId('sensor_health', zoneId, 'battery'),
        title: `Bytt/lade sensorbatteri i ${zoneId}`,
        priority: minBattery < 15 ? 'Kritisk' : 'Middels',
        category: 'IoT / Sensor',
        dueDate: todayPlus(minBattery < 15 ? 0 : 7),
        zone_id: zoneId,
        source: 'sensor_health',
        reason: `Laveste sensorbatteri i sonen er ${minBattery}%.`,
        suggestedAction: 'Bytt batteri eller kontroller strøm/solcelle før sensoren går offline.',
        confidence: 0.86,
      }));
    }
  });

  alerts.forEach(alert => {
    suggestions.push(suggestion({
      id: `auto-alert-${alert.id}`,
      title: alert.title,
      priority: alert.severity === 'critical' ? 'Kritisk' : 'Høy',
      category: alert.type === 'connectivity' ? 'IoT / Sensor' : alert.type === 'harvest' ? 'Innhøsting' : 'Sensorvarsel',
      dueDate: todayPlus(alert.severity === 'critical' ? 0 : 2),
      zone_id: alert.zone_id,
      source: alert.type === 'harvest' ? 'harvest' : 'sensor_health',
      reason: alert.message,
      suggestedAction: alert.recommended_action || 'Kontroller i felt og oppdater status.',
      confidence: alert.severity === 'critical' ? 0.9 : 0.72,
    }));
  });

  if (typeof weather.minTempNext7d === 'number' && weather.minTempNext7d <= 2) {
    suggestions.push(suggestion({
      id: 'auto-weather-frost-risk',
      title: 'Følg frostfare i Biar-sonene',
      priority: 'Høy',
      category: 'Vær / Risiko',
      dueDate: todayPlus(0),
      source: 'weather',
      reason: `Prognosen viser laveste temperatur rundt ${Math.round(weather.minTempNext7d)} °C neste 7 dager.`,
      suggestedAction: 'Følg værvarsel, prioriter utsatte soner og vurder høste-/beskyttelsestiltak hvis frukt er nær ønsket modenhet.',
      confidence: 0.76,
    }));
  }

  if (typeof weather.rainNext7d === 'number' && weather.rainNext7d > 20) {
    suggestions.push(suggestion({
      id: 'auto-weather-heavy-rain',
      title: 'Planlegg rundt meldt regn',
      priority: 'Middels',
      category: 'Vær / Planlegging',
      dueDate: todayPlus(1),
      source: 'weather',
      reason: `Det er meldt ca. ${Math.round(weather.rainNext7d)} mm regn neste 7 dager.`,
      suggestedAction: 'Vurder å utsette vanning, planlegg feltarbeid og vurder høsting før regn hvis kvaliteten er klar.',
      confidence: 0.72,
    }));
  }

  if (typeof weather.hotDaysNext7d === 'number' && weather.hotDaysNext7d >= 3) {
    suggestions.push(suggestion({
      id: 'auto-weather-heat-stress',
      title: 'Følg varmestress og unge trær',
      priority: 'Høy',
      category: 'Vanning',
      dueDate: todayPlus(0),
      source: 'weather',
      reason: `${weather.hotDaysNext7d} varme dager er ventet neste 7 dager.`,
      suggestedAction: 'Kontroller unge trær, jordfukt og dryppsystem før varmeperioden topper seg.',
      confidence: 0.74,
    }));
  }

  if (includeSeasonal) {
    const now = new Date();
    const month = now.getMonth() + 1;
    if (month >= 10 && month <= 12) {
      suggestions.push(suggestion({
        id: 'auto-season-harvest-check',
        title: 'Ukentlig modenhetskontroll for høsting',
        priority: 'Høy',
        category: 'Innhøsting',
        dueDate: todayPlus(3),
        source: 'harvest',
        reason: 'Biar 650 moh. er i aktuelt høste-/modningsvindu for bordoliven/olje.',
        suggestedAction: 'Registrer modenhetsindeks, fruktstørrelse, fasthet, skadegrad og bilder i feltlogg/høsteplan.',
        confidence: 0.7,
      }));
    }

    if (month === 6 || month === 7) {
      suggestions.push(suggestion({
        id: 'auto-organic-july-inspection',
        title: 'Forbered økologisk dokumentpakke før juli-gjennomgang',
        priority: 'Høy',
        category: 'Økologisk',
        dueDate: todayPlus(7),
        source: 'organic_certification',
        reason: 'Juli 2026 er nevnt som viktig periode for ny gjennomgang/befaring.',
        suggestedAction: 'Samle skjøte, Catastro, Land Registry, øko-historikk, parcel-liste og spørsmål om kompensasjon.',
        confidence: 0.78,
      }));
    }
  }

  const seen = new Set<string>();
  return suggestions
    .filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .sort((a, b) => {
      const priorityOrder: Record<Task['priority'], number> = { Kritisk: 4, Høy: 3, Middels: 2, Lav: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority] || b.confidence - a.confidence;
    });
}

export function autoSuggestionToTask(suggestion: AutoTaskSuggestion): Task {
  return {
    id: `task-${suggestion.id}-${Date.now()}`,
    title: suggestion.title,
    priority: suggestion.priority,
    status: 'TODO',
    category: suggestion.category,
    dueDate: suggestion.dueDate,
    user: suggestion.user || 'Olivia',
    parcelId: suggestion.parcelId,
    description: `${suggestion.reason}\n\nAnbefalt handling: ${suggestion.suggestedAction}\n\nKilde: ${suggestion.source} · Tillit: ${Math.round(suggestion.confidence * 100)}%`,
  } as Task;
}
