# Doña Anna — ekte gårdsbilder og publiseringskart

Dato: 12. november 2026  
Kilde: 10 originalfotografier levert av gårdens eiere i ChatGPT-samtale 12.11.2026.

## Policy før publisering

- Bruk **kun originalfotografier fra gården** i denne serien. Ikke generer eller erstatt dem med AI-bilder.
- Ikke presenter illustrasjoner eller generiske bilder som dokumentasjon fra gården.
- Ikke hev at et konkret tre er flere hundre år gammelt uten dokumentasjon.
- Ikke knytt frukt til navngitt olivensort eller et bestemt kommersielt produkt uten bekreftet arts-/parti-/sortstilknytning.
- Ikke endre godkjent Verde Vivo-etikett, ikke vis uverifiserte produktflasker, og ikke bruk foto av frukt som produktfoto av ferdig olje.
- Før bilder kan brukes på nettsiden må de publiseres i offentlig tilgjengelig bildelagring med avklart rettighet og eksakt URL. Ingen genererte URL-er eller antatte filstier.
- Bildene er i stående format. Bruk `object-position`/responsive `<picture>` der originalen bevares; ikke skaler ett stående foto til full desktop-hero med unaturlig beskæring.
- For en produktside kan gårdsfoto brukes som **kontekstbilde**, mens produktkortets primære produktfoto fortsatt skal være tomt inntil godkjent flaskefoto finnes.

## Første seks — klar plasseringsplan

| Prioritet | Originalfil | Motiv | Anbefalt plassering | Foreslått alt-tekst | Kort tekst |
|---|---|---|---|---|---|
| 1 | IMG_8395(1).jpeg | Eldre oliventre med kraftig, vridd stamme, hele treet | Forside: #story, og /om-dona-anna | «Oliventre med kraftig stamme i Doña Annas olivenlund i Biar» | «Noen trær forteller historien før vi sier et ord.» |
| 2 | IMG_8332.jpeg | Oliven i grønn til lilla modning | Guide om modning og høstetidspunkt, med lenke til /tidlig-hostet-olivenolje | «Grønne og fiolette oliven på samme gren i olivenlunden i Biar» | «Fruktens modning er én av flere faktorer som påvirker oljeuttrykket.» |
| 3 | IMG_8320.jpeg | Nærbilde av grønne oliven | /verde-vivo som opprinnelse/kontekst, og relevant guide | «Grønne oliven på en gren på gården i Biar» | «Grønne nyanser i lunden. Produktets endelige sensoriske profil dokumenteres per batch.» |
| 4 | IMG_8396.jpeg | Detalj av grov stamme og røtter | /raiz-antigua som heritage-kontekst og #story | «Grov bark og røtter på et gammelt oliventre på gården i Biar» | «Røttene er en del av Doña Annas historie.» |
| 5 | IMG_8338.jpeg | Mørke oliven på gren | Fagartikkel om modningsgrader; bilde nummer to i guide | «Mørke oliven som henger på en gren i Biar» | «Fargen på frukten endres gjennom modningen.» |
| 6 | IMG_8331.jpeg | Flere oliventrær med tydelig landskap og himmel | /olivenolje-fra-biar og gårdsseksjon på forsiden | «Olivenlund med spredte oliventrær og blå himmel i Biar» | «Vårt utgangspunkt er landskapet og olivenlundene i Biar.» |

## Øvrige fire

| Originalfil | Motiv | Sekundær bruk |
|---|---|---|
| IMG_8391.jpeg | Oliventre i lunden | Bildegalleri på /om-dona-anna |
| IMG_8383.jpeg | Grønne oliven og grener | Guide om tidlig høsting, kontekst for Verde Alto uten sort-/batchpåstand |
| IMG_8343.jpeg | Grønne og lilla oliven mot blå himmel | Magasininnhold om modningsgrad |
| IMG_8334.jpeg | Hul stamme | /raiz-antigua; heritage-fortelling uten alderstall |

## Prioriterte publiseringsflater

1. **Forsiden**: ekte tre i gårdshistorien (#story), med kort tekst og «Les historien» til /om-dona-anna.
2. **/om-dona-anna**: bilde av hele lunden og 2–3 detaljer av de eldre trærne; fortellingen om Anna og Freddy; ingen udokumenterte alders- eller kvalitetsløfter.
3. **/olivenolje-fra-biar**: bredere gårdsfoto, opprinnelse, landskap, link videre til guider og produktene.
4. **/tidlig-hostet-olivenolje**: serie med grønne, blandede og mørke oliven; pedagogiske forklaringer på modning, høstetid og dokumentasjon.
5. **/verde-vivo, /verde-alto, /raiz-antigua**: forskjellig kontekstfoto med tydelig bildetekst «Fra gården», men ingen foto-merging med produktidentitet.
6. **Gaver**: inntil godkjente bilder av flasker/gavesett finnes brukes typografi eller ekte gårdsbilder, og CTA merket «Meld interesse».

## Design/teknikk ved opplasting

- Behold høyoppløselige originalfiler som master; lag web-derivater i WebP eller AVIF og responsiv størrelse.
- Bruk beskrivende filnavn uten persondata, f.eks. `biar-oliventre-grov-stamme.webp`, og redaksjonelle alt-tekster som kun beskriver det faktisk synlige.
- Sett `width`, `height` og `loading="lazy"` for bilder under første skjerm. For hero: `fetchpriority="high"` bare på aktivt LCP-bilde.
- Legg bildene i offentlig `content-images/dona-anna/garden-2026/` (eller et eksisterende godkjent område), og registrer etterpå eksakte publiserte URL-er i en egen manifestfil.
- Sjekk på iPhone og desktop før produksjon: fokuspunkt, lesbarhet, kontrast, hastighet, og at ingen bilder er strukket eller feil merket.

## Hva eierne må bekrefte

1. At de ti fotografiene er tatt på Doña Anna-eiendommen og kan brukes kommersielt på nettstedet.
2. At bilder av eldre trær kan omtales som «gamle» (men **ikke** gis eksakt alder uten kilde).
3. Om tre-/fruktbilder kan knyttes til spesifikke sorter eller parseller; inntil da brukes generell gårdskontekst.
4. Eventuelle liggende bilder og bilder av Anna og Freddy på gården for neste fase.

## Publiseringsstatus

Dette dokumentet er en redaksjonell bildekart-plan. Det publiserer **ikke** de opplastede JPEG-filene til offentlig lagring. Skift aldri bildekilde til en antatt URL uten at objektet faktisk finnes.
