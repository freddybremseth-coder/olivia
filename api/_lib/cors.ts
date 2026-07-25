import type { IncomingMessage, ServerResponse } from 'http';

function headerValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function isSameOriginRequest(req: IncomingMessage): boolean {
  const origin = headerValue(req.headers.origin).trim();
  if (!origin) return true;
  const host = headerValue(req.headers.host).trim().toLowerCase();
  if (!host) return false;
  try {
    return new URL(origin).host.toLowerCase() === host;
  } catch {
    return false;
  }
}

export function sameOriginCorsHeaders(
  req: IncomingMessage,
  methods = 'POST,OPTIONS',
  allowHeaders = 'Content-Type, Authorization',
): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': allowHeaders,
    Vary: 'Origin',
  };
  const origin = headerValue(req.headers.origin).trim();
  if (origin && isSameOriginRequest(req)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

export function rejectCrossOrigin(req: IncomingMessage, res: ServerResponse): boolean {
  if (isSameOriginRequest(req)) return false;
  res.writeHead(403, {
    ...sameOriginCorsHeaders(req),
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
  });
  res.end(JSON.stringify({ error: { message: 'Cross-origin AI requests are not allowed.' } }));
  return true;
}
