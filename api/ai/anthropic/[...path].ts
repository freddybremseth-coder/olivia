/**
 * /api/ai/anthropic/* — server-side proxy for Anthropic's Messages API.
 *
 * Why: keeps ANTHROPIC_API_KEY out of the browser. The client posts to
 *      /api/ai/anthropic/v1/messages with the same body shape it would send
 *      to api.anthropic.com; this function injects the real key and the
 *      anthropic-version header.
 */

import type { IncomingMessage, ServerResponse } from 'http';
import https from 'https';
import { rejectCrossOrigin, sameOriginCorsHeaders } from '../../_lib/cors';

const UPSTREAM_HOST = 'api.anthropic.com';
const DEFAULT_VERSION = '2023-06-01';

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

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      ...sameOriginCorsHeaders(req, 'POST,OPTIONS', 'Content-Type, Authorization, anthropic-version'),
    });
    res.end();
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Anthropic API key is not configured on the server (checked ANTHROPIC_API_KEY, CLAUDE_API_KEY)' }));
    return;
  }

  const raw = req.url ?? '/';
  const withoutPrefix = raw.replace(/^\/api\/ai\/anthropic/, '') || '/v1/messages';

  const body = req.method && req.method !== 'GET' && req.method !== 'HEAD'
    ? await readBody(req)
    : undefined;

  const headers: Record<string, string | string[]> = {
    'x-api-key': apiKey,
    'anthropic-version': (req.headers['anthropic-version'] as string) || DEFAULT_VERSION,
    'User-Agent': 'Olivia/1.0',
  };
  if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'] as string;
  if (body) headers['Content-Length'] = String(body.length);

  const proxyReq = https.request(
    {
      hostname: UPSTREAM_HOST,
      path: withoutPrefix,
      method: req.method ?? 'POST',
      headers,
    },
    (proxyRes) => {
      const respHeaders: Record<string, string | string[]> = {
        ...sameOriginCorsHeaders(req, 'POST,OPTIONS', 'Content-Type, Authorization, anthropic-version'),
        'Cache-Control': 'no-store',
      };
      if (proxyRes.headers['content-type']) respHeaders['Content-Type'] = proxyRes.headers['content-type'];
      res.writeHead(proxyRes.statusCode ?? 200, respHeaders);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on('error', (err) => {
    if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `Anthropic proxy error: ${err.message}` }));
  });

  if (body) proxyReq.write(body);
  proxyReq.end();
}
