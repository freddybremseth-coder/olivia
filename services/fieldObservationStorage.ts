import { supabase, isSupabaseConfigured } from './supabaseClient';

export const FIELD_OBSERVATION_IMAGE_BUCKET = 'olivia-field-observations';

function fileExtension(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName) return fromName.replace(/[^a-z0-9]/g, '') || 'jpg';
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/heic') return 'heic';
  if (file.type === 'image/heif') return 'heif';
  return 'jpg';
}

function safePart(value?: string): string {
  return (value || 'whole-farm')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'whole-farm';
}

export async function uploadFieldObservationImages(files: File[], context?: { parcelId?: string; observationId?: string }): Promise<string[]> {
  if (!files.length) return [];
  if (!isSupabaseConfigured) throw new Error('Supabase er ikke konfigurert. Kan ikke laste opp bilder permanent.');

  const uploadedUrls: string[] = [];
  const dateFolder = new Date().toISOString().slice(0, 10);
  const parcelFolder = safePart(context?.parcelId);
  const observationFolder = safePart(context?.observationId || `obs-${Date.now()}`);

  for (const file of files) {
    const ext = fileExtension(file);
    const randomPart = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const path = `${dateFolder}/${parcelFolder}/${observationFolder}/${randomPart}.${ext}`;

    const { error } = await supabase.storage
      .from(FIELD_OBSERVATION_IMAGE_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        contentType: file.type || 'image/jpeg',
        upsert: false,
      });

    if (error) {
      const message = /bucket/i.test(error.message)
        ? `Storage bucket mangler. Kjør migrasjonen supabase/migrations/20260603_olivia_field_observation_storage.sql i Supabase SQL Editor.`
        : error.message;
      throw new Error(`Bildeopplasting feilet: ${message}`);
    }

    const { data } = supabase.storage.from(FIELD_OBSERVATION_IMAGE_BUCKET).getPublicUrl(path);
    if (data.publicUrl) uploadedUrls.push(data.publicUrl);
  }

  return uploadedUrls;
}
