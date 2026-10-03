update olivia.batches
set metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object(
  'harvest_season',
  case
    when extract(month from harvest_date::date) >= 8
      then extract(year from harvest_date::date)::int::text || '/' || right((extract(year from harvest_date::date)::int + 1)::text,2)
    else (extract(year from harvest_date::date)::int - 1)::text || '/' || right(extract(year from harvest_date::date)::int::text,2)
  end
)
where harvest_date ~ '^\d{4}-\d{2}-\d{2}$'
  and not (coalesce(metadata,'{}'::jsonb) ? 'harvest_season');
