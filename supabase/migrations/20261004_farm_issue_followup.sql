create table if not exists olivia.farm_issues (
  id text primary key default (gen_random_uuid())::text,
  issue_type text not null,
  title text not null,
  description text null,
  status text not null default 'open',
  severity text not null default 'medium',
  parcel_id text null references olivia.parcels(id) on delete set null,
  zone_id text null,
  tree_group_id text null,
  first_observation_id text null references olivia.farm_observations(id) on delete set null,
  latest_observation_id text null references olivia.farm_observations(id) on delete set null,
  opened_at timestamptz not null default now(),
  next_review_at timestamptz null,
  resolved_at timestamptz null,
  resolution_notes text null,
  geo_context jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint farm_issues_type_check check (issue_type in ('pest','disease','irrigation','soil','tree_health','maintenance','other')),
  constraint farm_issues_status_check check (status in ('open','monitoring','resolved','dismissed')),
  constraint farm_issues_severity_check check (severity in ('low','medium','high','critical'))
);

alter table olivia.farm_issues enable row level security;
drop policy if exists olivia_internal_all_farm_issues on olivia.farm_issues;
create policy olivia_internal_all_farm_issues
  on olivia.farm_issues
  for all to authenticated
  using (olivia_private.is_internal_user())
  with check (olivia_private.is_internal_user());

grant select,insert,update,delete on olivia.farm_issues to authenticated;

alter table olivia.farm_observations
  add column if not exists issue_id text null references olivia.farm_issues(id) on delete set null;

create index if not exists farm_issues_status_review_idx
  on olivia.farm_issues(status,next_review_at);
create index if not exists farm_issues_parcel_idx
  on olivia.farm_issues(parcel_id,updated_at desc);
create index if not exists farm_observations_issue_idx
  on olivia.farm_observations(issue_id,observed_at desc);
