/**
 * /api/ai/gemini/* — server-side proxy for Google Generative Language API.
 *
 * Why: keeps GEMINI_API_KEY out of the browser. The client SDK is configured
 *      with `httpOptions.baseUrl: '/api/ai/gemini'` and a placeholder key;
 *      this function strips/ignores the placeholder and injects the real key
 *      from process.env on every request.
 *
 * Forwards any path under /api/ai/gemini/* to
 *   https://generativelanguage.googleapis.com/<path>
 * and rewrites ?key=… to use process.env.GEMINI_API_KEY.
 */

import type { IncomingMessage, ServerResponse } from 'http';
import https from 'https';
import { URL } from 'url';

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


const UPSTREAM_HOST = 'generativelanguage.googleapis.com';

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', c => chunks.push(typeof c === 'string' ? Buffer.from(c) : c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(
  req: IncomingMessage & { url: string; method?: string },
  res: ServerResponse,
) {
  if (rejectCrossOrigin(req, res)) return;

  // CORS pre-flight (mostly defensive — same-origin in prod)
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      ...sameOriginCorsHeaders(req, 'GET,POST,OPTIONS', 'Content-Type, Authorization, x-goog-api-key'),
    });
    res.end();
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Gemini API key is not configured on the server (checked GEMINI_API_KEY, GOOGLE_API_KEY, API_KEY)' }));
    return;
  }

  // Build upstream URL: drop the /api/ai/gemini prefix, force key=…
  const raw = req.url ?? '/';
  const withoutPrefix = raw.replace(/^\/api\/ai\/gemini/, '') || '/';
  const upstream = new URL(`https://${UPSTREAM_HOST}${withoutPrefix}`);
  upstream.searchParams.set('key', apiKey);

  const body = req.method && req.method !== 'GET' && req.method !== 'HEAD'
    ? await readBody(req)
    : undefined;

  const headers: Record<string, string | string[]> = {};
  // Forward only safe content headers; never forward Authorization or cookies
  if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'] as string;
  headers['User-Agent'] = 'Olivia/1.0';
  if (body) headers['Content-Length'] = String(body.length);

  const proxyReq = https.request(
    {
      hostname: UPSTREAM_HOST,
      path: upstream.pathname + upstream.search,
      method: req.method ?? 'GET',
      headers,
    },
    (proxyRes) => {
      const respHeaders: Record<string, string | string[]> = {
        ...sameOriginCorsHeaders(req, 'GET,POST,OPTIONS', 'Content-Type, Authorization, x-goog-api-key'),
        'Cache-Control': 'no-store',
      };
      if (proxyRes.headers['content-type']) respHeaders['Content-Type'] = proxyRes.headers['content-type'];
      res.writeHead(proxyRes.statusCode ?? 200, respHeaders);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on('error', (err) => {
    if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `Gemini proxy error: ${err.message}` }));
  });

  if (body) proxyReq.write(body);
  proxyReq.end();
}
