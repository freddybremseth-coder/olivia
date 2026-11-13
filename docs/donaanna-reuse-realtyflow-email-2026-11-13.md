# Doña Anna – gjenbruk e-postsystemet som allerede er i drift

Beslutning fra eier 13. november 2026: **Ikke opprett ekstra e-postsystemer eller abonnementer for Doña Anna. Gjenbruk det eksisterende fra ZenEcoHomes/PinosoEcoLife/RealtyFlow PRO.**

## Verifisert infrastruktur

- RealtyFlow PRO har eksisterende SMTP-transport via `src/services/email/send-brand-email.ts`, som tar `brandId` og bruker den aktive kontoens SMTP-konfigurasjon.
- Supabase-databasen inneholder allerede `brand_email_configs` med `brand_id='donaanna'`, `email_address='admin@donaanna.com'`, `is_active=true` (verifisert 13.11.2026). Ingen hemmeligheter ble lest.
- ZenEcoHomes bruker en server-til-server-integrasjon til RealtyFlow PRO `/api/public/leads`. Denne ruten behandler **eiendomsrelaterte** merkevarer og må ikke brukes direkte for Doña Anna uten separat merkevaretilpasning.
- Doña Anna har inntil videre offentlig `mailto:info@donaanna.com`, og skjemaflytene for smaksprøve, gaver og firmagaver skal bevares.

## Riktig implementering – ikke aktiver før verifisering

1. Gjør Doña Anna til en separat og validert mottaker i den eksisterende RealtyFlow-mottaksstrømmen; om nødvendig en liten merkevarespesifikk API-rute i **samme RealtyFlow-installasjon**, ikke en ny tjeneste.
2. Bruk eksisterende `sendBrandEmail(..., brandId:'donaanna')` og oppslag av aktiv Doña Anna SMTP-konfigurasjon. Ingen Resend eller ekstra abonnement.
3. Behold sikkerhetsprinsippene fra fungerende eiendomsskjema: server-side skjemavalidering, origin-kontroll, honeypot, rate limiting/abuse control, server-til-server-autentisering og fail-closed svar. Ikke legg interne nøkler i nettleseren.
4. Lever meldinger kun til en bekreftet Doña Anna-innboks. `admin@donaanna.com` er **aktiv SMTP-avsender**; verifiser separat hvilken adresse som faktisk mottar innkommende henvendelser. `info@donaanna.com` står i offentlig mailto, men leveransen til den adressen er ikke verifisert.
5. Oppbevar Doña Anna-kundedata under `brand_id='donaanna'`; aldri i ZenEcoHomes/PinosoEcoLife sin kundekontekst. Nye kundeoppføringer og automatiserte oppfølginger krever separate godkjenninger og korrekt personvern.
6. Oppdater `/personvern` samtidig med aktivering av serverbasert innsending, og gjennomfør en faktisk leveringstest som avsender/mottaker kan bekrefte.
7. Endre `api/public-inquiry.ts` og klientens aktiveringsflagg i olivia **først når** den eksisterende transporten er koblet og ende-til-ende testet. De eldre Resend/Turnstile-flaggene skal ikke aktiveres.

## Verifisert status

- Tilkoblet Doña Anna SMTP-konto: **ja**.
- Produksjonsklar Doña Anna offentlig API-integrasjon: **ikke bekreftet**.
- Faktisk mottak av testhenvendelse: **ikke bekreftet**.
- Nye eksterne abonnementsbehov: **ingen foreslått**.

## Avklaringsregel

Ikke konkluder med at «nettstedet sender direkte» fordi kode er merget eller SMTP-konfigurasjon finnes. Kvittering kan først vises etter at den faktiske sendepipelinen returnerer bekreftet mottak/aksept; ikke lov innbokslevering uten reell mottaksverifikasjon.
