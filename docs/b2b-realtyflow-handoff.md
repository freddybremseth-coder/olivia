# Doña Anna B2B → RealtyFlow PRO: kontrollert overgang

## Nåværende situasjon

Olivia lagrer innkommende B2B-henvendelser med egen ID, status og kontaktinformasjon i `olivia.b2b_tasting_requests`. Administrator kan eksportere en semikolon-separert CSV med UTF-8 BOM fra den beskyttede innboksen. CSV-feltene er stabilt ordnet, og verdier som kan starte regnearkformler blir prefikset med apostrof.

Dette er en **manuell handoff**, ikke automatisk CRM-import. CSV inneholder personopplysninger og skal bare håndteres av autorisert personale, lagres kortvarig og slettes etter import.

## Hvorfor automatisk opprettelse er sperret

RealtyFlow PROs `/api/public/leads` er for eiendomsmerkevarer og har en honeypot-kontroll som avviser payload med `company`. Å sende Doña Anna-skjemaet dit kan enten miste henvendelsen eller feilmerke den som en eiendomskunde. CRM-kontakter har dessuten deduplisering, brand-/RLS-gater og egne godkjenningskrav.

Ikke send Doña Anna-henvendelser til `zeneco` eller et annet eiendomsbrand for å omgå denne sperren. Ikke skriv direkte til `public.contacts` fra nettleseren eller Olivia.

## Krav før automatisk synkronisering

1. Opprett en separat serverbeskyttet RealtyFlow-intake for merkevaren `donaanna` med eksplisitt brand-ID og tilgangsmodell.
2. Avtal skjema: kilde `olivia_b2b`, `external_id` (henvendelses-UUID), bedrift, kontaktperson, e-post, produktinteresse, estimert behov, melding og samtykkegrunnlag.
3. Implementer idempotens på `(brand_id, source, external_id)` og kontrollert duplikatsøk på e-post innen **samme brand**. Ingen overskriving av eksisterende kontakt uten eksplisitt administratorbeslutning.
4. Bruk serverside-autentisering mellom systemene, auditlogg og feilkø med retry; aldri legg API-hemmeligheter i `VITE_*`-variabler.
5. Test at en Doña Anna-henvendelse ikke dukker opp i Zen Eco Homes, Pinoso Eco Life eller andre merkevarer før synkronisering aktiveres.

Inntil disse punktene er godkjent, brukes B2B-innboksen i Olivia som kilde til sannheten.
