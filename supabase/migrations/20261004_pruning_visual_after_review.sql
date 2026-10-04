alter table olivia.pruning_history
  add column if not exists outcome_ai_review jsonb null;
