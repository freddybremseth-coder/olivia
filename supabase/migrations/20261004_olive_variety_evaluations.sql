create table if not exists olivia.olive_variety_evaluations (
  id text primary key,
  reference_id text not null references olivia.olive_variety_references(id) on delete cascade,
  expected_variety text not null,
  predicted_variety text not null,
  confidence numeric not null default 0 check (confidence >= 0 and confidence <= 100),
  is_correct boolean not null default false,
  result_json jsonb not null default '{}'::jsonb,
  reference_count integer not null default 0 check (reference_count >= 0),
  model_label text not null default 'expert-engine-blind-v1',
  created_at timestamptz not null default now()
);

alter table olivia.olive_variety_evaluations enable row level security;

create policy olivia_internal_all_olive_variety_evaluations
  on olivia.olive_variety_evaluations
  for all
  to authenticated
  using (olivia_private.is_internal_user())
  with check (olivia_private.is_internal_user());

grant select, insert, update, delete
  on olivia.olive_variety_evaluations
  to authenticated;

create index if not exists olive_variety_evaluations_reference_idx
  on olivia.olive_variety_evaluations(reference_id, created_at desc);

create index if not exists olive_variety_evaluations_correct_idx
  on olivia.olive_variety_evaluations(is_correct, created_at desc);
