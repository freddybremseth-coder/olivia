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
  // CORS pre-flight (mostly defensive — same-origin in prod)
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-goog-api-key',
    });
    res.end();
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'GEMINI_API_KEY is not configured on the server' }));
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
        'Access-Control-Allow-Origin': '*',
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
