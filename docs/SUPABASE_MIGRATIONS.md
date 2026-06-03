# Olivia Supabase migrations

Denne filen er en teknisk oversikt over Supabase-tabeller og migrasjoner for Olivia / Dona Anna-appen.

## Hovedregel

- Viktige appdata skal lagres i Supabase schema `olivia`.
- Appen skal ikke bruke browser-lagring som hovedlagring for viktige moduler.
- Tomme tabeller skal gi empty state i UI, ikke eksempeldata.
- API-nøkler skal ligge i Vercel Environment Variables, ikke i browser eller Supabase-tabeller.

## Schema

Gårdsdata ligger i:

```sql
olivia
```

Auth og brukerprofiler ligger i `public`.

## Migrasjoner lagt til i denne arbeidsrunden

### Harvest planning

Fil:

```text
supabase/migrations/20260603_olivia_harvest_planning.sql
```

Tabeller:

- `olivia.harvest_plans`
- `olivia.olive_varieties`

Brukes av:

- `services/harvestPlanning.ts`
- `components/HarvestPlannerSupabaseView.tsx`

### Production SOP register

Fil:

```text
supabase/migrations/20260603_olivia_sops.sql
```

Tabell:

- `olivia.production_sops`

Brukes av:

- `services/productionSops.ts`
- `components/TableOliveBatchPlanner.tsx`

### Equipment / fleet

Fil:

```text
supabase/migrations/20260603_olivia_equipment.sql
```

Tabeller:

- `olivia.equipment`
- `olivia.equipment_service_logs`

Brukes av:

- `services/equipment.ts`
- `components/FleetView.tsx`

## Viktige tabellgrupper

### Core farm

- `olivia.parcels`
- `olivia.farm_zones`
- `olivia.tree_groups`
- `olivia.farm_settings`
- `olivia.field_observations`

### Production

- `olivia.harvest_records`
- `olivia.harvest_plans`
- `olivia.olive_varieties`
- `olivia.batches`
- `olivia.recipes`
- `olivia.production_sops`

### Tasks

- `olivia.tasks`

### Finance

- `olivia.farm_expenses`
- `olivia.subsidy_income`

### IoT and irrigation

- `olivia.sensor_devices`
- `olivia.sensor_readings`
- `olivia.sensor_alerts`
- `olivia.irrigation_events`

### Equipment

- `olivia.equipment`
- `olivia.equipment_service_logs`

## Moduler som nå skal være Supabase-only for viktige data

- `components/TasksView.tsx`
- `components/ProductionView.tsx`
- `components/TraceabilityBatchesView.tsx`
- `components/HarvestPlannerView.tsx`
- `components/DonaAnnaSalesInventoryView.tsx`
- `components/DonaAnnaOrderDocumentsView.tsx`
- `components/OrganicCertificationView.tsx`
- `components/SeasonReportView.tsx`
- `components/AutoTasksView.tsx`
- `components/IrrigationLogView.tsx`
- `components/IrrigationView.tsx`
- `components/IoTDashboard.tsx`
- `components/DonaAnnaDailyDashboard.tsx`
- `components/SalinityDashboard.tsx`
- `components/ZoneStatusMapView.tsx`
- `components/FleetView.tsx`
- `components/SettingsView.tsx`

## API keys

Settes i Vercel Environment Variables:

```text
GEMINI_API_KEY
ANTHROPIC_API_KEY
OPENAI_API_KEY
```

Ikke lagre disse i frontend, browser storage eller database.

## Testliste etter migrasjoner

1. Kjør migrasjonene i Supabase SQL Editor.
2. Åpne appen og logg inn.
3. Test at tabeller som er tomme viser empty state.
4. Registrer en rad i hver viktig modul.
5. Refresh appen.
6. Bekreft at data fortsatt ligger i Supabase.

## Feilsøking

### Tabellen mangler

Kjør tilhørende SQL-migrasjon.

### RLS-feil

Sjekk policy for authenticated users.

### Tom visning

Hvis tabellen er tom, er det forventet. Appen skal ikke lage eksempeldata.

### Data forsvinner etter refresh

Sjekk riktig schema og tabell i Supabase Table Editor.
