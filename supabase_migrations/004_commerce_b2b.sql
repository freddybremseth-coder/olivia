-- Doña Anna Commerce / B2B schema
-- Run after supabase_schema.sql when you are ready to connect the public site,
-- Olivia OS, Admin and B2B/customer portal to the same commerce data.

create table if not exists commerce_products (
  id                 text primary key,
  sku                text unique not null,
  name               text not null,
  description        text default '',
  category           text default 'EVOO',
  olive_variety      text,
  size               text,
  channel            text default 'retail',
  harvest_year       integer,
  batch_id           text references batches(id) on delete set null,
  price_retail       numeric not null default 0,
  price_b2b          numeric,
  cost               numeric,
  stock              integer not null default 0,
  polyphenol_content numeric,
  acidity            numeric,
  image_url          text,
  status             text not null default 'draft',
  public_story       text default '',
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create table if not exists commerce_customers (
  id               text primary key,
  profile_id       uuid references user_profiles(id) on delete set null,
  company          text,
  contact_name     text not null,
  email            text not null,
  phone            text,
  customer_type    text not null default 'retail',
  price_tier       text not null default 'retail',
  payment_terms    text default 'card',
  billing_address  text,
  shipping_address text,
  tax_id           text,
  status           text not null default 'lead',
  notes            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create table if not exists commerce_orders (
  id               text primary key,
  order_number     text unique not null,
  customer_id      text references commerce_customers(id) on delete set null,
  order_type       text not null default 'order',
  status           text not null default 'draft',
  payment_status   text not null default 'pending',
  subtotal         numeric not null default 0,
  tax_amount       numeric not null default 0,
  shipping_cost    numeric not null default 0,
  discount_amount  numeric not null default 0,
  total_amount     numeric not null default 0,
  currency         text not null default 'EUR',
  shipping_address text,
  billing_address  text,
  notes            text,
  ordered_at       timestamptz default now(),
  shipped_at       timestamptz,
  delivered_at     timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create table if not exists commerce_order_items (
  id          text primary key,
  order_id    text not null references commerce_orders(id) on delete cascade,
  product_id  text references commerce_products(id) on delete set null,
  batch_id    text references batches(id) on delete set null,
  name        text not null,
  sku         text,
  quantity    integer not null default 1,
  unit_price  numeric not null default 0,
  tax_rate    numeric not null default 0,
  total_price numeric not null default 0,
  created_at  timestamptz default now()
);

create table if not exists commerce_invoices (
  id             text primary key,
  invoice_number text unique not null,
  order_id       text references commerce_orders(id) on delete set null,
  customer_id    text references commerce_customers(id) on delete set null,
  status         text not null default 'draft',
  amount         numeric not null default 0,
  tax_amount     numeric not null default 0,
  total_amount   numeric not null default 0,
  currency       text not null default 'EUR',
  due_date       text,
  paid_date      text,
  payment_method text,
  reference      text,
  pdf_url        text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create table if not exists commerce_content_templates (
  id            text primary key,
  name          text not null,
  template_type text not null,
  subject       text,
  body          text not null default '',
  locale        text not null default 'no',
  channel       text not null default 'email',
  status        text not null default 'draft',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table commerce_products          enable row level security;
alter table commerce_customers         enable row level security;
alter table commerce_orders            enable row level security;
alter table commerce_order_items       enable row level security;
alter table commerce_invoices          enable row level security;
alter table commerce_content_templates enable row level security;

drop policy if exists "allow all commerce_products"          on commerce_products;
drop policy if exists "allow all commerce_customers"         on commerce_customers;
drop policy if exists "allow all commerce_orders"            on commerce_orders;
drop policy if exists "allow all commerce_order_items"       on commerce_order_items;
drop policy if exists "allow all commerce_invoices"          on commerce_invoices;
drop policy if exists "allow all commerce_content_templates" on commerce_content_templates;

create policy "allow all commerce_products"          on commerce_products          for all using (true) with check (true);
create policy "allow all commerce_customers"         on commerce_customers         for all using (true) with check (true);
create policy "allow all commerce_orders"            on commerce_orders            for all using (true) with check (true);
create policy "allow all commerce_order_items"       on commerce_order_items       for all using (true) with check (true);
create policy "allow all commerce_invoices"          on commerce_invoices          for all using (true) with check (true);
create policy "allow all commerce_content_templates" on commerce_content_templates for all using (true) with check (true);

drop trigger if exists commerce_products_set_updated_at on commerce_products;
create trigger commerce_products_set_updated_at before update on commerce_products
  for each row execute function set_updated_at();

drop trigger if exists commerce_customers_set_updated_at on commerce_customers;
create trigger commerce_customers_set_updated_at before update on commerce_customers
  for each row execute function set_updated_at();

drop trigger if exists commerce_orders_set_updated_at on commerce_orders;
create trigger commerce_orders_set_updated_at before update on commerce_orders
  for each row execute function set_updated_at();

drop trigger if exists commerce_invoices_set_updated_at on commerce_invoices;
create trigger commerce_invoices_set_updated_at before update on commerce_invoices
  for each row execute function set_updated_at();

drop trigger if exists commerce_content_templates_set_updated_at on commerce_content_templates;
create trigger commerce_content_templates_set_updated_at before update on commerce_content_templates
  for each row execute function set_updated_at();
