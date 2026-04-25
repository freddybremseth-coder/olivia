/**
 * /api/ai/openai/* — server-side proxy for OpenAI's API.
 *
 * Why: keeps OPENAI_API_KEY out of the browser. The client posts to
 *      /api/ai/openai/v1/chat/completions with the same body shape it
 *      would send to api.openai.com; this function injects the bearer key.
 *
 * Used as the second-tier fallback when both Gemini (quota) and Claude fail.
 */

import type { IncomingMessage, ServerResponse } from 'http';
import https from 'https';

const UPSTREAM_HOST = 'api.openai.com';

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
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'OPENAI_API_KEY is not configured on the server' }));
    return;
  }

  const raw = req.url ?? '/';
  const withoutPrefix = raw.replace(/^\/api\/ai\/openai/, '') || '/v1/chat/completions';

  const body = req.method && req.method !== 'GET' && req.method !== 'HEAD'
    ? await readBody(req)
    : undefined;

  const headers: Record<string, string | string[]> = {
    'Authorization': `Bearer ${apiKey}`,
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
    res.end(JSON.stringify({ error: `OpenAI proxy error: ${err.message}` }));
  });

  if (body) proxyReq.write(body);
  proxyReq.end();
}
