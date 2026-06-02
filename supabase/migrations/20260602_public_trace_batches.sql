-- DonaAnna public traceability schema
-- Purpose: publish selected product batches for public QR pages without exposing internal farm data.
-- Run in Supabase SQL editor or through Supabase CLI migrations.

create extension if not exists pgcrypto;

create table if not exists public.public_trace_batches (
  id uuid primary key default gen_random_uuid(),
  batch_code text not null unique,
  qr_slug text not null unique,
  type text not null check (type in ('evoo', 'table_olives', 'raw_olives')),
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  product_status text default 'quality_checked',
  harvest_date date,
  parcel_id text,
  zone_id text,
  variety text not null,
  altitude_m integer default 650,
  kg_harvested numeric,
  kg_processed numeric,
  liters_oil numeric,
  yield_percent numeric,
  acidity_percent numeric,
  peroxide_value numeric,
  polyphenols_mg_kg numeric,
  sensory_profile text,
  processing_location text,
  lot_notes text,
  public_story text,
  hero_image_url text,
  gallery_urls text[] default '{}',
  lab_report_url text,
  organic_note text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_public_trace_batches_qr_slug on public.public_trace_batches (qr_slug);
create index if not exists idx_public_trace_batches_status on public.public_trace_batches (status);
create index if not exists idx_public_trace_batches_harvest_date on public.public_trace_batches (harvest_date desc);

create or replace function public.set_public_trace_batches_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if new.status = 'published' and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_public_trace_batches_updated_at on public.public_trace_batches;
create trigger trg_public_trace_batches_updated_at
before update on public.public_trace_batches
for each row execute function public.set_public_trace_batches_updated_at();

alter table public.public_trace_batches enable row level security;

-- Public QR readers may only see batches that are explicitly published.
drop policy if exists "Public can read published trace batches" on public.public_trace_batches;
create policy "Public can read published trace batches"
on public.public_trace_batches
for select
to anon, authenticated
using (status = 'published');

-- Authenticated users may manage rows. Tighten this later to admin/service-role only if needed.
drop policy if exists "Authenticated can insert trace batches" on public.public_trace_batches;
create policy "Authenticated can insert trace batches"
on public.public_trace_batches
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated can update trace batches" on public.public_trace_batches;
create policy "Authenticated can update trace batches"
on public.public_trace_batches
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated can delete trace batches" on public.public_trace_batches;
create policy "Authenticated can delete trace batches"
on public.public_trace_batches
for delete
to authenticated
using (true);

-- Optional demo row. Safe to keep or remove.
insert into public.public_trace_batches (
  batch_code,
  qr_slug,
  type,
  status,
  product_status,
  harvest_date,
  parcel_id,
  zone_id,
  variety,
  altitude_m,
  kg_harvested,
  kg_processed,
  liters_oil,
  yield_percent,
  acidity_percent,
  peroxide_value,
  polyphenols_mg_kg,
  sensory_profile,
  processing_location,
  lot_notes,
  public_story,
  organic_note,
  published_at
) values (
  'DA-BIAR-2026-EVOO-001',
  'da-biar-2026-evoo-001',
  'evoo',
  'published',
  'quality_checked',
  '2026-11-25',
  'biar-main',
  'zone-b',
  'Changlot Real / Genovesa',
  650,
  5200,
  5100,
  780,
  15.3,
  0.18,
  6.4,
  520,
  'Grønn frukt, urter, medium bitterhet og tydelig pepperfinish.',
  'Cooperativa / ekstern presse',
  'Demo-batch for premium EVOO-sporbarhet.',
  'DonaAnna bygger sporbarhet fra felt til ferdig produkt i Biar, Alicante.',
  'Økologisk status og dokumentasjon bør bekreftes per batch før kommersiell bruk.',
  now()
) on conflict (qr_slug) do nothing;
