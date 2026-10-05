alter table olivia.farm_geo_landmarks
  add column if not exists review_interval_days integer null,
  add column if not exists last_review_at date null,
  add column if not exists next_review_at date null;

alter table olivia.farm_geo_landmarks
  drop constraint if exists farm_geo_landmarks_review_interval_check;

alter table olivia.farm_geo_landmarks
  add constraint farm_geo_landmarks_review_interval_check
  check (review_interval_days is null or review_interval_days between 1 and 3650);

create index if not exists farm_geo_landmarks_next_review_idx
  on olivia.farm_geo_landmarks(next_review_at)
  where status='active' and next_review_at is not null;
