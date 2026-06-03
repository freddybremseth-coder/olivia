import { supabase } from './supabaseClient';

export type KnowledgeCategory =
  | 'olive_variety'
  | 'disease'
  | 'pest'
  | 'soil'
  | 'water'
  | 'irrigation'
  | 'pruning'
  | 'regenerative'
  | 'table_olives'
  | 'olive_oil'
  | 'organic_certification'
  | 'farm_operations'
  | 'local_biar'
  | 'sop'
  | 'general';

export interface KnowledgeSource {
  id: string;
  title: string;
  source_type: 'manual' | 'book' | 'research' | 'web' | 'local_expert' | 'farm_observation' | 'sop' | 'other';
  author?: string;
  url?: string;
  language?: string;
  reliability_score: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface KnowledgeChunk {
  id: string;
  source_id?: string;
  title: string;
  category: KnowledgeCategory;
  tags: string[];
  content: string;
  summary?: string;
  applies_to_varieties: string[];
  applies_to_season: string[];
  language?: string;
  reliability_score: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface OliveVarietyProfile {
  id: string;
  name: string;
  synonyms: string[];
  primary_use: 'oil' | 'table' | 'dual' | 'unknown';
  origin_region?: string;
  local_relevance?: string;
  tree_habit?: string;
  vigor?: string;
  leaf_traits?: string;
  fruit_traits?: string;
  stone_traits?: string;
  oil_traits?: string;
  table_traits?: string;
  harvest_window?: string;
  agronomy_notes?: string;
  disease_notes?: string;
  identification_tips?: string;
  confusion_risks?: string;
  required_photos: string[];
  confidence_rules?: Record<string, unknown>;
  source_ids: string[];
  is_verified: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AiFieldFeedback {
  id?: string;
  module: 'field_consultant' | 'pruning_advisor' | 'variety_identification' | 'other';
  parcel_id?: string;
  observation_id?: string;
  predicted_variety?: string;
  confirmed_variety?: string;
  confidence_percent?: number;
  was_correct?: boolean;
  feedback_notes?: string;
  image_context?: Record<string, unknown>;
}

function handleError(label: string, error: any): never {
  console.error(`[oliviaKnowledge] ${label}`, error);
  const code = error?.code || '';
  const message = error?.message || String(error || '');
  if (code === '42P01' || /relation .* does not exist/i.test(message)) {
    throw new Error('Kunnskapsbase-tabellene mangler. Kjør supabase/migrations/20260603_olivia_knowledge_base.sql i Supabase SQL Editor.');
  }
  if (code === '42501' || /permission denied|rls/i.test(message)) {
    throw new Error('Tilgang nektet av Supabase RLS for kunnskapsbase-tabellene.');
  }
  throw new Error(message || 'Kunnskapsbase-operasjon feilet.');
}

export async function fetchKnowledgeSources(): Promise<KnowledgeSource[]> {
  const { data, error } = await supabase
    .from('knowledge_sources')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) handleError('fetchKnowledgeSources', error);
  return (data || []) as KnowledgeSource[];
}

export async function upsertKnowledgeSource(source: KnowledgeSource): Promise<KnowledgeSource> {
  const { data, error } = await supabase
    .from('knowledge_sources')
    .upsert(source, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) handleError('upsertKnowledgeSource', error);
  return data as KnowledgeSource;
}

export async function fetchKnowledgeChunks(category?: KnowledgeCategory, search?: string, limit = 50): Promise<KnowledgeChunk[]> {
  let query = supabase
    .from('knowledge_chunks')
    .select('*')
    .eq('is_active', true)
    .order('reliability_score', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (category) query = query.eq('category', category);
  if (search?.trim()) query = query.or(`title.ilike.%${search.trim()}%,content.ilike.%${search.trim()}%,summary.ilike.%${search.trim()}%`);

  const { data, error } = await query;
  if (error) handleError('fetchKnowledgeChunks', error);
  return (data || []) as KnowledgeChunk[];
}

export async function upsertKnowledgeChunk(chunk: KnowledgeChunk): Promise<KnowledgeChunk> {
  const { data, error } = await supabase
    .from('knowledge_chunks')
    .upsert(chunk, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) handleError('upsertKnowledgeChunk', error);
  return data as KnowledgeChunk;
}

export async function fetchOliveVarietyProfiles(search?: string): Promise<OliveVarietyProfile[]> {
  let query = supabase
    .from('olive_variety_profiles')
    .select('*')
    .eq('is_active', true)
    .order('is_verified', { ascending: false })
    .order('name', { ascending: true });

  if (search?.trim()) {
    const q = search.trim();
    query = query.or(`name.ilike.%${q}%,local_relevance.ilike.%${q}%,identification_tips.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) handleError('fetchOliveVarietyProfiles', error);
  return (data || []) as OliveVarietyProfile[];
}

export async function upsertOliveVarietyProfile(profile: OliveVarietyProfile): Promise<OliveVarietyProfile> {
  const { data, error } = await supabase
    .from('olive_variety_profiles')
    .upsert(profile, { onConflict: 'name' })
    .select('*')
    .single();
  if (error) handleError('upsertOliveVarietyProfile', error);
  return data as OliveVarietyProfile;
}

export async function insertAiFieldFeedback(feedback: AiFieldFeedback): Promise<void> {
  const { error } = await supabase
    .from('ai_field_feedback')
    .insert({
      module: feedback.module,
      parcel_id: feedback.parcel_id ?? null,
      observation_id: feedback.observation_id ?? null,
      predicted_variety: feedback.predicted_variety ?? null,
      confirmed_variety: feedback.confirmed_variety ?? null,
      confidence_percent: feedback.confidence_percent ?? null,
      was_correct: feedback.was_correct ?? null,
      feedback_notes: feedback.feedback_notes ?? null,
      image_context: feedback.image_context ?? {},
    });
  if (error) handleError('insertAiFieldFeedback', error);
}

export async function buildKnowledgePromptContext(options: {
  parcelVariety?: string;
  suspectedVarieties?: string[];
  categories?: KnowledgeCategory[];
  maxChunks?: number;
} = {}): Promise<string> {
  const suspected = new Set<string>();
  if (options.parcelVariety) suspected.add(options.parcelVariety);
  (options.suspectedVarieties || []).forEach(v => suspected.add(v));

  const [profiles, chunks] = await Promise.all([
    fetchOliveVarietyProfiles(),
    Promise.all((options.categories || ['olive_variety', 'pruning', 'disease', 'irrigation', 'regenerative', 'local_biar']).map(category => fetchKnowledgeChunks(category, undefined, options.maxChunks || 8))).then(groups => groups.flat()),
  ]);

  const suspectedLower = Array.from(suspected).map(v => v.toLowerCase());
  const relevantProfiles = profiles.filter(profile => {
    if (!suspectedLower.length) return true;
    const names = [profile.name, ...(profile.synonyms || [])].map(v => v.toLowerCase());
    return names.some(name => suspectedLower.some(s => name.includes(s) || s.includes(name)));
  }).slice(0, suspectedLower.length ? 8 : 12);

  const profileText = relevantProfiles.map(profile => [
    `SORT: ${profile.name}`,
    `Synonymer: ${(profile.synonyms || []).join(', ') || 'ingen'}`,
    `Bruk: ${profile.primary_use}`,
    profile.local_relevance ? `Lokal relevans: ${profile.local_relevance}` : '',
    profile.leaf_traits ? `Blad: ${profile.leaf_traits}` : '',
    profile.fruit_traits ? `Frukt: ${profile.fruit_traits}` : '',
    profile.stone_traits ? `Stein/kjerne: ${profile.stone_traits}` : '',
    profile.identification_tips ? `Identifikasjon: ${profile.identification_tips}` : '',
    profile.confusion_risks ? `Forvekslingsrisiko: ${profile.confusion_risks}` : '',
    `Krevde bilder: ${(profile.required_photos || []).join(', ')}`,
    `Verifisert: ${profile.is_verified ? 'ja' : 'nei'}`,
  ].filter(Boolean).join('\n')).join('\n\n');

  const chunkText = chunks
    .filter(chunk => chunk.is_active)
    .slice(0, options.maxChunks || 20)
    .map(chunk => `KUNNSKAP: ${chunk.title}\nKategori: ${chunk.category}\nPålitelighet: ${chunk.reliability_score}/5\n${chunk.summary || chunk.content.slice(0, 900)}`)
    .join('\n\n');

  return [
    'OLIVIA KUNNSKAPSBASE - bruk dette som støtte, men vær ærlig om usikkerhet.',
    profileText || 'Ingen sortprofiler funnet.',
    chunkText || 'Ingen ekstra kunnskapsbiter funnet.',
    'Regel: Ikke identifiser sort sikkert kun fra heltrebilde. Oppgi sannsynlighet og manglende bildegrunnlag.',
  ].join('\n\n---\n\n');
}
