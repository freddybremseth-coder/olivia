-- Dona Anna / Biar IoT seed data
-- Run after supabase/migrations/20260601_dona_anna_farm_iot.sql
-- Replace parcel_id values with real parcel IDs from your parcels table when ready.

-- Zones for Biar mountain profile
insert into public.farm_zones (id, parcel_id, name, description, slope, altitude_m, soil_type, irrigation_sector_id, status, notes)
values
  ('00000000-0000-0000-0000-00000000a001', 'biar-main', 'Sone A - unge trær', 'Unge trær og prioritet for vanning/kontroll.', 'mixed', 650, 'Leire / blandet jord', 'sector-a', 'watch', 'Startområde for jordfukt på 30 og 60 cm.'),
  ('00000000-0000-0000-0000-00000000b001', 'biar-main', 'Sone B - eldre blanding', 'Eldre etablerte trær med blandede sorter.', 'north', 650, 'Leire / steinete jord', 'sector-b', 'watch', 'Prioritet for EC/salt og avling per liter vann.'),
  ('00000000-0000-0000-0000-00000000c001', 'biar-main', 'Sone C - tørrere felt', 'Tørrere del der dryppslanger og kaninskader bør kontrolleres ofte.', 'south', 650, 'Tørrere / mer drenerende jord', 'sector-c', 'warning', 'Brukes for tidlig varsling av tørkestress.')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  slope = excluded.slope,
  altitude_m = excluded.altitude_m,
  soil_type = excluded.soil_type,
  irrigation_sector_id = excluded.irrigation_sector_id,
  status = excluded.status,
  notes = excluded.notes,
  updated_at = now();

-- Tree groups
insert into public.tree_groups (id, parcel_id, zone_id, name, variety, tree_count, age_years, production_goal, health_status, notes)
values
  ('00000000-0000-0000-0000-00000000a101', 'biar-main', '00000000-0000-0000-0000-00000000a001', 'Unge Gordal', 'Gordal', 250, null, 'table_olives', 'watch', 'Prioriter stabil vanning og kontroll av dryppslanger.'),
  ('00000000-0000-0000-0000-00000000b101', 'biar-main', '00000000-0000-0000-0000-00000000b001', 'Eldre blanding', 'Changlot Real / Gordal / Genoesa', 1000, null, 'mixed', 'watch', 'Hovedvolum for olje og blandet produksjon.'),
  ('00000000-0000-0000-0000-00000000c101', 'biar-main', '00000000-0000-0000-0000-00000000c001', 'Genoesa kontrollfelt', 'Genoesa', 250, null, 'oil', 'warning', 'Brukes som kontrollfelt for tørke og salt.')
on conflict (id) do update set
  name = excluded.name,
  variety = excluded.variety,
  tree_count = excluded.tree_count,
  production_goal = excluded.production_goal,
  health_status = excluded.health_status,
  notes = excluded.notes,
  updated_at = now();

