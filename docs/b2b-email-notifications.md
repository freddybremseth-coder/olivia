# Doña Anna B2B — e-postvarsler (ikke aktivert)

Ny B2B-henvendelse lagres i `olivia.b2b_tasting_requests` uavhengig av e-postleveranse.
Serverendepunktet `POST /api/b2b/notify` kan varsle administrator ved `INSERT`.
Ingen e-postnøkler skal legges i Vite-klientvariabler (`VITE_*`).

## Før aktivering

1. Opprett/verifiser avsenderdomene i Resend. Sett følgende **serverhemmeligheter** på Doña Anna-deployment:
   - `RESEND_API_KEY`
   - `DONAANNA_B2B_FROM_EMAIL` (verifisert avsender)
   - `DONAANNA_B2B_NOTIFY_EMAILS` (kommaseparerte mottakere)
   - `DONAANNA_B2B_WEBHOOK_SECRET` (lang, tilfeldig separat hemmelighet)
   - `SUPABASE_URL` og `SUPABASE_SERVICE_ROLE_KEY` (server-only; eksisterende prosjekt)
2. Opprett en **Database Webhook** i Supabase Dashboard for schema `olivia`, table `b2b_tasting_requests`, event `INSERT` til `https://www.donaanna.com/api/b2b/notify` (eller korrekt deploy-host). Sett header `x-donaanna-webhook-secret` lik serverhemmeligheten. Ikke bruk service-role-nøkkelen i webhook-headeren.
3. Bekreft at URL-en ikke omdirigerer, og at deploy-plattformen kjører serverless API-ruten.
   Endepunktet håndterer både Vercels ferdig parsede JSON-body og rå HTTP-body. Payload-grense: 16 KiB.
4. Send én kontrollert henvendelse via offentlig skjema. Bekreft at henvendelsen ligger i administratoroversikten **og** at kun én e-post mottas.
5. Test ugyldig webhook-hemmelighet (`401`), feil hendelsestype (`400`) og midlertidig e-postleveransefeil (`502`). Ved leveransefeil finnes henvendelsen fortsatt i databasen og må følges opp fra administratoroversikten.

## Sikkerhet og levering

- Kun autentiserte webhooks kan starte varsling. Endepunktet leser lagrede data server-side og HTML-escaper alle kundeverdier.
- `Idempotency-Key` er stabil per henvendelses-ID, slik at gjentatte leveranser ikke normalt lager flere e-poster i leverandørens idempotensvindu.
- E-post inneholder personopplysninger: kontroller mottakere og databehandleravtale før aktivering.
- Dette er **ikke** integrasjon mot RealtyFlow PRO CRM. CRM-sync skal bygges separat med korrekt merkevare- og kundeseparasjon.
- Ved feil i webhook-konfigurasjon må nye henvendelser følges opp manuelt i B2B-innboksen. Det er ikke implementert en varig retry-kø.
