alter table olivia.pruning_history
  add column if not exists execution_status text not null default 'planned',
  add column if not exists completed_at timestamptz null,
  add column if not exists after_images jsonb not null default '[]'::jsonb,
  add column if not exists outcome_rating text null,
  add column if not exists outcome_notes text null,
  add column if not exists step_feedback jsonb not null default '[]'::jsonb,
  add column if not exists outcome_verified_at timestamptz null;

alter table olivia.pruning_history
  drop constraint if exists pruning_history_execution_status_check;

alter table olivia.pruning_history
  add constraint pruning_history_execution_status_check
  check (execution_status in ('planned','completed','partly_completed','cancelled'));

alter table olivia.pruning_history
  drop constraint if exists pruning_history_outcome_rating_check;

alter table olivia.pruning_history
  add constraint pruning_history_outcome_rating_check
  check (outcome_rating is null or outcome_rating in ('good','mixed','poor'));

create index if not exists pruning_history_outcome_verified_idx
  on olivia.pruning_history(parcel_id, outcome_verified_at desc)
  where outcome_verified_at is not null;
