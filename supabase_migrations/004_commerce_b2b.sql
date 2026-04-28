-- Doña Anna Commerce / B2B schema
-- Run after supabase_schema.sql when you are ready to connect the public site,
-- Olivia OS, Admin and B2B/customer portal to the same commerce data.

alter table user_profiles add column if not exists company text;
alter table user_profiles add column if not exists phone text;
alter table user_profiles add column if not exists billing_address text;
alter table user_profiles add column if not exists shipping_address text;
alter table user_profiles add column if not exists tax_id text;

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
  collections        text[] not null default '{}',
  price_label        text,
  label_material     text,
  accent_color       text,
  is_public          boolean not null default true,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

alter table commerce_products add column if not exists collections text[] not null default '{}';
alter table commerce_products add column if not exists price_label text;
alter table commerce_products add column if not exists label_material text;
alter table commerce_products add column if not exists accent_color text;
alter table commerce_products add column if not exists is_public boolean not null default true;

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

create table if not exists commerce_shipments (
  id              text primary key,
  order_id        text references commerce_orders(id) on delete set null,
  customer_id     text references commerce_customers(id) on delete set null,
  carrier         text,
  tracking_number text,
  status          text not null default 'pending',
  tracking_url    text,
  shipped_at      timestamptz,
  delivered_at    timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists commerce_messages (
  id          text primary key,
  customer_id text references commerce_customers(id) on delete set null,
  profile_id  uuid references user_profiles(id) on delete set null,
  subject     text not null,
  body        text not null default '',
  status      text not null default 'new',
  direction   text not null default 'customer_to_admin',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
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

create table if not exists b2b_tasting_requests (
  id               uuid primary key default gen_random_uuid(),
  company          text not null,
  contact_role     text,
  email            text not null,
  delivery_address text,
  locale           text not null default 'no',
  source           text not null default 'public_b2b_landing_page',
  status           text not null default 'new',
  notes            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table commerce_products          enable row level security;
alter table commerce_customers         enable row level security;
alter table commerce_orders            enable row level security;
alter table commerce_order_items       enable row level security;
alter table commerce_invoices          enable row level security;
alter table commerce_shipments         enable row level security;
alter table commerce_messages          enable row level security;
alter table commerce_content_templates enable row level security;
alter table b2b_tasting_requests       enable row level security;

drop policy if exists "allow all commerce_products"          on commerce_products;
drop policy if exists "allow all commerce_customers"         on commerce_customers;
drop policy if exists "allow all commerce_orders"            on commerce_orders;
drop policy if exists "allow all commerce_order_items"       on commerce_order_items;
drop policy if exists "allow all commerce_invoices"          on commerce_invoices;
drop policy if exists "allow all commerce_shipments"         on commerce_shipments;
drop policy if exists "allow all commerce_messages"          on commerce_messages;
drop policy if exists "allow all commerce_content_templates" on commerce_content_templates;
drop policy if exists "allow public insert b2b_tasting_requests" on b2b_tasting_requests;
drop policy if exists "allow authenticated read b2b_tasting_requests" on b2b_tasting_requests;

create policy "allow all commerce_products"          on commerce_products          for all using (true) with check (true);
create policy "allow all commerce_customers"         on commerce_customers         for all using (true) with check (true);
create policy "allow all commerce_orders"            on commerce_orders            for all using (true) with check (true);
create policy "allow all commerce_order_items"       on commerce_order_items       for all using (true) with check (true);
create policy "allow all commerce_invoices"          on commerce_invoices          for all using (true) with check (true);
create policy "allow all commerce_shipments"         on commerce_shipments         for all using (true) with check (true);
create policy "allow all commerce_messages"          on commerce_messages          for all using (true) with check (true);
create policy "allow all commerce_content_templates" on commerce_content_templates for all using (true) with check (true);
create policy "allow public insert b2b_tasting_requests" on b2b_tasting_requests
  for insert with check (true);
create policy "allow authenticated read b2b_tasting_requests" on b2b_tasting_requests
  for select using (auth.role() = 'authenticated');

insert into commerce_products (
  id, sku, name, description, category, size, channel, price_retail, stock,
  image_url, status, public_story, collections, price_label, label_material,
  accent_color, is_public
) values
  (
    'p-verde-vivo',
    'DA-VV-500',
    'Verde Vivo',
    'Årets første dråper, høstet mens olivenene ennå er knallgrønne for ekstremt høyt polyfenolinnhold.',
    'EVOO',
    '500 ml hero · 250 ml gaveformat',
    'Fine dining finishing',
    45.00,
    420,
    '/donaanna/product-design/verde-vivo-estate-arches.jpg',
    'Aktiv',
    'Krystallklar fruktighet, nyklippet gress og tomatkvist møter en elegant, vedvarende pepperfinish. Perfekt som finishing oil til crudo, carpaccio, burrata og delikate sjømatretter.',
    array['Verde Vivo', 'Restaurant', 'B2B Tasting Kit'],
    '450 kr / €45.00',
    'Kremhvit etikett · platinafolie',
    '#E5E4E2',
    true
  ),
  (
    'p-verde-alto',
    'DA-VA-500',
    'Verde Alto',
    'Balansert premiumolje for bord, butikk og restaurantkjøkken der grønn karakter skal støtte råvaren.',
    'EVOO',
    '500 ml',
    'Restaurant/Retail premium',
    29.00,
    760,
    '/donaanna/product-design/verde-alto-rustic-room.jpg',
    'Aktiv',
    'Premiumoljen for bredere bruk på bord, i butikk og i restaurant.',
    array['Verde Alto', 'Restaurant', 'Retail'],
    '290 kr / €29.00',
    'Lett kremetikett · børstet gull',
    '#D4AF37',
    true
  ),
  (
    'p-raiz-antigua',
    'DA-RA-500',
    'Raíz Antigua',
    'Begrenset utvalg fra eldre trær, med varmere dybde og sterkere heritage-fortelling.',
    'EVOO',
    '500 ml',
    'Limited allocation',
    34.00,
    180,
    '/donaanna/product-design/raiz-antigua-label-hero.jpg',
    'Aktiv',
    'En begrenset seleksjon med dybde, varme og arv fra gamle trær.',
    array['Raíz Antigua', 'Gavepakker', 'Retail'],
    '340 kr / €34.00',
    'Strukturert bomullspapir · kobber',
    '#B87333',
    true
  ),
  (
    'p-cocina-viva',
    'DA-CV-3L',
    'Cocina Viva',
    'Profesjonelt kjøkkenformat for volum, mise en place og varme retter med sporbar kvalitet.',
    'EVOO',
    '3 L metallkanne · 5 L BiB på forespørsel',
    'Chef kitchen format',
    75.00,
    90,
    '/donaanna/product-design/cocina-viva-b2b-collage.jpg',
    'Aktiv',
    'Arbeidsformatet for profesjonelle kjøkken som bruker olje hver dag.',
    array['Cocina Viva', 'Restaurant'],
    '750 kr / €75.00',
    'Mattsvart metallkanne · sort/hvitt trykk',
    '#F9F8F6',
    true
  ),
  (
    'p-mesa',
    'DA-ME-350',
    'Mesa · Gordal Noble',
    'Bordoliven for aperitivo, bar, hotell, marked og butikker som vil ha spansk varme i hyllen.',
    'Table olives',
    '250-350 g glasskrukke',
    'Spanish markets/restaurants',
    12.00,
    520,
    '/donaanna/product-design/portfolio-slate-mesa.jpg',
    'Aktiv',
    'Bordoliven som gir en varm inngang til Doña Anna-universet.',
    array['Mesa', 'Retail', 'B2B Tasting Kit'],
    '140 kr / €12.00',
    'Mørk terrakotta · lite gullsegl',
    '#C05A46',
    true
  )
on conflict (id) do nothing;

drop trigger if exists commerce_products_set_updated_at on commerce_products;
create trigger commerce_products_set_updated_at before update on commerce_products
  for each row execute function set_updated_at();

-- Public product images. The app stores the resulting public URL in
-- commerce_products.image_url, so admin, B2B and the public web all read the
-- same image reference.
insert into storage.buckets (id, name, public)
values ('commerce-product-images', 'commerce-product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "allow public read commerce product images" on storage.objects;
drop policy if exists "allow authenticated manage commerce product images" on storage.objects;
create policy "allow public read commerce product images" on storage.objects
  for select using (bucket_id = 'commerce-product-images');
create policy "allow authenticated manage commerce product images" on storage.objects
  for all using (bucket_id = 'commerce-product-images' and auth.role() = 'authenticated')
  with check (bucket_id = 'commerce-product-images' and auth.role() = 'authenticated');

drop trigger if exists commerce_customers_set_updated_at on commerce_customers;
create trigger commerce_customers_set_updated_at before update on commerce_customers
  for each row execute function set_updated_at();

drop trigger if exists commerce_orders_set_updated_at on commerce_orders;
create trigger commerce_orders_set_updated_at before update on commerce_orders
  for each row execute function set_updated_at();

drop trigger if exists commerce_invoices_set_updated_at on commerce_invoices;
create trigger commerce_invoices_set_updated_at before update on commerce_invoices
  for each row execute function set_updated_at();

drop trigger if exists commerce_shipments_set_updated_at on commerce_shipments;
create trigger commerce_shipments_set_updated_at before update on commerce_shipments
  for each row execute function set_updated_at();

drop trigger if exists commerce_messages_set_updated_at on commerce_messages;
create trigger commerce_messages_set_updated_at before update on commerce_messages
  for each row execute function set_updated_at();

drop trigger if exists commerce_content_templates_set_updated_at on commerce_content_templates;
create trigger commerce_content_templates_set_updated_at before update on commerce_content_templates
  for each row execute function set_updated_at();

drop trigger if exists b2b_tasting_requests_set_updated_at on b2b_tasting_requests;
create trigger b2b_tasting_requests_set_updated_at before update on b2b_tasting_requests
  for each row execute function set_updated_at();
