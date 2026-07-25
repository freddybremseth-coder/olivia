import type { IncomingMessage, ServerResponse } from 'http';
import { rejectCrossOrigin, sameOriginCorsHeaders } from '../_lib/cors';

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

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    sendJson(req, res, 503, { error: { message: 'Gemini er ikke konfigurert: legg inn GEMINI_API_KEY eller GOOGLE_API_KEY i Vercel Environment Variables.' } });
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