-- Sensor devices
insert into public.sensor_devices (
  sensor_id,
  name,
  type,
  parcel_id,
  zone_id,
  tree_group_id,
  tree_group,
  depth_cm,
  unit,
  source,
  status,
  battery_percent,
  signal_rssi,
  calibrated_at,
  last_seen_at,
  notes
) values
  ('DA-BIAR-SOIL-M-30-A', 'Sone A - Jordfukt 30 cm', 'soil_moisture', 'biar-main', '00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-00000000a101', 'Unge Gordal', 30, '%', 'simulation', 'Online', 88, -76, now() - interval '30 days', now(), 'Startsensor for ung Gordal-sone.'),
  ('DA-BIAR-SOIL-M-60-A', 'Sone A - Jordfukt 60 cm', 'soil_moisture', 'biar-main', '00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-00000000a101', 'Unge Gordal', 60, '%', 'simulation', 'Online', 87, -77, now() - interval '30 days', now(), 'Dypere fukt for rotsonen.'),
  ('DA-BIAR-SOIL-EC-B', 'Sone B - Jord EC / salt', 'soil_ec', 'biar-main', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-00000000b101', 'Eldre blanding', 40, 'dS/m', 'simulation', 'Online', 74, -81, now() - interval '20 days', now(), 'Saltoppbygging i etablert produksjonsfelt.'),
  ('DA-BIAR-WATER-EC', 'Vanningsvann - EC', 'water_ec', 'biar-main', '00000000-0000-0000-0000-00000000a001', null, null, null, 'dS/m', 'simulation', 'Online', 100, -60, now() - interval '10 days', now(), 'Vannkvalitet før vanning.'),
  ('DA-BIAR-FLOW-A', 'Sektor A - Flow', 'flow', 'biar-main', '00000000-0000-0000-0000-00000000a001', null, null, null, 'L/min', 'simulation', 'Online', 65, -79, now() - interval '10 days', now(), 'Kontroll av faktisk vann ut i sektor A.'),
  ('DA-BIAR-PRESSURE-A', 'Sektor A - Trykk', 'pressure', 'biar-main', '00000000-0000-0000-0000-00000000a001', null, null, null, 'bar', 'simulation', 'Low Battery', 22, -84, now() - interval '10 days', now(), 'Trykkfall kan indikere lekkasje eller filterproblem.')
on conflict (sensor_id) do update set
  name = excluded.name,
  type = excluded.type,
  parcel_id = excluded.parcel_id,
  zone_id = excluded.zone_id,
  tree_group_id = excluded.tree_group_id,
  tree_group = excluded.tree_group,
  depth_cm = excluded.depth_cm,
  unit = excluded.unit,
  source = excluded.source,
  status = excluded.status,
  battery_percent = excluded.battery_percent,
  signal_rssi = excluded.signal_rssi,
  calibrated_at = excluded.calibrated_at,
  last_seen_at = excluded.last_seen_at,
  notes = excluded.notes,
  updated_at = now();

-- Initial readings
insert into public.sensor_readings (sensor_id, parcel_id, zone_id, tree_group_id, tree_group, depth_cm, type, value, unit, battery_percent, signal_rssi, calibrated_at, measured_at, source, quality_score)
values
  ('DA-BIAR-SOIL-M-30-A', 'biar-main', '00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-00000000a101', 'Unge Gordal', 30, 'soil_moisture', 42, '%', 88, -76, now() - interval '30 days', now() - interval '10 minutes', 'simulation', 0.9),
  ('DA-BIAR-SOIL-M-60-A', 'biar-main', '00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-00000000a101', 'Unge Gordal', 60, 'soil_moisture', 36, '%', 87, -77, now() - interval '30 days', now() - interval '10 minutes', 'simulation', 0.9),
  ('DA-BIAR-SOIL-EC-B', 'biar-main', '00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-00000000b101', 'Eldre blanding', 40, 'soil_ec', 2.3, 'dS/m', 74, -81, now() - interval '20 days', now() - interval '8 minutes', 'simulation', 0.85),
  ('DA-BIAR-WATER-EC', 'biar-main', '00000000-0000-0000-0000-00000000a001', null, null, null, 'water_ec', 1.2, 'dS/m', 100, -60, now() - interval '10 days', now() - interval '8 minutes', 'simulation', 0.95),
  ('DA-BIAR-FLOW-A', 'biar-main', '00000000-0000-0000-0000-00000000a001', null, null, null, 'flow', 28, 'L/min', 65, -79, now() - interval '10 days', now() - interval '2 minutes', 'simulation', 0.9),
  ('DA-BIAR-PRESSURE-A', 'biar-main', '00000000-0000-0000-0000-00000000a001', null, null, null, 'pressure', 0.6, 'bar', 22, -84, now() - interval '10 days', now() - interval '2 minutes', 'simulation', 0.9);

-- Initial open alert
insert into public.sensor_alerts (sensor_id, parcel_id, zone_id, type, severity, title, message, recommended_action, created_at)
values
  ('DA-BIAR-PRESSURE-A', 'biar-main', '00000000-0000-0000-0000-00000000a001', 'pressure', 'warning', 'Lavt trykk i sektor A', 'Trykket er lavt samtidig som flow er aktiv. Sjekk filter, koblinger og dryppslanger.', 'inspect_dripline', now())
on conflict do nothing;
