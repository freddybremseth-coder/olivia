# Doña Anna — operativ oppstart av direkte kundehenvendelser

Sjekket 12. november 2026 mot produksjonsmiljøet til Vercel-prosjektet `olivia` som betjener `donaanna.com`.

## Faktisk tilstand

- GitHub PR #191 er slått sammen og siste Vercel-deploy er `READY`, SHA `8a37e74d783b951dddad162393425a2ff1d3d924`.
- Eksisterende mailto-henvendelser brukes fortsatt; direkte frontend er ikke aktiv.
- Produksjonsmiljøet mangler alle nøklene nedenfor. Kun **nøkkelnavnene** er kontrollert, ingen hemmelige verdier hentet eller lagt i kode.
- Tilkoblet Hostinger Mail-konto i ChatGPT gjelder `freddy@zenecohomes.com`, ikke Doña Anna. Den må ikke brukes som Doña Anna-avsender uten separat godkjenning/oppsett.

## Riktig rekkefølge

### 1. Resend / avsenderdomene

1. Opprett/velg Doña Anna-administrert Resend-konto.
2. Legg inn avsenderdomenet (f.eks. `mail.donaanna.com` eller `donaanna.com` etter DNS-plan), og publiser **akkurat DNS-verdiene Resend viser**, ikke gjetninger.
3. Bekreft domenet som «Verified» i Resend. Ikke bruk et annet merkevares domene eller personlig e-post som midlertidig avsender.
4. Lag en avgrenset sendetoken for Doña Anna. I Vercel Production settes:
   - `DONAANNA_RESEND_API_KEY` (secret);
   - `DONAANNA_MAIL_FROM` (verifisert avsender, f.eks. `Doña Anna <kontakt@...>`, faktisk adresse må velges).
5. Bekreft at `info@donaanna.com` er en fungerende mottaker med tilgang for ansvarlig.

Resend-dokumentasjon: https://resend.com/docs/dashboard/domains/introduction
Vercel-miljøvariabler: https://vercel.com/docs/environment-variables

### 2. Cloudflare Turnstile

1. Opprett nettsted/widget for `www.donaanna.com` og `donaanna.com`, med faktisk ønsket widgettype.
2. **Serverhemmelighet** i Vercel Production: `DONAANNA_TURNSTILE_SECRET`.
3. **Offentlig site key** for Vite-bygget: `VITE_DONAANNA_TURNSTILE_SITE_KEY`.
4. Test innlasting og botvalidering på et testdomene hvis dette støttes av widgetkonfigurasjonen; prod-domene må være tillatt før aktivering.

Dokumentasjon: https://developers.cloudflare.com/turnstile/get-started/

### 3. Juridisk og operativ godkjenning

- Revider `/personvern` **i samme release som aktivering** med behandlingsansvarlig, formål, behandlingsgrunnlag, databehandlere (inkludert Resend/Cloudflare), geografisk overføring, lagringstid og rettigheter.
- Bestem hvordan henvendelser besvares og slettes fra `info@donaanna.com` i tråd med faktisk e-postoppsett.
- Først når dette er godkjent kan prøvesending i produksjon gjennomføres.

### 4. Kontrollert aktivering

Etter at både levering og spamkontroll er bekreftet:

1. Sett `DONAANNA_INQUIRY_ENABLED=true` på **server**.
2. Sett `VITE_DONAANNA_DIRECT_INQUIRY=true` i **Production build** og kjør **redeploy**, slik at frontend-bundlen får flagget.
3. Foreta test med eksplisitt testadresse: privat henvendelse, bedrift, ugyldig bot-token, frakoblet nett og avvist leverandør.
4. Test bekreftet avsender, mottaker og `reply_to`. Kvittering `accepted: true` betyr bare at e-posttjenesten tok imot forespørselen; det er ikke garanti for levering til innboks.
5. Behold mailto-fallback og overvåk leveringsfeil. Rull tilbake ved 5xx eller økning i spam.

## Sikre kontrollpunkter i kode

| Kontroll | Fil / markør |
| --- | --- |
| Ingen åpning uten 4 serverbetingelser | `api/public-inquiry.ts`: `DONAANNA_INQUIRY_ENABLED`, Resend token, FROM, Turnstile secret |
| Frontend OFF uten to Vite-flagg | `components/PublicB2BLandingPage.tsx` |
| Feilrespons skal aldri gi sendtkvittering | `services/publicInquiry.ts` |
| Test-API avvisning, bekreftet mottak, feil | `tests/donaannaPublicInquiry.test.mjs` |
| Test klient feil/retry | `tests/donaannaPublicInquiryClient.test.mjs` |

## Viktig avgrensning

Denne oppgaven har ikke opprettet Resend-/Cloudflare-kontoer, ikke endret DNS, ikke sendt e-post eller registrert personopplysninger. Ingen sikker metode for å aktivere tjenesten uten tilgang til disse tjenestene. **Ikke sett flags før en reell test kan utføres.**
