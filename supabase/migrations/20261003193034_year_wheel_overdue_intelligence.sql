alter table olivia.farm_year_wheel_items
  add column if not exists started_at timestamptz null,
  add column if not exists postponed_until date null,
  add column if not exists postponed_reason text null,
  add column if not exists status_changed_at timestamptz not null default now();

update olivia.farm_year_wheel_items
   set status_changed_at = coalesce(updated_at, created_at, now())
 where status_changed_at is null;
