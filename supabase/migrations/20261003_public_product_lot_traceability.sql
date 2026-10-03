-- Public, privacy-safe snapshot for finished-product QR traceability.
create table if not exists public.public_trace_lots (
  id uuid primary key default gen_random_uuid(),
  lot_id text not null unique,
  lot_code text not null,
  qr_slug text not null unique,
  status text not null default 'draft',
  product_id text not null,
  product_name text not null,
  product_sku text not null,
  product_size text null,
  product_category text null,
  product_description text null,
  product_image_url text null,
  product_story text null,
  packed_at timestamptz null,
  best_before date null,
  initial_units numeric null,
  source_batches jsonb not null default '[]'::jsonb,
  trace_summary jsonb not null default '{}'::jsonb,
  published_at timestamptz null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.public_trace_lots enable row level security;

drop policy if exists "Public can read published trace lots" on public.public_trace_lots;
create policy "Public can read published trace lots" on public.public_trace_lots
for select to anon, authenticated using (status='published');

drop policy if exists "Authenticated can insert own trace lots" on public.public_trace_lots;
create policy "Authenticated can insert own trace lots" on public.public_trace_lots
for insert to authenticated with check (created_by=auth.uid());

drop policy if exists "Authenticated can update own trace lots" on public.public_trace_lots;
create policy "Authenticated can update own trace lots" on public.public_trace_lots
for update to authenticated using (created_by=auth.uid()) with check (created_by=auth.uid());

drop policy if exists "Authenticated can delete own trace lots" on public.public_trace_lots;
create policy "Authenticated can delete own trace lots" on public.public_trace_lots
for delete to authenticated using (created_by=auth.uid());

grant select on public.public_trace_lots to anon, authenticated;
grant insert,update,delete on public.public_trace_lots to authenticated;

create index if not exists public_trace_lots_qr_slug_idx on public.public_trace_lots(qr_slug);
create index if not exists public_trace_lots_product_id_idx on public.public_trace_lots(product_id);

-- Old seeded demo trace must never appear as a real public product.
update public.public_trace_batches
set status='archived', updated_at=now()
where qr_slug='da-biar-2026-evoo-001'
  and (lot_notes ilike '%demo%' or harvest_date > current_date);
