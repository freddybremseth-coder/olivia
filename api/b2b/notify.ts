import type { IncomingMessage, ServerResponse } from 'http';
import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const MAX_BODY_BYTES = 16_384;

function reply(res: ServerResponse, status: number, message: string) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify({ message }));
}

function equalsSecret(actual: string, expected: string): boolean {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function bodyText(req: IncomingMessage & { body?: unknown }): Promise<string> {
  // Vercel parses application/json into request.body before invoking Node functions.
  if (req.body !== undefined && req.body !== null) {
    const parsed = typeof req.body === 'string' ? req.body :
      Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);
    if (Buffer.byteLength(parsed, 'utf8') > MAX_BODY_BYTES) throw new Error('payload_too_large');
    return parsed;
  }
  let size = 0;
  const parts: Buffer[] = [];
  for await (const part of req) {
    const chunk = typeof part === 'string' ? Buffer.from(part) : part as Buffer;
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('payload_too_large');
    parts.push(chunk);
  }
  return Buffer.concat(parts).toString('utf8');
}

function htmlEscape(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char] || char);
}

export default async function handler(req: IncomingMessage & { method?: string }, res: ServerResponse) {
  if (req.method !== 'POST') { reply(res, 405, 'Method not allowed'); return; }

  const webhookSecret = process.env.DONAANNA_B2B_WEBHOOK_SECRET || '';
  const resendKey = process.env.RESEND_API_KEY || '';
  const sender = process.env.DONAANNA_B2B_FROM_EMAIL || '';
  const recipients = (process.env.DONAANNA_B2B_NOTIFY_EMAILS || '').split(',').map(v => v.trim()).filter(Boolean);
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!webhookSecret || !resendKey || !sender || !recipients.length || !supabaseUrl || !serviceKey) {
    reply(res, 503, 'B2B notifications not configured'); return;
  }

  const providedSecret = String(req.headers['x-donaanna-webhook-secret'] || '');
  if (!equalsSecret(providedSecret, webhookSecret)) { reply(res, 401, 'Unauthorized'); return; }

  let event: { type?: unknown; table?: unknown; schema?: unknown; record?: { id?: unknown } };
  try { event = JSON.parse(await bodyText(req)); }
  catch (error) { reply(res, error instanceof Error && error.message === 'payload_too_large' ? 413 : 400, 'Invalid request'); return; }

  const id = event?.record?.id;
  if (event.type !== 'INSERT' || event.table !== 'b2b_tasting_requests' || event.schema !== 'olivia'
      || typeof id !== 'string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
    reply(res, 400, 'Unexpected webhook event'); return;
  }

  // Never trust customer details from the webhook payload; re-read the saved row server-side.
  const supabase = createClient(supabaseUrl, serviceKey, {
    db: { schema: 'olivia' }, auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.from('b2b_tasting_requests')
    .select('id,company,email,contact_role,delivery_address,notes,created_at')
    .eq('id', id).maybeSingle();
  if (error || !data) { reply(res, 502, 'Unable to load inquiry'); return; }

  let details: Record<string, unknown> = {};
  try { details = JSON.parse(data.notes || '{}'); } catch { /* optional legacy notes */ }
  const fields: Array<[string, unknown]> = [
    ['Bedrift', data.company], ['Kontaktperson', details.contact_name], ['E-post', data.email],
    ['Rolle', data.contact_role], ['Kundetype', details.buyer_type], ['Produkt', details.product],
    ['Estimert behov', details.estimated_need], ['Område', data.delivery_address],
    ['Melding', details.message], ['Mottatt', data.created_at],
  ];
  const html = `<h2>Ny B2B-henvendelse til Doña Anna</h2><table>${fields.map(([label, value]) =>
    `<tr><th align="left" valign="top">${htmlEscape(label)}</th><td>${htmlEscape(value).replace(/\n/g, '<br>')}</td></tr>`
  ).join('')}</table><p>Behandle henvendelsen i administratoroversikten.</p>`;

  let response: Response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json',
        'Idempotency-Key': `donaanna-b2b-${id}`,
      },
      body: JSON.stringify({ from: sender, to: recipients,
        subject: `Doña Anna: Ny B2B-henvendelse fra ${String(data.company).replace(/[\r\n]/g, ' ').slice(0, 80)}`, html }),
    });
  } catch { reply(res, 502, 'Email provider unavailable'); return; }

  if (!response.ok) { reply(res, 502, 'Email provider rejected notification'); return; }
  reply(res, 200, 'Notification accepted');
}
