alter table olivia.farm_media_evidence
  drop constraint if exists farm_media_match_method_check;

alter table olivia.farm_media_evidence
  add constraint farm_media_match_method_check
  check (match_method in ('polygon','boundary_near','nearest','manual','spatial_memory','unmatched'));
