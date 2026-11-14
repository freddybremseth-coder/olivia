# Doña Anna – dokumentasjonsstandard for premiumoljer
Dato: 14.11.2026. Internt arbeidsdokument, ingen ferdig produktgodkjenning.

## Mål
Skape en reproduserbar dokumentasjonskjede fra trær og høst til tappet flaske. Historie, pris og produktetikett skal ikke gå lenger enn bevisene. Spesielt Raíz Antigua skal ikke omtales som et gitt antall hundreårige Changlot Real-trær eller et begrenset opplag før dette kan dokumenteres.

## Minste dokumentasjon før batchpåstander
| Kontroll | Registreres | Bevis | Status |
| --- | --- | --- | --- |
| Kartlegging | Parsell-ID, tre-ID ved individuell høsting, GPS eller kartreferanse, sort | Eiers kart + daterte bilder | Avventer |
| Alder og historie | Alder som estimat eller dokumentert intervall; metode/kilde | Gamle jordbruksregistre, ekspertvurdering eller datert kilde | Avventer |
| Høsting | Dato, mannskap, parseller/trær, samlet kg oliven, sort der kjent | Innveiingsjournal + foto | Avventer |
| Transport og pressing | Leveringsdato, mølle, lot-ID, eventuell blanding, ekstraksjon og utbytte | Møllerapport/faktura/batchjournal | Avventer |
| Tank og lagring | Tank-ID, volum, fyllingsdato, lagringsbetingelser, alle overføringer | Tank- og overføringslogg | Avventer |
| Kvalitet | Kjemiske analyser og kvalifisert sensorisk vurdering for akkurat partiet | Rapport med batch-ID, dato, laboratorium/panel | Avventer |
| Tapping | Tappedato, batch-/lotnummer, antall flasker, format, emballasje | Tappejournal, etikettgodkjenning, kontrollfoto | Avventer |
| Markedsføring | Påstand → kilde, offentlig tekst, godkjenner, dato | Påstandsregister | Avventer |

**Hvis det skjer blanding med annet råstoff, må påstander om eksklusiv opprinnelse vurderes på nytt.** Det er ikke nok å ha gamle trær på gården; olivenene må faktisk kunne knyttes til batchen.

## Minimumsfelt for intern batchjournal (ingen nye IT-systemer nødvendig)
- `lot_id`: unik ID som følger olje og flaske
- `product_slug`: verde-vivo / verde-alto / raiz-antigua / cocina-viva
- `harvest_start`, `harvest_end`, `parcel_ids`, `tree_ids` (hvis relevant)
- `cultivars`, `olive_kg`, `mill_lot_ids`, `oil_litres`
- `storage_tank_ids`, `bottled_at`, `bottle_size_ml`, `bottle_count`
- `analysis_ids`, `sensory_panel_id`, `label_revision`
- `source_files`, `approved_claims`, `approved_by`, `approved_at`

Oppbevar bevisfiler internt og publiser bare relevante produktfakta og trygge dokumenter. Ikke publiser eksakte private kartkoordinater til enkelttrær uten separat vurdering.

## Produktstrategi – ikke markedsførte garantier
**Verde Vivo:** tidlig høsting. Vis dato, olivenmengde, utbytte, sensorikk og faktisk kvalitetsklasse per batch.

**Verde Alto:** bredere matbruk og mål om balanse. Ikke lov mildhet eller harmoni før vurdering.

**Raíz Antigua:** gårdens arv og eldre Changlot Real-trær, med eventuell tree-to-bottle-historie **kun hvis dokumentert**. Ingen standardpåstand om «100 år», «40 trær», «nummerert opplag» eller «høye polyfenoler».

**Cocina Viva:** eget B2B-produkt; dokumenter format, batch, kvalitet, pris og leveringsmuligheter separat.

## Port for 80 euro per flaske
En pris på €80 er en **hypotese**, ikke en godkjent salgspris. Før offentlig lansering:
1. Dokumenter oljens lovlige kvalitetsklasse, prøvevurdering og sporbarhet.
2. Godkjenn fysisk flaske/kork/etikett/emballasje og test lys-/oksygenbeskyttelse og transportskade.
3. Beregn faktiske enhetskostnader (avling, pressing, analyser, emballasje, distribusjon, moms og retur).
4. Gjennomfør blindtest og prisaksept-test med relevante premiumkunder/innkjøpere.
5. Bekreft antall tappede flasker før «begrenset opplag»/nummerering markedsføres.
6. Få etikett og relevante markedsføringspåstander kontrollert for gjeldende regler før salg.

## Vannstrategi og ærlighet
Doña Anna har oppgitt at dryppvanning er avsluttet, og at trærne får lengre tørkeperioder. Dette kan redusere avlingen betydelig. Beskriv valget og risikoen, men ikke skriv at tørke beviselig gir mer konsentrert, mer polyfenolrik eller bedre olje uten egen dokumentasjon. Trærnes langsiktige helse og kvalitet må følges.

## Redaksjonell statusmatrise
- **Gårdsfakta:** særskilt registrert og internt kontrollert.
- **Fortellerhistorie:** eiernes erfaringer, omtalt som erfaring eller ambisjon.
- **Batchfakta:** offentlig først etter dokumentert kobling til lot-ID.
- **Fagpåstand:** med kilde og faglig vurdering.
- **Prispåstand:** offentlig først etter kommersiell beslutning.
