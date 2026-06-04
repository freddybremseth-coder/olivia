export type OrganicApplicationItemStatus = 'not_started' | 'in_progress' | 'ready' | 'submitted' | 'not_applicable' | 'blocked';
export type OrganicApplicationItemParty = 'previous_holder' | 'new_holder' | 'both';
export type OrganicApplicationItemType = 'form' | 'supporting_document' | 'task' | 'decision';

export interface OrganicApplicationItem {
  id: string;
  party: OrganicApplicationItemParty;
  type: OrganicApplicationItemType;
  title: string;
  caecvCode?: string;
  fileName?: string;
  required: boolean;
  status: OrganicApplicationItemStatus;
  priority: 'critical' | 'high' | 'medium' | 'low';
  summary: string;
  appAction: string;
  notes?: string;
}

export const CAECV_CONTACT = {
  authority: 'CAECV · Comité de Agricultura Ecológica de la Comunitat Valenciana',
  controlCode: 'ES-ECO-020-CV',
  email: 'certification@caecv.com',
  phone: '+34 962 538 241 / +34 686 377 696',
  address: 'C/ Tramontana, 16, Parque Industrial Ciudad de Carlet, 46240 Carlet, Valencia',
  hours: 'Mandag–fredag 09:00–14:00, tirsdag og torsdag også 16:00–18:00. Kun etter avtale.',
};

