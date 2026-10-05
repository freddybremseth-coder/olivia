# Olivia Operational Integrity & Field Adoption

Status: LOCKED · 2026-10-04

## Product principle

Olivia skal prioritere sann, fersk og handlingsbar gårdsinformasjon foran flere moduler.

Kjeden er:

**Olivia Daily → handling → faktisk utførelse → evidens → verifisert gårdssannhet → læring**

Ingen forslag, planer, kjøp eller AI-vurderinger skal bli behandlet som utført arbeid uten eksplisitt verifikasjon.

## Locked priorities

1. **Én avlingssesongmodell**
   - crop season er økonomisk/operativ attribusjon
   - faktura-, betalings- og regnskapsdato beholdes separat
   - eksplisitt avlingssesong er autoritativ
   - kategori/dato kan bare foreslå sesong

2. **Ingen demo-data i operative produksjonsråd**
   - tomt datagrunnlag skal vises som ukjent/manglende data
   - demo/trening skal være eksplisitt separert fra produksjon

3. **Én felles sensor quality/freshness gate**
   - operative råd bruker kun ferske og akseptable målinger
   - gammel/lavkvalitets data beholdes som historikk, ikke dagens sannhet

4. **Feltmodus og lav registreringsfriksjon**
   - bilde, vanning, problem, utført arbeid, høsting og måling skal kunne registreres raskt fra mobil
   - GEO skal foreslå riktig parsell når datagrunnlaget er sikkert

5. **Offline-first feltfangst**
   - gårdssannhet skal kunne lagres lokalt ved dårlig dekning og synkroniseres senere

6. **GEO/media evidence**
   - live kamerabilder kan få GPS-posisjon med eksplisitt enhetstillatelse
   - parsell matches mot registrerte polygoner
   - tvetydig geografi skal ikke auto-klassifiseres
   - galleriopplasting skal ikke late som dagens GPS er original bildeposisjon
   - geografisk evidens skal kunne brukes til kart, historikk og læring
   - nye analyser kan bruke nærliggende historiske observasjoner som romlig hukommelse
   - gammel tilstand er kun historisk kontekst; ny observasjon/måling har alltid forrang
   - gjentatte GEO-punkter kan senere danne faktiske drifts-soner/hotspots, men først når nok ekte data finnes

7. **Farm issues / oppfølgingssaker**
   - skadedyr, sykdom, vanningsfeil og andre avvik får livssyklus fra første observasjon til lukket sak
   - oppfølgingsintensjon beholdes også i offline-kø
   - ny kontroll kobles til samme sak og oppdaterer latest observation
   - resolved/dismissed krever eksplisitt menneskelig handling; AI lukker aldri saken
   - status: implementering pågår

8. **Kunnskapskø i stedet for dupliserte spørsmål**
   - semantisk samme manglende faktum samles på tvers av Feltkonsulent, Beskjæringsekspert og andre agenter
   - ett svar lukker samme kunnskapsbehov og oppretter én verifisert kunnskapssannhet
   - Daily/Intelligence teller unike kunnskapsbehov, ikke rå duplikatrader
   - konkrete foto-behov blir deterministiske feltoppgaver med riktig parsell
   - tekstsvar fullfører aldri en fotooppgave; faktisk oppgaveutførelse må bekreftes eksplisitt
   - status: implementert

9. **Task-sensitive arbeidsvindu fra vær**
   - vær påvirker timing, aldri sannhetsstatus
   - sprøyting, beskjæring, høsting og vanning bruker ulike kriterier

10. **Dokumentert øko/CAECV-status**
    - sertifisering og compliance skal komme fra dokumentert status, ikke UI-inferens

11. **Live Daily**
    - Daily skal refreshe etter sannhetsendringer, fokus/tilbakekomst og synkronisering

## Ikke prioritert før grunnmuren er fylt med data

- nye store AI-agenter
- automatisk vanningsstyring
- avansert yield prediction
- autonome agronomiske regelendringer
- droneanalyse som primær beslutningskilde

Disse vurderes først når feltobservasjoner, soner, tregrupper, sensorer, vanning og læringsfasit faktisk er i regelmessig bruk.
