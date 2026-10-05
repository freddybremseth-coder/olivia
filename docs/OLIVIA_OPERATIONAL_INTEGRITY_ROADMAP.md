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
   - manuell parsellkorrigering er autoritativ for det konkrete GEO-punktet
   - senere GPS-punkter kan bruke tidligere manuelle/høysikre GEO-punkter som romlig hukommelse når polygonmatch mangler
   - romlig hukommelse får aldri endre juridiske/Catastro-grenser automatisk
   - operativ struktur bygges som parsell → sone → tregruppe → fast GEO-punkt
   - sone- og tregruppeankre opprettes fra faktisk feltposisjon og kan forbedres når flere ekte data finnes
   - brukeren kan bekrefte flere feltpunkter i samme sone; punktene er menneskelig bekreftet operativ geografi
   - tre eller flere sonepunkter kan vises som et stiplet operativt fotavtrykk, aldri som juridisk/Catastro-grense
   - AI bruker nærmeste bekreftede sonepunkt i stedet for bare første soneanker når slik historikk finnes
   - live feltobservasjoner kan få forslag til sone og tregruppe bare ved entydig høy GEO-sikkerhet
   - manuell sone/tregruppe overstyrer alltid GEO-forslag og blir ikke erstattet ved ny GPS-oppdatering
   - tvetydig sone/tregruppe blir aldri auto-valgt
   - observasjoner lagrer om sone/tregruppe kom fra manuelt valg eller GEO-forslag, inklusive metode og sikkerhet
   - fersk felt-GEO kan følge mellom Feltmodus, Feltlogg, Feltkonsulent og Beskjæring i samme nettlesersesjon
   - aktiv felt-GEO utløper etter fem minutter og må da hentes på nytt; gammel sesjonsposisjon skal aldri late som live-posisjon
   - Feltmodus viser en enkel kartleggingsrunde per aktiv parsell slik at gårdskunnskapen fylles systematisk uten ny modul
   - GPS-kvalitet styrer hva som kan læres inn: sonepunkt krever ca. ±35 m eller bedre, tregruppe ±25 m eller bedre, fast punkt ±20 m eller bedre
   - svakere GPS kan fortsatt lagres som observasjon/evidens, men får ikke lære operativ kartstruktur
   - faste GEO-punkter kan representere brønn, pumpe, dryppunkt, adkomst, referansetre, problemsted, lager eller bygg
   - faste GEO-punkter kan få gjentatte kontrollbilder som tidslinje; ny live GPS må bekrefte at brukeren faktisk står nær punktet
   - kontrollbildets historikk er sammenligningskontekst, aldri automatisk bevis på dagens tilstand
   - Feltkonsulent og Beskjæringsekspert får nærliggende operativ gårdsstruktur som kontekst, separat fra historiske observasjoner
   - status: implementert

7. **Farm issues / oppfølgingssaker**
   - skadedyr, sykdom, vanningsfeil og andre avvik får livssyklus fra første observasjon til lukket sak
   - oppfølgingsintensjon beholdes også i offline-kø
   - ny kontroll kobles til samme sak og oppdaterer latest observation
   - resolved/dismissed krever eksplisitt menneskelig handling; AI lukker aldri saken
   - status: implementert

8. **Kunnskapskø i stedet for dupliserte spørsmål**
   - semantisk samme manglende faktum samles på tvers av Feltkonsulent, Beskjæringsekspert og andre agenter
   - ett svar lukker samme kunnskapsbehov og oppretter én verifisert kunnskapssannhet
   - Daily/Intelligence teller unike kunnskapsbehov, ikke rå duplikatrader
   - konkrete foto-behov blir deterministiske feltoppgaver med riktig parsell
   - tekstsvar fullfører aldri en fotooppgave; faktisk oppgaveutførelse må bekreftes eksplisitt
   - status: implementert

9. **Task-sensitive arbeidsvindu fra vær**
   - vær påvirker timing, aldri sannhetsstatus
   - sprøyting, beskjæring, høsting, vanning og feltkontroll bruker ulike kriterier
   - Daily rangerer beste dag i et femdagers vindu og viser regn, sannsynlighet og vind
   - sesongrelevans og aktive årshjulspunkter styrer hvilke arbeidsvinduer som vises
   - produktetikett, regelverk og faktisk feltbehov har alltid forrang
   - status: implementert

10. **Dokumentert øko/CAECV-status**
    - sertifisering og compliance skal komme fra dokumentert status, ikke UI-inferens
    - parsellstatus er eksplisitt: ukjent, søknad pågår, overgang, sertifisert, suspendert eller avvik
    - sertifikatnummer, gyldighet, inspeksjon og dokumentgrunnlag lagres separat fra selve parsellen
    - aktiv CAECV-sak kan gi kontekst, men skal ikke tolkes som ferdig sertifisering
    - status: implementert

11. **Live Daily**
    - Daily skal refreshe etter sannhetsendringer, fokus/tilbakekomst og synkronisering

## Ikke prioritert før grunnmuren er fylt med data

- nye store AI-agenter
- automatisk vanningsstyring
- avansert yield prediction
- autonome agronomiske regelendringer
- droneanalyse som primær beslutningskilde

Disse vurderes først når feltobservasjoner, soner, tregrupper, sensorer, vanning og læringsfasit faktisk er i regelmessig bruk.
