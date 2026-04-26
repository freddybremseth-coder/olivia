export interface PublicEstateSignal {
  isLive: boolean;
  parcelCount: number;
  treeCount: number;
  activeBatches: number;
  latestHarvestDate?: string;
  nextTask?: string;
  heroMetric: string;
}

const hasPublicSupabaseConfig = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY &&
  String(import.meta.env.VITE_SUPABASE_URL).startsWith('http')
);

export async function fetchPublicEstateSignal(): Promise<PublicEstateSignal> {
  const fallback: PublicEstateSignal = {
    isLive: false,
    parcelCount: 2,
    treeCount: 570,
    activeBatches: 0,
    latestHarvestDate: 'Oktober-november',
    nextTask: 'Sensorisk evaluering og batch-dokumentasjon',
    heroMetric: 'Biar, Alicante',
  };

  if (!hasPublicSupabaseConfig) return fallback;

  try {
    const { fetchBatches, fetchParcels, fetchTasks } = await import('./db');
    const [parcels, batches, tasks] = await Promise.all([
      fetchParcels(),
      fetchBatches(),
      fetchTasks(),
    ]);

    if (!parcels.length && !batches.length && !tasks.length) return fallback;

    const latestBatch = [...batches].sort((a, b) =>
      new Date(b.harvestDate).getTime() - new Date(a.harvestDate).getTime()
    )[0];
    const openTask = tasks.find(task => task.status !== 'DONE');
    const treeCount = parcels.reduce((sum, parcel) => sum + (parcel.treeCount ?? 0), 0);

    return {
      isLive: true,
      parcelCount: parcels.length || fallback.parcelCount,
      treeCount: treeCount || fallback.treeCount,
      activeBatches: batches.filter(batch => batch.status === 'ACTIVE').length,
      latestHarvestDate: latestBatch?.harvestDate ?? fallback.latestHarvestDate,
      nextTask: openTask?.title ?? fallback.nextTask,
      heroMetric: parcels[0]?.municipality || parcels[0]?.name || fallback.heroMetric,
    };
  } catch (error) {
    console.warn('[DonaAnna] Kunne ikke hente live gårdsdata', error);
    return fallback;
  }
}
