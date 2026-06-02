-- DonaAnna commerce / B2B portal tables
-- Run this in Supabase SQL editor if the app reports:
-- Could not find the table 'public.commerce_customers' in the schema cache

create table if not exists public.commerce_customers (
  id text primary key,
  profile_id text,
  company text not null default '',
  contact_name text not null default '',
  email text not null default '',
  phone text,
  customer_type text not null default 'b2b_customer',
  price_tier text not null default 'b2b',
  payment_terms text not null default 'card',
  billing_address text,
  shipping_address text,
  tax_id text,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.commerce_orders (
  id text primary key,
  order_number text not null,
  customer_id text references public.commerce_customers(id) on delete set null,
  status text not null default 'Mottatt',
  payment_status text not null default 'Avventer',
  total_amount numeric not null default 0,
  currency text not null default 'EUR',
  shipping_address text,
  billing_address text,
  notes text,
  ordered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.commerce_order_items (
  id text primary key,
  order_id text references public.commerce_orders(id) on delete cascade,
  product_id text,
  name text not null,
  sku text,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  total_price numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.commerce_invoices (
  id text primary key,
  invoice_number text not null,
  order_id text references public.commerce_orders(id) on delete set null,
  customer_id text references public.commerce_customers(id) on delete set null,
  status text not null default 'Utkast',
  total_amount numeric not null default 0,
  currency text not null default 'EUR',
  due_date date,
  paid_date date,
  pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.commerce_shipments (
  id text primary key,
  order_id text references public.commerce_orders(id) on delete set null,
  customer_id text references public.commerce_customers(id) on delete set null,
  carrier text,
  tracking_number text,
  status text not null default 'Planlagt',
  tracking_url text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.commerce_messages (
  id text primary key,
  customer_id text references public.commerce_customers(id) on delete set null,
  profile_id text,
  subject text not null,
  body text not null,
  status text not null default 'Ny',
  direction text not null default 'customer_to_admin',
  created_at timestamptz not null default now()
);

create index if not exists idx_commerce_customers_profile_id on public.commerce_customers(profile_id);
create index if not exists idx_commerce_orders_customer_id on public.commerce_orders(customer_id);
create index if not exists idx_commerce_order_items_order_id on public.commerce_order_items(order_id);
create index if not exists idx_commerce_invoices_customer_id on public.commerce_invoices(customer_id);
create index if not exists idx_commerce_shipments_customer_id on public.commerce_shipments(customer_id);
create index if not exists idx_commerce_messages_customer_id on public.commerce_messages(customer_id);
