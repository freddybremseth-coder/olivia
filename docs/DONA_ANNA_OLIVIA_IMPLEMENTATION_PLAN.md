# Dona Anna Olivia – implementeringsplan

Denne planen gjør Olivia om fra et smart gårdsdashboard til et praktisk beslutningssystem for DonaAnna olivenproduksjon i Biar, Alicante.

## Viktig lokal kontekst

DonaAnna-gården ligger i Biar i Alicante, ca. 650 meter over havet. Det betyr at klimaet er kjøligere enn lavere kystområder, og at modning og høsting normalt kan komme senere enn i varmere/lavere områder. Appen må derfor ikke bruke generiske olivenkalendere ukritisk, men ha en egen fjell-/innlandsprofil for Biar.

## Hovedmål

Olivia skal svare på fire spørsmål hver dag:

1. Hva skjer på tomten nå?
2. Hva må gjøres i dag?
3. Hva påvirker kvalitet, vannstress, salt og avling?
4. Hva tjener DonaAnna penger på?

## Fase 1 – Datagrunnlag og struktur

### 1. Parsell, sone og tregruppe

Struktur:

```text
Farm → Parcel → Zone → Tree group → Sensor point
```

Eksempel:

```text
DonaAnna Biar
  └── Polygon 9 / Parcela 190
      └── Nordhelling
          └── Unge Gordal-trær
              └── soil_moisture 40 cm
```

Nye datatyper som bør ligge i `types.ts`:

- `FarmZone`
- `TreeGroup`
- `SensorDevice`
- `SensorReading`
- `SensorAlert`
- `IrrigationEvent`
- `FarmObservation`

### 2. Sensorer og målinger skilles

En sensor er en fysisk enhet. En måling er en tidsserieverdi fra sensoren.

Sensoren bør ha:

```ts
sensor_id
parcel_id
zone_id
tree_group
depth_cm
source
battery_percent
signal_rssi
calibrated_at
status
```

Målingen bør ha:

```ts
sensor_id
value
unit
measured_at
received_at
quality_score
```

## Fase 2 – IoT og vanning

### Sensorer som støttes

```ts
soil_moisture
soil_temperature
soil_ec
soil_ph
water_ec
water_ph
flow
pressure
rain
air_temperature
air_humidity
leaf_wetness
battery
```

### Prioriterte sensorer for DonaAnna

1. Jordfuktighet på flere dybder
2. Jordtemperatur
3. EC/salt i jord
4. EC/salt i vann
5. Flow-måler på vanning
6. Trykksensor på vanning
7. Regn og lokal værstasjon
8. Bladfukt for sykdomsrisiko

### Vanningsrådgiver

Appen bør kunne gi råd som:

```text
Sone C har lav jordfuktighet på 40 cm, høy fordamping og ingen regn i varselet. Anbefalt handling: vann unge trær i 2 timer etter kl. 20:00.
```

Datakilder:

- soil_moisture
- soil_temperature
- rain
- ET0 / fordamping
- flow
- pressure
- tree_group
- soilType
- irrigation history

## Fase 3 – Varsler

Eksempler på praktiske varsler:

- Kritisk lav jordfuktighet
- EC/salt stiger over tid
- Mulig lekkasje: flow uten normalt trykk
- Mulig tett dryppslange: trykk normalt, flow lav
- Lavt batteri
- Sensor offline
- pH-sensor må kalibreres
- Høy bladfukt + mild temperatur = økt sykdomsrisiko

## Fase 4 – Kart og feltarbeid

Kartet bør vise soner med status:

- Grønn: optimal
- Gul: følg med
- Rød: handling nødvendig
- Blå: vannet siste 24 timer
- Lilla: høy EC/salt
- Grå: sensor offline

Klikk på en sone bør vise:

- Parsell
- Sone
- Tregruppe
- Sort
- Alder
- Siste fuktmåling
- EC/salt
- Vanningshistorikk
- Oppgaver
- Bilder
- Dokumenter

## Fase 5 – Produksjon, kvalitet og økonomi

### Produksjonslogg

Registrer:

- dato
- parsell
- sone
- sort
- kg høstet
- olje / bordoliven
- liter olje
- oljeutbytte %
- kvalitet
- arbeidstimer
- kostnad

### Bordoliven

Flyt:

```text
Plukking → Lake → Skylling → Marinering → Lagring → Pakking → Salg
```

Varsler:

```text
Batch 2026-GORDAL-01 skal skifte lake i morgen.
```

### EVOO kvalitet

Registrer:

- acidity
- peroxide
- K232
- K270
- deltaK
- phenols
- harvestDate
- pressDate
- storageTank

## Fase 6 – Biar-årshjul

Fordi Biar ligger ca. 650 moh., skal Olivia bruke en senere høsteprofil enn kyst/lavland.

### Veiledende gårdsår

| Periode | Fokus |
|---|---|
| Januar–februar | Beskjæring, vedlikehold, planlegging |
| Mars–april | Jordprøver, gjødsling, sjekk vanning |
| Mai–juni | Blomstring, fruktsetting, vannbalanse |
| Juli–august | Tørkestress, unge trær, dryppslanger, EC/salt |
| September | Bordoliven-vurdering, vannstrategi, skadedyr |
| Oktober | Modningsovervåkning, batch-plan, utstyr |
| November–desember | Høsting i Biar/fjellprofil, pressing, bordoliven |
| Desember–januar | Analyse, økonomi, årsrapport, neste sesong |

Merk: Faktisk høstetid må styres av modenhet, sort, vær, ønsket kvalitet og oljeprofil – ikke bare kalender.

## Fase 7 – AI-rådgiver

AI-rådgiveren skal bruke egne gårdsdata, ikke bare generell kunnskap.

Spørsmål den bør kunne svare på:

- Hvor bør jeg vanne i dag?
- Hvilke soner har størst risiko?
- Hvorfor stiger EC i sone B?
- Hvilke trær bør prioriteres?
- Hva bør gjøres de neste 14 dagene?
- Hvilken parsell gir best resultat per liter vann?

## Første tekniske implementering

1. Utvid `types.ts` med ny sensormodell og gårdsmodeller.
2. Oppdater `IoTDashboard.tsx` til nye sensortyper.
3. Lag Supabase-tabeller for:
   - `farm_zones`
   - `tree_groups`
   - `sensor_devices`
   - `sensor_readings`
   - `sensor_alerts`
   - `irrigation_events`
   - `farm_observations`
4. Lag migrering fra gamle localStorage-sensorer.
5. Koble ekte sensor-API/LoRaWAN/Modbus til `sensor_readings`.
6. Lag vanningsrådgiver og daglig beslutningsdashboard.
