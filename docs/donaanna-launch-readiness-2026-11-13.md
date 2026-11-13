# Doña Anna — lanseringsklarhet og prioriteringer

Oppdatert 13. november 2026. Dette er en operativ sjekkliste, **ikke en bekreftelse på at hele nettstedet er ferdig testet eller produktene er salgbare**.

## Oppnådd og verifisert

- PR #201 og PR #202: siste produksjonsversjon fra PR #202 er `READY` i Vercel før denne endringen.
- Fem produktidentiteter beholdes på forsiden. Alle produktpåstander, prislapper og lagerstatus må være dokumentert/godkjent per produkt.
- Interesseforespørsler for smaksprøve, smakssett, personlig gave og firmagave er tilgjengelige via brukerens e-postprogram.
- Direkteinnsending er **deaktivert** inntil e-postlevering, botkontroll og personvern er klare.
- De ti planlagte gårdsbildene er **ikke publisert**. De krever verifiserte originalfiler og dokumentert tillatelse til kommersiell bruk.
- Illustrasjonsbilder må beskrives som illustrasjoner og må ikke utgi seg for å være dokumentasjonsfoto fra gården, en bestemt sort eller innhøsting.

## Prioritert fremdrift

| Prioritet | Leveranse | Krever | Ferdig når |
| --- | --- | --- | --- |
| P0 | Stabil offentlig nettside | Vercel-bygget og tester grønne | Alle viktige ruter og kontakt-CTA-er er kontrollert i faktisk nettleser på mobil og desktop |
| P0 | Ekte kontaktmottak | Resend-konto, verifisert Doña Anna-avsender, Turnstile, personvernoppdatering | Testhenvendelse mottatt og dokumentert; feil og spam håndteres korrekt |
| P1 | Autentiske gårdsbilder | Eksakte 10 filer i riktig plassering + skriftlig avklart bruksrett | Ingen brutte bilder, presise alt-tekster, riktig motiv og foto-kreditering |
| P1 | Produktpresentasjon | Godkjent etikett og produktfoto for hvert produkt | Tydelig skille på tilgjengelig, planlagt og interesseliste, ingen usikre påstander |
| P1 | Dokumentert batch og leveranse | Faktisk produksjon, analyse, format, pris, leveringsvilkår | Kjøp/smaksprøve tilbys bare når leveranse kan bekreftes |
| P2 | Kundearbeid og gaver | P1 leveringsgrunnlag | Konkrete tilbud til privat/B2B med oppfølgingstid og ansvarlig |
| P2 | SEO/AEO/GEO og innhold | Korrekte produktdata og autentiske fotografier | Relevant internlenking og faktagrunnlag uten duplikat- eller udokumenterte svar |

## Stoppskilt

1. Ikke slå på `estatePhotosPublished` uten filverifikasjon og godkjente kommersielle bruksrettigheter.
2. Ikke sett `DONAANNA_INQUIRY_ENABLED` eller `VITE_DONAANNA_DIRECT_INQUIRY` til true før bekreftet end-to-end-levering og personverngjennomgang. Se `docs/donaanna-direct-inquiry-production-runbook-2026-11-12.md`.
3. Ikke publiser pris, lager, kvalitetsklasse, økologisertifisering, prisvinnende sensorikk eller batchdata uten dokumentasjon.
4. Ikke kall genererte motiv eller generiske foto for dokumentariske gårdsbilder.
5. Ikke påstå at `mailto:` er en innsending fra nettstedet: brukeren må selv sende e-posten.

## Kontrollpunkter for neste praktiske gjennomgang

- Mobil (iOS/Android): toppnavigasjon, scrollankere, produktkort, skjemavalidering og e-postapp.
- Desktop: fire kundeløp; bytt fra gave til smaksprøve, og fra privat til bedrift.
- Offentlige produktkort: nøyaktig fem produkter, synlig tilgjengelighetstekst, ingen uautoriserte priser.
- Bildemotiver: illustrasjoner merket korrekt, ekte foto ikke aktivert uten rettigheter.
- Kontakt: verifiser `info@donaanna.com` som faktisk mottaker før automatisk sending.

## Anbefalt fokus

Inntil foto- og e-posttilkoblingene kan fullføres, **ikke opprett flere separate små PR-er uten konkret feil eller dokumenterbar effekt**. Samle forbedringer i en testet release som reelt løfter troverdighet, kundeopplevelse og salgsklarhet.
