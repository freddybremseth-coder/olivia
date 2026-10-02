import type { IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';

const BASE = 'https://www.donaanna.com';
const PUBLIC_DESTINATIONS = new Set(['magasin', 'artikler', 'blogg', 'oppskrifter']);

function publishedPostUrl(post: { slug?: string; destination_id?: string; destination_path?: string }): string | null {
  const slug = String(post.slug || '').trim();
  // Restrict sitemap entries to the public editorial rewrites in vercel.json.
  // Never let a CMS row advertise a private route, external host, or query.
  if (!slug || slug.length > 160 || /[\/?#\x00-\x1f]/.test(slug) || slug === '.' || slug === '..') return null;
  const destination = String(post.destination_path || '').trim().replace(/^\/+|\/+$/g, '') || String(post.destination_id || 'magasin');
  if (!PUBLIC_DESTINATIONS.has(destination)) return null;
  return `${BASE}/${destination}/${encodeURIComponent(slug)}`;
}

function safeLastMod(value: string | undefined): string {
  return value && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : '';
}


function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, char => ({ '<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;' }[char] || char));
}

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  const staticPaths = [
    '/',
    '/guider',
    '/om-dona-anna',
    '/personvern',
    '/olivenolje-fra-biar',
    '/tidlig-hostet-olivenolje',
    '/olivenolje-for-restauranter',
    '/bordoliven-fra-biar',
    '/magasin',
    '/artikler',
    '/blogg',
    '/oppskrifter',
  ];
  const rows: Array<{ destination_id?: string; destination_path?: string; slug?: string; published_at?: string; updated_at?: string; created_at?: string }> = [];

  const supabase = getSupabase();
  if (supabase) {
    const result = await supabase
      .from('website_posts')
      .select('destination_id,destination_path,slug,published_at,updated_at,created_at')
      .eq('brand_id', 'donaanna')
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
      .limit(1000);
    if (!result.error && result.data) rows.push(...result.data);
  }

  const urls = [
    ...staticPaths.map(path => ({ loc: `${BASE}${path}`, lastmod: '' })),
    ...rows
      .map(row => ({
        loc: publishedPostUrl(row),
        lastmod: safeLastMod(row.updated_at || row.published_at || row.created_at),
      }))
      .filter((row): row is { loc: string; lastmod: string } => row.loc !== null),
  ];

  const seen = new Set<string>();
  const body = urls
    .filter(item => item.loc && !seen.has(item.loc) && seen.add(item.loc))
    .map(item => [
      '  <url>',
      `    <loc>${escapeXml(item.loc)}</loc>`,
      item.lastmod ? `    <lastmod>${item.lastmod}</lastmod>` : '',
      '  </url>',
    ].filter(Boolean).join('\n'))
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' });
  res.end(xml);
}
