alter table olivia.farm_observations
  add column if not exists geo_structure_context jsonb null;
