-- Olivia / Dona Anna Knowledge Base
-- Structured expert knowledge for olive varieties, agronomy, regenerative practices and farm operations.

create extension if not exists "pgcrypto";
create schema if not exists olivia;

create table if not exists olivia.knowledge_sources (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  source_type text not null default 'manual' check (source_type in ('manual', 'book', 'research', 'web', 'local_expert', 'farm_observation', 'sop', 'other')),
  author text,
  url text,
  language text default 'no',
  reliability_score integer not null default 3 check (reliability_score between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists olivia.knowledge_chunks (
  id text primary key default gen_random_uuid()::text,
  source_id text references olivia.knowledge_sources(id) on delete set null,
  title text not null,
  category text not null default 'general' check (category in ('olive_variety', 'disease', 'pest', 'soil', 'water', 'irrigation', 'pruning', 'regenerative', 'table_olives', 'olive_oil', 'organic_certification', 'farm_operations', 'local_biar', 'sop', 'general')),
  tags text[] not null default '{}',
  content text not null,
  summary text,
  applies_to_varieties text[] not null default '{}',
  applies_to_season text[] not null default '{}',
  language text default 'no',
  reliability_score integer not null default 3 check (reliability_score between 1 and 5),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists olivia.olive_variety_profiles (
  id text primary key default gen_random_uuid()::text,
  name text not null unique,
  synonyms text[] not null default '{}',
  primary_use text not null default 'unknown' check (primary_use in ('oil', 'table', 'dual', 'unknown')),
  origin_region text,
  local_relevance text,
  tree_habit text,
  vigor text,
  leaf_traits text,
  fruit_traits text,
  stone_traits text,
  oil_traits text,
  table_traits text,
  harvest_window text,
  agronomy_notes text,
  disease_notes text,
  identification_tips text,
  confusion_risks text,
  required_photos text[] not null default array['heltre', 'blad overside', 'blad underside', 'frukt med skala', 'stein/kjerne hvis mulig'],
  confidence_rules jsonb not null default '{}'::jsonb,
  source_ids text[] not null default '{}',
  is_verified boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists olivia.ai_field_feedback (
  id text primary key default gen_random_uuid()::text,
  module text not null check (module in ('field_consultant', 'pruning_advisor', 'variety_identification', 'other')),
  parcel_id text,
  observation_id text,
  predicted_variety text,
  confirmed_variety text,
  confidence_percent numeric,
  was_correct boolean,
  feedback_notes text,
  image_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists knowledge_sources_type_idx on olivia.knowledge_sources(source_type);
create index if not exists knowledge_chunks_category_idx on olivia.knowledge_chunks(category);
create index if not exists knowledge_chunks_tags_idx on olivia.knowledge_chunks using gin(tags);
create index if not exists knowledge_chunks_varieties_idx on olivia.knowledge_chunks using gin(applies_to_varieties);
create index if not exists olive_variety_profiles_name_idx on olivia.olive_variety_profiles(name);
create index if not exists olive_variety_profiles_synonyms_idx on olivia.olive_variety_profiles using gin(synonyms);
create index if not exists olive_variety_profiles_primary_use_idx on olivia.olive_variety_profiles(primary_use);
create index if not exists ai_field_feedback_module_idx on olivia.ai_field_feedback(module);
create index if not exists ai_field_feedback_confirmed_variety_idx on olivia.ai_field_feedback(confirmed_variety);

alter table olivia.knowledge_sources enable row level security;
alter table olivia.knowledge_chunks enable row level security;
alter table olivia.olive_variety_profiles enable row level security;
alter table olivia.ai_field_feedback enable row level security;

create or replace function olivia.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_knowledge_sources_updated_at on olivia.knowledge_sources;
create trigger set_knowledge_sources_updated_at before update on olivia.knowledge_sources for each row execute function olivia.set_updated_at();

drop trigger if exists set_knowledge_chunks_updated_at on olivia.knowledge_chunks;
create trigger set_knowledge_chunks_updated_at before update on olivia.knowledge_chunks for each row execute function olivia.set_updated_at();

drop trigger if exists set_olive_variety_profiles_updated_at on olivia.olive_variety_profiles;
create trigger set_olive_variety_profiles_updated_at before update on olivia.olive_variety_profiles for each row execute function olivia.set_updated_at();

do $$
declare
  t text;
begin
  foreach t in array array[
    'knowledge_sources',
    'knowledge_chunks',
    'olive_variety_profiles',
    'ai_field_feedback'
  ] loop
    execute format('drop policy if exists "Allow authenticated read %I" on olivia.%I', t, t);
    execute format('create policy "Allow authenticated read %I" on olivia.%I for select to authenticated using (true)', t, t);
    execute format('drop policy if exists "Allow authenticated write %I" on olivia.%I', t, t);
    execute format('create policy "Allow authenticated write %I" on olivia.%I for all to authenticated using (true) with check (true)', t, t);
  end loop;
end $$;

insert into olivia.knowledge_sources (id, title, source_type, language, reliability_score, notes)
values
  ('kb-seed-local-olivia', 'Olivia local farm knowledge seed', 'manual', 'no', 3, 'Initial editable knowledge records. Replace or verify with farm-specific and expert-reviewed data.')
on conflict (id) do update set updated_at = now();

insert into olivia.olive_variety_profiles (
  name,
  synonyms,
  primary_use,
  local_relevance,
  identification_tips,
  required_photos,
  source_ids,
  is_verified
) values
  (
    'Picual',
    array['Picual'],
    'oil',
    'Legg inn lokal relevans for Biar-parseller når sort er bekreftet.',
    'Ikke identifiser som Picual bare fra heltrebilde. Krev frukt, blad og helst stein/kjerne eller sikker parsellhistorikk.',
    array['heltre', 'blad overside', 'blad underside', 'frukt med skala', 'stein/kjerne hvis mulig'],
    array['kb-seed-local-olivia'],
    false
  ),
  (
    'Gordal Sevillana',
    array['Gordal', 'Gordal Sevillana', 'Sevillana'],
    'table',
    'Relevant for bordoliven-vurdering dersom sort finnes på gården.',
    'Stor frukt kan peke mot bordoliven-sort, men krev frukt med skala og lokal bekreftelse før sikker konklusjon.',
    array['heltre', 'blad overside', 'blad underside', 'frukt med skala', 'stein/kjerne hvis mulig'],
    array['kb-seed-local-olivia'],
    false
  ),
  (
    'Genovesa',
    array['Genoesa', 'Genovesa'],
    'unknown',
    'Navn må verifiseres lokalt. Kan være lokal betegnelse, synonym eller feilstaving.',
    'Bruk denne profilen forsiktig inntil sorten er bekreftet av lokal ekspert eller dokumentasjon.',
    array['heltre', 'blad overside', 'blad underside', 'frukt med skala', 'stein/kjerne hvis mulig', 'lokal ekspertbekreftelse'],
    array['kb-seed-local-olivia'],
    false
  )
on conflict (name) do nothing;
