# Doña Anna – direkte forespørsler fra nettsiden (trinn 1)

Status: sikker, deaktivert API-klargjøring. **Nettsidens eksisterende mailto-funksjon fortsetter som før.** Ingen ny behandling av kundeopplysninger er aktivert.

## Implementert

`POST /api/public-inquiry` tar på sikt imot `kind` (`tasting`, `gift`, `corporate-gift`), `product`, `audience`, `name`, `email`, `company`, `role`, `area`, `message`, `website` (spam-felle) og `turnstileToken`. Ved gyldig innsending og bekreftet botkontroll kan meldingen leveres som e-post til `info@donaanna.com`.

Endpoint er **bevisst inaktiv** (503) uten alle tre server-only miljøvariabler:
- `DONAANNA_RESEND_API_KEY` — Resend-prosjektnøkkel med avgrenset sendetilgang;
- `DONAANNA_MAIL_FROM` — bekreftet avsenderadresse på et verifisert Doña Anna-domene;
- `DONAANNA_TURNSTILE_SECRET` — Cloudflare Turnstile serverhemmelighet.

Ikke legg noen av disse i `VITE_*` eller `NEXT_PUBLIC_*`. Alle tre er hemmelige på Vercel-serveren. Endepunktet har ingen lagring av henvendelser i database og skriver ikke kundeopplysninger i logger.

## Krav før trinn 2 / aktivisering

1. Konfigurer og verifiser e-postdomenet med SPF/DKIM hos leverandør og Resend; opprett servernøkkel.
2. Opprett Turnstile site key + secret med vertene `www.donaanna.com` og `donaanna.com` (prøvedomener særskilt). Verifiser serverrespons per kall.
3. Oppdater personvernteksten med datakategorier, formål, databehandler, lagringstid og opplyste kontaktpunkter. Få juridisk godkjenning før opptak av persondata.
4. Implementer frontend med Turnstile-komponent og robust statusbehandling: ikke gi «sendt»-melding før `accepted: true`; bruk fortsatt e-postfallback når endepunktet returnerer 503. Resett challenge per forsøk.
5. Utfør spam-, rate-/bot-, origin-, størrelses- og e-postleveringstest i preview. Turnstile er bare et lag: dersom trafikk øker, legg til varig rate limiting via godkjent datalager/gateway før bred utrulling.
6. Sett opp rutine for besvaring og sletting av kundehenvendelser i innboksen.

## Avgrensninger

- Ikke la en nettleser velge mottakeradresse eller avsender.
- Ingen direkte utsendelse til kunde, ordrebekreftelse, lagerreservasjon eller automatisk oppfølging.
- Ingen database/CRM-lagring uten særskilt beslutning om databehandling og tilgangsstyring.
- Ikke annonser at skjemaet virker direkte før testen er grønn og nødvendig infrastruktur er aktivert.
- Dette PR-et leverer **kun backend under sikker standard-avslått konfigurasjon og dokumentasjon**.

## Sikker aktivering – ny ekstra port (12. november 2026)

`DONAANNA_INQUIRY_ENABLED=true` må legges inn **kun etter** at alle krav er oppfylt, i tillegg til Resend/Turnstile-hemmelighetene. Å sette inn API-nøkler alene aktiverer ikke mottaket. Miljøvariabelen skal holdes fraværende eller `false` frem til juridisk og teknisk godkjenning.

Automatiske tester i `tests/donaannaPublicInquiry.test.mjs` kontrollerer:
- Avslått mottak selv om e-postnøkler ligger i miljøet.
- Avvisning av feil origin og store JSON-bodies (også ferdig parsede body-objekter).
- Avvisning av ugyldige produkter og bot-verifisering som feiler.
- Aksept først etter vellykket bot-kontroll **og** e-postleverandørrespons.
- HTTP 502 ved feil hos e-postleverandøren, uten falskt «sendt»-signal.

Ingen ende-til-ende-test med ekte e-postadresse, Resend eller Turnstile er gjennomført. Slike tester må utføres før nettskjemaet byttes fra e-postfallback til direktesending.

## Trinn 2 – frontend klargjort, men ikke aktivert

`components/PublicB2BLandingPage.tsx` støtter nå et alternativt direkte innsendingløp, kontrollert av **begge** følgende offentlige Vite-variabler i bygget:
- `VITE_DONAANNA_DIRECT_INQUIRY=true`
- `VITE_DONAANNA_TURNSTILE_SITE_KEY=<offentlig site key>`

Disse skal **ikke** settes før hele aktiveringslisten er fullført, inkludert `DONAANNA_INQUIRY_ENABLED=true` på serveren, godkjent personverntekst og en fysisk e-postleveringstest. Per nå er ingen av front-end flaggene konfigurert: dagens mailto-funksjon forblir uendret.

Når flaggene er satt, rendres en Turnstile-kontroll og klienten kontrollerer spesifikt `{ accepted: true }` fra API-et før den viser kvittering. Ved 503, nettverksfeil eller leveringsfeil kommer tydelig feilmelding og en tilgjengelig knapp for mailto-reserve. Klientens feilflyt er testet i `tests/donaannaPublicInquiryClient.test.mjs`.

**Driftskrav før aktivering:** oppdater /personvern i samme produksjonsendring, test på mobil og desktop, og bekreft at `info@donaanna.com` faktisk mottar en testmelding. Den serverbaserte løsningen og frontend må publiseres som én kontrollert operasjon; bare å konfigurere den ene siden er utilstrekkelig.
