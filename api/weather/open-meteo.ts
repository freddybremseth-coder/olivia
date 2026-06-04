import type { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';

const ALLOWED_ENDPOINTS = new Set(['forecast', 'archive']);

export default async function handler(req: IncomingMessage & { url?: string; method?: string }, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const currentUrl = new URL(req.url || '', 'https://olivia.local');
    const endpoint = currentUrl.searchParams.get('endpoint') || 'forecast';
    if (!ALLOWED_ENDPOINTS.has(endpoint)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid weather endpoint' }));
      return;
    }

    currentUrl.searchParams.delete('endpoint');
    const baseUrl = endpoint === 'archive'
      ? 'https://archive-api.open-meteo.com/v1/archive'
      : 'https://api.open-meteo.com/v1/forecast';
    const upstreamUrl = `${baseUrl}?${currentUrl.searchParams.toString()}`;

    const upstream = await fetch(upstreamUrl, {
      headers: { 'Accept': 'application/json' },
    });
    const text = await upstream.text();
    res.writeHead(upstream.status, {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 's-maxage=900, stale-while-revalidate=1800',
      'Content-Type': upstream.headers.get('content-type') || 'application/json',
    });
    res.end(text);
  } catch (error: any) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error?.message || 'Weather proxy failed' }));
  }
}
