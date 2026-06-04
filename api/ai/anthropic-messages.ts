import type { IncomingMessage, ServerResponse } from 'http';

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

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
  });
  res.end(JSON.stringify(payload));
}

export default async function handler(req: IncomingMessage & { method?: string; body?: unknown }, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, anthropic-version',
    });
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: { message: 'Method not allowed' } });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    sendJson(res, 503, { error: { message: 'Claude er ikke konfigurert: legg inn ANTHROPIC_API_KEY i Vercel Environment Variables.' } });
    return;
  }

  try {
    const body = await readJsonBody(req);
    if (!body || body === '{}') {
      sendJson(res, 400, { error: { message: 'Tom request body til Anthropic proxy.' } });
      return;
    }

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body,
    });
    const text = await upstream.text();
    res.writeHead(upstream.status, {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
    });
    res.end(text);
  } catch (error: any) {
    sendJson(res, 500, { error: { message: error?.message || 'Anthropic proxy failed.' } });
  }
}
