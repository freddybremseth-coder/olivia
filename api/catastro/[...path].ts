import type { IncomingMessage, ServerResponse } from 'http';
import https from 'https';

const CATASTRO_HOST = 'ovc.catastro.meh.es';

export default function handler(
  req: IncomingMessage & { url: string },
  res: ServerResponse
) {
  // Extract path + query string after /api/catastro
  const raw = req.url ?? '/';
  const withoutPrefix = raw.replace(/^\/api\/catastro/, '') || '/';

  const options: https.RequestOptions = {
    hostname: CATASTRO_HOST,
    path: withoutPrefix,
    method: req.method ?? 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Olivia/1.0)',
      Accept: 'text/xml,application/xml,*/*',
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    // Forward status and essential headers
    const headers: Record<string, string | string[]> = {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 's-maxage=60',
    };
    const ct = proxyRes.headers['content-type'];
    if (ct) headers['Content-Type'] = ct;

    res.writeHead(proxyRes.statusCode ?? 200, headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
    }
    res.end(JSON.stringify({ error: err.message }));
  });

  proxyReq.end();
}
