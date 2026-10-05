create table if not exists olivia.organic_parcel_certifications (
  parcel_id text primary key references olivia.parcels(id) on delete cascade,
  authority text not null default 'CAECV',
  status text not null default 'unknown',
  source_case_id text null references olivia.caecv_cases(id) on delete set null,
  certificate_number text null,
  valid_from date null,
  valid_until date null,
  conversion_start date null,
  last_inspection_at date null,
  next_inspection_due date null,
  basis_document_id text null references olivia.caecv_documents(id) on delete set null,
  notes text null,
  verified_at timestamptz null,
  verified_by text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organic_parcel_cert_status_check check (
    status in ('unknown','application_pending','in_conversion','certified','suspended','non_compliant')
  )
);

alter table olivia.organic_parcel_certifications enable row level security;

drop policy if exists olivia_internal_all_organic_parcel_certifications
  on olivia.organic_parcel_certifications;

create policy olivia_internal_all_organic_parcel_certifications
  on olivia.organic_parcel_certifications
  for all
  to authenticated
  using (olivia_private.is_internal_user())
  with check (olivia_private.is_internal_user());

grant select, insert, update, delete
  on olivia.organic_parcel_certifications
  to authenticated;

create index if not exists organic_parcel_cert_status_idx
  on olivia.organic_parcel_certifications(status, valid_until);