export const ORGANIC_CHANGE_OF_OWNERSHIP_ITEMS: OrganicApplicationItem[] = [
  {
    id: 'prev-withdrawal',
    party: 'previous_holder',
    type: 'form',
    title: 'Tidligere eier: Solicitud de retirada voluntaria de la certificación',
    caecvCode: 'FPO05170',
    fileName: 'X_FPO05 170e0_20220112_fr_RVP-T.docx',
    required: true,
    status: 'blocked',
    priority: 'critical',
    summary: 'Tidligere sertifikatholder må be om frivillig tilbaketrekking, helt eller delvis, og oppgi at årsaken er eierskifte til ny eier.',
    appAction: 'Opprett oppgave til Emilio/tidligere eier om å sende retrait/retirada og be om kopi/kvittering fra CAECV.',
    notes: 'Dette er ikke et dokument dere alene kan fullføre hvis sertifikatet står på tidligere eier.',
  },
  {
    id: 'new-activity-notification',
    party: 'new_holder',
    type: 'form',
    title: 'Notificación de actividad',
    caecvCode: 'FPO05164',
    fileName: 'X_FPO05 164e6_20260119_Notificacion de actividad.pdf',
    required: true,
    status: 'not_started',
    priority: 'critical',
    summary: 'Hovedsøknad for ny operatør. For dere bør den typisk markeres som certificación inicial, operador/a individual, producción og vegetales/productos vegetales no transformados dersom dere søker planteproduksjon for oliven.',
    appAction: 'Fyll ut eierdata, kontaktdata, faktura-/betalingsvalg, opplæringsstatus og signer digitalt eller manus.',
  },
  {
    id: 'new-certification-agreement',
    party: 'new_holder',
    type: 'form',
    title: 'Acuerdo de Certificación',
    caecvCode: 'FPO05165',
    fileName: 'X_FPO05 165e3_20260219_cas_val_ACU.pdf',
    required: true,
    status: 'not_started',
    priority: 'critical',
    summary: 'Avtalen for kontroll og sertifisering. Hvis den signeres manuelt må alle sider signeres; digital signatur krever normalt bare signatur på siste side etter CAECV-instruks.',
    appAction: 'Legg som obligatorisk dokument i søknadspakken og sjekk signaturkrav før innsending.',
  },
  {
    id: 'new-data-authorization',
    party: 'new_holder',
    type: 'form',
    title: 'Autorización para envío de información, comunicación y publicación de datos',
    caecvCode: 'FPO1008',
    fileName: 'X_FPO10 08e0_20211126_WEB.pdf',
    required: true,
    status: 'not_started',
    priority: 'high',
    summary: 'Obligatorisk fullmakt/samtykke for informasjon, kommunikasjon og eventuell publisering av data.',
    appAction: 'Avklar om dere aksepterer publikasjon med e-post/telefon eller kun minimumspublisering som følger av regelverket.',
  },
  {
    id: 'new-plot-list',
    party: 'new_holder',
    type: 'form',
    title: 'Relación de parcelas de la explotación',
    caecvCode: 'FPO05175',
    fileName: 'X_FPO05-175e3_20220328_fr_REL.xlsx',
    required: true,
    status: 'not_started',
    priority: 'critical',
    summary: 'Listen må inkludere ALLE parseller som inngår i gården, både konvensjonelle og parseller som søkes økologisk sertifisert. Hvis parceller kommer fra annen sertifisert operatør skal CT angis i første kolonne.',
    appAction: 'Bygg eksport fra olivia.parcels til CAECV-parselliste og marker CT for parceller overtatt fra tidligere sertifisert operatør.',
  },
  {
    id: 'new-operation-description',
    party: 'new_holder',
    type: 'form',
    title: 'Descripción de la explotación y medidas',
    caecvCode: 'FPO05169',
    fileName: 'X_FPO05 169e4_20220218_fr_DESC.docx',
    required: true,
    status: 'not_started',
    priority: 'critical',
    summary: 'Beskrivelse av gårdsdrift og tiltak: driftstype, planteproduksjon, skadedyr/forebygging, jord/fruktbarhet, ugras, biodiversitet, innsatsmidler, sporbarhet, reklamasjoner, avvik og obligatoriske registre.',
    appAction: 'Koble denne til gårdslogg, vanning, behandlinger, innsatsmidler, batch/sporbarhet og dokumentasjon i Olivia.',
  },
  {
    id: 'new-sepa',
    party: 'new_holder',
    type: 'form',
    title: 'SEPA direct debit eller banksertifikat',
    caecvCode: 'FPO05174',
    fileName: 'X_FPO05 174e2_20220330_fr_SEPA.docx',
    required: false,
    status: 'not_started',
    priority: 'medium',
    summary: 'Kun nødvendig hvis dere vil betale CAECV-gebyrer med direkte belastning. Alternativt må betalingskvittering/overføring håndteres etter CAECV sine regler.',
    appAction: 'Legg inn betalingsvalg og lagre SEPA/bankdokument i dokumentmodulen.',
  },
  {
    id: 'new-representation',
    party: 'new_holder',
    type: 'form',
    title: 'Autorización de representación ante el CAECV',
    caecvCode: 'FPO05181',
    fileName: 'X_FPO05 181e1_20220221_fr_AUT_R.docx',
    required: false,
    status: 'not_started',
    priority: 'high',
    summary: 'Hvis Rafael Asencio eller annen representant skal håndtere søknaden, kan opptil to representanter registreres. Dokumentet må signeres av begge og ID for representant må legges ved.',
    appAction: 'Avklar hvem som skal være representant og om det bare gjelder mero trámite eller også handlinger som krever notarfullmakt.',
  },
  {
    id: 'new-label-use',
    party: 'new_holder',
    type: 'form',
    title: 'Comunicación previa de términos ecológicos, indicaciones y logos',
    caecvCode: 'FPO05178',
    fileName: 'FPO05-178e0_20211126_ETI.pdf',
    required: false,
    status: 'not_started',
    priority: 'medium',
    summary: 'Obligatorisk hvis dere skal bruke økologiske begreper, EU-logo, CAECV-logo, etiketter eller reklame for økologisk produkt.',
    appAction: 'Koble til Doña Anna etikett-/QR-modul før dere bruker øko-logo eller øko-påstander i markedsføring.',
  },
  {
    id: 'new-id-holder',
    party: 'new_holder',
    type: 'supporting_document',
    title: 'Kopi av NIF/NIE for innehaver',
    required: true,
    status: 'not_started',
    priority: 'critical',
    summary: 'For fysisk person kreves kopi av NIF/NIE. Hvis eier er Anna Bremseth, bør NIE/NIF-dokument legges i privat dokumentarkiv.',
    appAction: 'Last opp NIE/NIF under Eierskapsdokumenter eller CAECV-dokumenter og merk som identitetsdokument.',
  },
  {
    id: 'new-training',
    party: 'new_holder',
    type: 'decision',
    title: 'Økologisk landbruksopplæring eller forpliktelse',
    required: true,
    status: 'not_started',
    priority: 'high',
    summary: 'Hvis dere har relevant opplæring, legg ved sertifikat. Hvis ikke, kryss av for forpliktelse om opplæring etter CAECV-kravet.',
    appAction: 'Registrer enten kursbevis eller oppgave om å fullføre økologisk landbrukskurs innen frist.',
  },
  {
    id: 'submission-method',
    party: 'new_holder',
    type: 'decision',
    title: 'Velg innsendingsmetode: digital signatur eller post/personlig levering',
    required: true,
    status: 'not_started',
    priority: 'critical',
    summary: 'Ved håndskrevet signatur må dokumentene leveres personlig etter avtale eller sendes per post. Ved ACCV/FNMT digital signatur kan de sendes per e-post til CAECV.',
    appAction: 'Legg inn valgt signaturmetode og opprett oppgave for sending til certification@caecv.com eller fysisk/post til Carlet.',
  },
];

export const CAECV_EMAIL_SUMMARY = `CAECV opplyser at ved eierskifte må tidligere holder sende Application/Solicitud de Retirada Voluntaria del Certificado, med grunn eierskifte til ny eier. Ny eier må søke som PLANT PRODUCTION operator og levere generell dokumentasjon: Activity Notification, Certification Agreement, data communication/publication authorization, list of farm plots, operation description and measures, optional SEPA, optional representation authorization, label/logo notification if labeling/advertising, NIF/NIE copies, training proof or training commitment, and company documents if legal entity. Natural persons may submit hand-signed originals in person/by post, or digitally signed documents by e-mail. Legal entities must interact electronically with recognized digital signature linked to company NIF.`;
