import { supabase } from './supabaseClient';
import type { Parcel } from '../types';
import { fetchParcels as fetchPublicParcels, upsertParcel as upsertPublicParcel, deleteParcel as deletePublicParcel, fetchSettings as fetchPublicSettings, saveSettings as savePublicSettings, type FarmSettings } from './db';

const SCHEMA_CANDIDATES = ['olivia', 'public'];

function safeJson(value: unknown) {
  if (!value) return undefined;
  if (Array.isArray(value) || typeof value === 'object') return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return undefined; }
  }
  return undefined;
}

function normalizeLatLon(row: any): { lat?: number; lon?: number } {
  const directLat = row.lat ?? row.latitude;
  const directLon = row.lon ?? row.lng ?? row.longitude;
  if (directLat !== undefined && directLon !== undefined) {
    return { lat: Number(directLat), lon: Number(directLon) };
  }

  const metadata = row.metadata || {};
  const metaLat = metadata.lat ?? metadata.latitude ?? metadata.center_lat;
  const metaLon = metadata.lon ?? metadata.lng ?? metadata.longitude ?? metadata.center_lon;
  if (metaLat !== undefined && metaLon !== undefined) {
    return { lat: Number(metaLat), lon: Number(metaLon) };
  }

  const coordinates = safeJson(row.coordinates) as any;
  if (Array.isArray(coordinates) && coordinates.length) {
    const first = Array.isArray(coordinates[0]) ? coordinates[0] : coordinates;
    if (Array.isArray(first) && first.length >= 2) {
      return { lat: Number(first[0]), lon: Number(first[1]) };
    }
  }

  return {};
}

function rowToParcel(row: any): Parcel {
  const metadata = row.metadata || {};
  const latLon = normalizeLatLon(row);
  const polygon = row.polygon ?? row.poligono ?? metadata.polygon ?? metadata.poligono;
  const parcela = row.parcel ?? row.parcela ?? metadata.parcel ?? metadata.parcela;
  const cadastralId = row.cadastral_id ?? row.cadastralId ?? row.catastro_ref ?? row.referencia_catastral ?? metadata.cadastral_id ?? metadata.catastro_ref ?? metadata.referencia_catastral;

  return {
    id: String(row.id),
    name: row.name || [row.municipality || metadata.municipality || 'Biar', polygon && `Pol. ${polygon}`, parcela && `Parc. ${parcela}`].filter(Boolean).join(' · '),
    municipality: row.municipality ?? metadata.municipality ?? 'Biar',
    cadastralId: cadastralId ?? undefined,
    cropType: row.crop_type ?? row.cropType ?? metadata.crop_type ?? 'olive',
    crop: row.crop ?? metadata.crop ?? 'Olivos',
    treeVariety: row.tree_variety ?? row.treeVariety ?? metadata.tree_variety ?? undefined,
    area: Number(row.area ?? row.area_m2 ?? metadata.area ?? metadata.area_m2 ?? 0),
    treeCount: row.tree_count ?? row.treeCount ?? metadata.tree_count ?? undefined,
    irrigationStatus: row.irrigation_status ?? row.irrigationStatus ?? metadata.irrigation_status ?? undefined,
    coordinates: safeJson(row.coordinates) as any,
    lat: latLon.lat,
    lon: latLon.lon,
    soilType: row.soil_type ?? row.soilType ?? metadata.soil_type ?? undefined,
    registrationDate: row.registration_date ?? row.registrationDate ?? metadata.registration_date ?? undefined,
    boundaries: safeJson(row.boundaries) as any,
    documentIds: safeJson(row.document_ids) as any,
    registryDetails: row.registry_details ?? metadata.registry_details ?? [polygon && `Polígono ${polygon}`, parcela && `Parcela ${parcela}`, cadastralId && `Catastro ${cadastralId}`].filter(Boolean).join(' · ') || undefined,
  };
}

async function fetchParcelsFromSchema(schemaName: string): Promise<Parcel[]> {
  const { data, error } = await supabase
    .schema(schemaName)
    .from('parcels')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToParcel);
}

export async function fetchParcelsSmart(): Promise<Parcel[]> {
  for (const schemaName of SCHEMA_CANDIDATES) {
    try {
      const rows = await fetchParcelsFromSchema(schemaName);
      if (rows.length) {
        console.info(`[dbSmart] loaded ${rows.length} parcels from ${schemaName}.parcels`);
        return rows;
      }
    } catch (error) {
      console.warn(`[dbSmart] ${schemaName}.parcels unavailable`, error);
    }
  }
  return fetchPublicParcels();
}

export async function upsertParcelSmart(parcel: Parcel): Promise<void> {
  try {
    await upsertPublicParcel(parcel);
  } catch (error) {
    console.warn('[dbSmart] public parcel save failed', error);
    throw error;
  }
}

export async function deleteParcelSmart(parcelId: string): Promise<void> {
  return deletePublicParcel(parcelId);
}

export async function fetchSettingsSmart(): Promise<FarmSettings | null> {
  for (const schemaName of SCHEMA_CANDIDATES) {
    try {
      const { data, error } = await supabase
        .schema(schemaName)
        .from('farm_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        return {
          farm_name: data.farm_name || 'DonaAnna',
          farm_address: data.farm_address || 'Biar, Alicante, Spain',
          farm_lat: data.farm_lat || data.lat || '38.6294',
          farm_lon: data.farm_lon || data.lon || '-0.7667',
          language: data.language || 'no',
          currency: data.currency || 'EUR',
        };
      }
    } catch (error) {
      console.warn(`[dbSmart] ${schemaName}.farm_settings unavailable`, error);
    }
  }
  return fetchPublicSettings();
}

export async function saveSettingsSmart(settings: FarmSettings): Promise<void> {
  return savePublicSettings(settings);
}
