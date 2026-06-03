-- Olivia / Doña Anna: SOP register for production procedures
-- Run in Supabase SQL Editor before using SOP persistence in the app.

create table if not exists olivia.production_sops (
  id text primary key,
  code text not null unique,
  title text not null,
  category text not null default 'table_olives',
  version text not null default 'v1.0',
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  approved_by text,
  approved_at date,
  summary text,
  checklist jsonb not null default '[]'::jsonb,
  document_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists production_sops_category_idx on olivia.production_sops(category);
create index if not exists production_sops_status_idx on olivia.production_sops(status);

alter table olivia.production_sops enable row level security;

drop policy if exists "Allow authenticated read production_sops" on olivia.production_sops;
create policy "Allow authenticated read production_sops"
on olivia.production_sops
for select
to authenticated
using (true);

drop policy if exists "Allow authenticated write production_sops" on olivia.production_sops;
create policy "Allow authenticated write production_sops"
on olivia.production_sops
for all
to authenticated
using (true)
with check (true);

create or replace function olivia.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_production_sops_updated_at on olivia.production_sops;
create trigger set_production_sops_updated_at
before update on olivia.production_sops
for each row execute function olivia.set_updated_at();

insert into olivia.production_sops (
  id,
  code,
  title,
  category,
  version,
  status,
  summary,
  checklist
) values (
  'sop-table-olive-001',
  'SOP-DA-TABLE-001',
  'Bordoliven - forbehandling, lake, marinering og salgsklar kontroll',
  'table_olives',
  'v1.0',
  'draft',
  'Standard Doña Anna arbeidsprosedyre for bordoliven. Må fylles ut og godkjennes av ansvarlig/fagperson før aktiv bruk.',
  '[
    "Råvare er sortert, vasket og skadde oliven er fjernet",
    "Ansvarlig person er registrert",
    "Forbehandling er utført etter godkjent intern prosedyre",
    "Skylling og overgang til lake er kontrollert",
    "pH/saltmålinger er dokumentert der dette er relevant",
    "Batch er godkjent for marinering",
    "Batch er godkjent for pakking",
    "Merking, ingrediensliste og batchkode er kontrollert før salg"
  ]'::jsonb
)
on conflict (id) do nothing;
