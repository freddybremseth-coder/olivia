import type { IncomingMessage, ServerResponse } from 'http';

// Keep the serverless entry point self-contained: Vercel Node ESM runtime
// cannot resolve the extensionless cross-function imports used previously.
function sameOriginCorsHeaders(
  req: IncomingMessage,
  methods = 'POST,OPTIONS',
  allowHeaders = 'Content-Type, Authorization',
): Record<string,string> {
  const source = req.headers.origin;
  const origin = (Array.isArray(source) ? source[0] : source || '').trim();
  const hostSource = req.headers.host;
  const host = (Array.isArray(hostSource) ? hostSource[0] : hostSource || '').toLowerCase();
  const headers: Record<string,string> = {
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': allowHeaders,
    Vary: 'Origin',
  };
  if (origin && host) {
    try {
      if (new URL(origin).host.toLowerCase() === host) headers['Access-Control-Allow-Origin'] = origin;
    } catch {}
  }
  return headers;
}
function rejectCrossOrigin(req: IncomingMessage, res: ServerResponse): boolean {
  const source = req.headers.origin;
  const origin = (Array.isArray(source) ? source[0] : source || '').trim();
  if (!origin) return false;
  const hostSource = req.headers.host;
  const host = (Array.isArray(hostSource) ? hostSource[0] : hostSource || '').toLowerCase();
  let valid = false;
  try { valid = Boolean(host && new URL(origin).host.toLowerCase() === host); } catch {}
  if (valid) return false;
  res.writeHead(403, { ...sameOriginCorsHeaders(req), 'Cache-Control': 'no-store', 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: { message: 'Cross-origin AI requests are not allowed.' } }));
  return true;
}


async function readJsonBody(req: IncomingMessage & { body?: unknown }): Promise<string> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') return req.body;
    if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
    return JSON.stringify(req.body);
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', chunk => chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(req: IncomingMessage, res: ServerResponse, status: number, payload: unknown) {
  res.writeHead(status, {
    ...sameOriginCorsHeaders(req),
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
  });
  res.end(JSON.stringify(payload));
}

export default async function handler(req: IncomingMessage & { method?: string; body?: unknown }, res: ServerResponse) {
  if (rejectCrossOrigin(req, res)) return;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      ...sameOriginCorsHeaders(req),
    });
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(req, res, 405, { error: { message: 'Method not allowed' } });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    sendJson(req, res, 503, { error: { message: 'Gemini er ikke konfigurert: legg inn GEMINI_API_KEY, GOOGLE_API_KEY eller API_KEY i Vercel Environment Variables.' } });
    return;
  }

  try {
    const body = await readJsonBody(req);
    if (!body || body === '{}') {
      sendJson(req, res, 400, { error: { message: 'Tom request body til Gemini vision proxy.' } });
      return;
    }

    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const text = await upstream.text();
    res.writeHead(upstream.status, {
      ...sameOriginCorsHeaders(req),
      'Cache-Control': 'no-store',
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
    });
    res.end(text);
  } catch (error: any) {
    sendJson(req, res, 500, { error: { message: error?.message || 'Gemini vision proxy failed.' } });
  }
}
