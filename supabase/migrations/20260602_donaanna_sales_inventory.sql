-- DonaAnna sales and inventory schema
-- Purpose: store products, customers, orders and order lines permanently in Supabase.
-- Run in Supabase SQL editor or through Supabase CLI migrations.

create extension if not exists pgcrypto;

create table if not exists public.donaanna_products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  type text not null check (type in ('evoo_250', 'evoo_500', 'evoo_750', 'table_olives', 'gift_pack')),
  batch_code text,
  qr_slug text,
  unit_size text not null,
  units_in_stock integer not null default 0,
  reserved_units integer not null default 0,
  unit_cost_eur numeric not null default 0,
  retail_price_eur numeric not null default 0,
  wholesale_price_eur numeric not null default 0,
  reorder_level integer not null default 0,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.donaanna_customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'private' check (type in ('private', 'restaurant', 'shop', 'distributor', 'market')),
  contact text,
  email text,
  phone text,
  city text,
  country text default 'Spain',
  tax_id text,
  billing_address text,
  shipping_address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.donaanna_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  customer_id uuid references public.donaanna_customers(id) on delete set null,
  customer_name text not null,
  channel text not null default 'market' check (channel in ('market', 'b2b', 'online', 'restaurant', 'farm_direct', 'event')),
  status text not null default 'draft' check (status in ('draft', 'confirmed', 'delivered', 'paid', 'cancelled')),
  order_date date not null default current_date,
  subtotal_eur numeric not null default 0,
  paid_amount_eur numeric not null default 0,
  payment_method text,
  delivery_method text,
  delivery_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.donaanna_order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.donaanna_orders(id) on delete cascade,
  product_id uuid references public.donaanna_products(id) on delete set null,
  product_sku text,
  product_name text not null,
  batch_code text,
  quantity integer not null check (quantity > 0),
  unit_price_eur numeric not null default 0,
  unit_cost_eur numeric not null default 0,
  line_total_eur numeric generated always as (quantity * unit_price_eur) stored,
  gross_margin_eur numeric generated always as (quantity * (unit_price_eur - unit_cost_eur)) stored,
  created_at timestamptz not null default now()
);

create index if not exists idx_donaanna_products_sku on public.donaanna_products (sku);
create index if not exists idx_donaanna_products_batch_code on public.donaanna_products (batch_code);
create index if not exists idx_donaanna_customers_type on public.donaanna_customers (type);
create index if not exists idx_donaanna_orders_order_date on public.donaanna_orders (order_date desc);
create index if not exists idx_donaanna_orders_status on public.donaanna_orders (status);
create index if not exists idx_donaanna_order_lines_order_id on public.donaanna_order_lines (order_id);
create index if not exists idx_donaanna_order_lines_product_id on public.donaanna_order_lines (product_id);

create or replace function public.set_donaanna_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_donaanna_products_updated_at on public.donaanna_products;
create trigger trg_donaanna_products_updated_at
before update on public.donaanna_products
for each row execute function public.set_donaanna_updated_at();

drop trigger if exists trg_donaanna_customers_updated_at on public.donaanna_customers;
create trigger trg_donaanna_customers_updated_at
before update on public.donaanna_customers
for each row execute function public.set_donaanna_updated_at();

drop trigger if exists trg_donaanna_orders_updated_at on public.donaanna_orders;
create trigger trg_donaanna_orders_updated_at
before update on public.donaanna_orders
for each row execute function public.set_donaanna_updated_at();

create or replace function public.recalculate_donaanna_order_totals(target_order_id uuid)
returns void
language plpgsql
as $$
begin
  update public.donaanna_orders
  set subtotal_eur = coalesce((
    select sum(line_total_eur)
    from public.donaanna_order_lines
    where order_id = target_order_id
  ), 0)
  where id = target_order_id;
end;
$$;

create or replace function public.recalculate_donaanna_order_totals_trigger()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_donaanna_order_totals(old.order_id);
    return old;
  end if;
  perform public.recalculate_donaanna_order_totals(new.order_id);
  return new;
end;
$$;

drop trigger if exists trg_donaanna_order_lines_totals_insert on public.donaanna_order_lines;
create trigger trg_donaanna_order_lines_totals_insert
after insert or update on public.donaanna_order_lines
for each row execute function public.recalculate_donaanna_order_totals_trigger();

drop trigger if exists trg_donaanna_order_lines_totals_delete on public.donaanna_order_lines;
create trigger trg_donaanna_order_lines_totals_delete
after delete on public.donaanna_order_lines
for each row execute function public.recalculate_donaanna_order_totals_trigger();

alter table public.donaanna_products enable row level security;
alter table public.donaanna_customers enable row level security;
alter table public.donaanna_orders enable row level security;
alter table public.donaanna_order_lines enable row level security;

-- These are internal business tables. Authenticated users can manage them.
-- Tighten later to owner/admin roles if the app adds multi-tenant accounts.
drop policy if exists "Authenticated can manage DonaAnna products" on public.donaanna_products;
create policy "Authenticated can manage DonaAnna products"
on public.donaanna_products
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated can manage DonaAnna customers" on public.donaanna_customers;
create policy "Authenticated can manage DonaAnna customers"
on public.donaanna_customers
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated can manage DonaAnna orders" on public.donaanna_orders;
create policy "Authenticated can manage DonaAnna orders"
on public.donaanna_orders
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated can manage DonaAnna order lines" on public.donaanna_order_lines;
create policy "Authenticated can manage DonaAnna order lines"
on public.donaanna_order_lines
for all
to authenticated
using (true)
with check (true);

insert into public.donaanna_products (
  sku, name, type, batch_code, qr_slug, unit_size,
  units_in_stock, reserved_units, unit_cost_eur, retail_price_eur, wholesale_price_eur, reorder_level, notes
) values
  ('DA-EVOO-500-2026', 'DonaAnna EVOO 500 ml', 'evoo_500', 'DA-BIAR-2026-EVOO-001', 'da-biar-2026-evoo-001', '500 ml', 720, 80, 4.20, 16.90, 9.50, 120, 'Demo product for olive oil sales.'),
  ('DA-GORDAL-350-2026', 'DonaAnna Gordal bordoliven 350 g', 'table_olives', 'DA-BIAR-2026-TABLE-GORDAL-001', 'da-biar-2026-table-gordal-001', '350 g', 310, 30, 2.10, 8.90, 5.20, 75, 'Demo product for table olives.')
on conflict (sku) do nothing;

insert into public.donaanna_customers (name, type, city, notes) values
  ('Marked / direkte salg', 'market', 'Alicante', 'Kontant/terminal ved marked og event.'),
  ('Restaurant lead', 'restaurant', 'Costa Blanca', 'Potensiell B2B-kunde for olje og bordoliven.'),
  ('Delikatessebutikk lead', 'shop', 'Benidorm/Altea', 'Mulig kommisjon eller grossistpris.')
on conflict do nothing;
