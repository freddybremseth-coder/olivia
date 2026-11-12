import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Public lead intake. Disabled unless BOTH mail delivery and bot protection
 * are configured. No database write and no PII-bearing application logs.
 */
const SITE = 'https://www.donaanna.com';
const MAX_BODY_BYTES = 8_192;
const PRODUCTS = new Set(['Verde Vivo', 'Verde Alto', 'Raíz Antigua', 'Cocina Viva', 'Mesa · Gordal Noble (planlagt)']);
const KINDS = new Set(['tasting', 'gift', 'corporate-gift']);

type Request = IncomingMessage & { body?: unknown };

function respond(res: ServerResponse, status: number, value: Record<string, unknown>) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(value));
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function readBody(req: Request): Promise<unknown> {
  if (req.body !== undefined) return req.body;
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of req) {
    const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += part.length;
    if (bytes > MAX_BODY_BYTES) throw new Error('too-large');
    chunks.push(part);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const allowedHosts = new Set(['www.donaanna.com', 'donaanna.com']);

export default async function handler(req: Request, res: ServerResponse) {
  if (req.method !== 'POST') return respond(res, 405, { error: 'method_not_allowed' });

  // No live public endpoint until a sender domain, provider and CAPTCHA
  // are configured. This prevents accepting requests that cannot be delivered.
  const apiKey = process.env.DONAANNA_RESEND_API_KEY;
  const from = process.env.DONAANNA_MAIL_FROM;
  const secret = process.env.DONAANNA_TURNSTILE_SECRET;
  if (!apiKey || !from || !secret) return respond(res, 503, { error: 'not_configured' });

  const origin = req.headers.origin || '';
  if (origin !== SITE && origin !== 'https://donaanna.com') {
    return respond(res, 403, { error: 'origin_not_allowed' });
  }
  const length = Number(req.headers['content-length'] || 0);
  if (length > MAX_BODY_BYTES || !String(req.headers['content-type'] || '').startsWith('application/json')) {
    return respond(res, 413, { error: 'invalid_content' });
  }

  let raw: unknown;
  try {
    raw = await readBody(req);
  } catch {
    return respond(res, 400, { error: 'invalid_json' });
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return respond(res, 400, { error: 'invalid_payload' });
  const data = raw as Record<string, unknown>;
  if (text(data.website, 200)) return respond(res, 200, { accepted: true }); // honeypot

  const kind = text(data.kind, 30);
  const product = text(data.product, 100);
  const audience = text(data.audience, 15);
  const name = text(data.name, 100);
  const email = text(data.email, 254);
  const company = text(data.company, 120);
  const role = text(data.role, 100);
  const area = text(data.area, 150);
  const message = text(data.message, 1_500);
  const token = text(data.turnstileToken, 2_048);

  if (!KINDS.has(kind) || (kind === 'tasting' && !PRODUCTS.has(product)) ||
      !['private', 'business'].includes(audience) || !name || !email ||
      (audience === 'business' && !company) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !token) {
    return respond(res, 400, { error: 'invalid_fields' });
  }

  // Server-side verification. Turnstile tokens are single-use and time-limited.
  let verified = false;
  try {
    const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(8_000),
    });
    if (verification.ok) {
      const result = await verification.json() as { success?: boolean; hostname?: string };
      verified = result.success === true && allowedHosts.has(result.hostname || '');
    }
  } catch {
    // Fail closed: delivery must not occur if bot verification fails.
  }
  if (!verified) return respond(res, 403, { error: 'verification_failed' });

  const subject = `Doña Anna – ${kind === 'tasting' ? 'Smaksprøve' : kind === 'gift' ? 'Gave' : 'Firmagave'} (${audience === 'business' ? 'bedrift' : 'privat'})`;
  const body = [
    'Ny henvendelse via donaanna.com',
    `Type: ${kind}`,
    `Produkt: ${product || 'Ikke spesifisert'}`,
    `Kundetype: ${audience}`,
    `Navn: ${name}`,
    `E-post: ${email}`,
    `Bedrift: ${company || 'Ikke oppgitt'}`,
    `Rolle: ${role || 'Ikke oppgitt'}`,
    `Område: ${area || 'Ikke oppgitt'}`,
    `Melding: ${message || 'Ingen'}`,
  ].join('\n');

  try {
    const delivery = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'donaanna-site/1.0',
      },
      body: JSON.stringify({
        from,
        to: ['info@donaanna.com'],
        reply_to: [email],
        subject,
        text: body,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!delivery.ok) return respond(res, 502, { error: 'delivery_failed' });
    return respond(res, 200, { accepted: true });
  } catch {
    return respond(res, 502, { error: 'delivery_failed' });
  }
}
