import type { IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';

type RealtyFlowDestination = {
  id?: string;
  label?: string;
  path?: string;
  contentType?: string;
};

type RealtyFlowPayload = {
  source?: {
    system?: string;
    type?: string;
    id?: string | null;
  };
  brand?: {
    id?: string;
    name?: string;
    website?: string;
  };
  destination?: RealtyFlowDestination;
  status?: string;
  content?: {
    title?: string;
    slug?: string;
    summary?: string;
    markdown?: string;
    imageUrl?: string | null;
    tags?: string[];
  };
  publishedAt?: string;
};

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', chunk => chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function json(res: ServerResponse, status: number, body: Record<string, unknown>) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

function cleanPath(value: string) {
  const path = value.trim();
  if (!path) return '/artikler';
  return path.startsWith('/') ? path : `/${path}`;
}

const INDEXNOW_KEY = 'd47e8b0f74a34bb0b197f22472188375';
const INDEXNOW_BASE = 'https://www.donaanna.com';

async function submitIndexNow(paths: string[]) {
  const urlList = Array.from(new Set(paths.filter(Boolean).map(path => new URL(path, INDEXNOW_BASE).toString())));
  if (!urlList.length) return { ok: true, submitted: 0, status: 204 };
  try {
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: 'www.donaanna.com',
        key: INDEXNOW_KEY,
        keyLocation: `${INDEXNOW_BASE}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
    });
    return { ok: response.status === 200 || response.status === 202, submitted: urlList.length, status: response.status };
  } catch {
    return { ok: false, submitted: 0, status: 0 };
  }
}

function pickEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return '';
}

function isAuthorized(req: IncomingMessage) {
  const expected = pickEnv('REALTYFLOW_CMS_SECRET', 'WEBSITE_CMS_SECRET_DONAANNA');
  if (!expected) return { ok: false, reason: 'REALTYFLOW_CMS_SECRET is not configured' };

  const headerSecret = cleanString(req.headers['x-realtyflow-secret']);
  const auth = cleanString(req.headers.authorization);
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  if (headerSecret === expected || bearer === expected) return { ok: true, reason: '' };
  return { ok: false, reason: 'Unauthorized' };
}

function getSupabase() {
  const url = pickEnv('SUPABASE_URL', 'VITE_SUPABASE_URL');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default async function handler(req: IncomingMessage & { method?: string }, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-RealtyFlow-Secret',
    });
    res.end();
    return;
  }

  if (!['POST', 'DELETE'].includes(req.method || '')) {
    json(res, 405, { error: 'Method not allowed' });
    return;
  }

  const auth = isAuthorized(req);
  if (!auth.ok) {
    json(res, auth.reason.includes('configured') ? 500 : 401, { error: auth.reason });
    return;
  }

  const supabase = getSupabase();
  if (!supabase) {
    json(res, 500, { error: 'Supabase service role is not configured' });
    return;
  }

  let payload: RealtyFlowPayload;
  try {
    payload = JSON.parse(await readBody(req)) as RealtyFlowPayload;
  } catch {
    json(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  if (req.method === 'DELETE') {
    const sourceSystem = cleanString(payload.source?.system) || 'realtyflow';
    const sourceType = cleanString(payload.source?.type) || 'content';
    const sourceId = cleanString(payload.source?.id || '');
    const destination = payload.destination || {};
    const destinationId = cleanString(destination.id) || 'artikler';
    const brandId = cleanString(payload.brand?.id) || 'donaanna';
    const slug = slugify(cleanString(payload.content?.slug) || cleanString(payload.content?.title));

    let query = supabase.from('website_posts').delete().select('slug,destination_path');
    if (sourceId) {
      query = query
        .eq('source_system', sourceSystem)
        .eq('source_type', sourceType)
        .eq('source_id', sourceId);
    } else {
      query = query
        .eq('brand_id', brandId)
        .eq('destination_id', destinationId)
        .eq('slug', slug);
    }

    const { data, error } = await query;
    if (error) {
      json(res, 500, { error: error.message });
      return;
    }

    const deletedPaths = (data || [])
      .map(row => {
        const deletedSlug = cleanString(row.slug);
        const deletedPath = cleanPath(cleanString(row.destination_path) || `/${destinationId}`);
        return deletedSlug ? `${deletedPath.replace(/\/$/, '')}/${deletedSlug}` : '';
      })
      .filter(Boolean);

    if (!deletedPaths.length && slug) {
      deletedPaths.push(`${cleanPath(cleanString(destination.path) || `/${destinationId}`).replace(/\/$/, '')}/${slug}`);
    }

    const indexNow = await submitIndexNow(deletedPaths);
    json(res, 200, { success: true, deleted: true, slug, deletedPaths, indexNow });
    return;
  }

  const title = cleanString(payload.content?.title);
  const markdown = cleanString(payload.content?.markdown);
  if (!title || !markdown) {
    json(res, 400, { error: 'content.title and content.markdown are required' });
    return;
  }

  const destination = payload.destination || {};
  const destinationId = cleanString(destination.id) || 'artikler';
  const destinationLabel = cleanString(destination.label) || 'Artikler';
  const destinationPath = cleanPath(cleanString(destination.path) || `/${destinationId}`);
  const slug = slugify(cleanString(payload.content?.slug) || title);
  const sourceSystem = cleanString(payload.source?.system) || 'realtyflow';
  const sourceType = cleanString(payload.source?.type) || 'content';
  const sourceId = cleanString(payload.source?.id || '');
  const status = payload.status === 'draft' ? 'draft' : 'published';
  const publishedAt = status === 'published'
    ? cleanString(payload.publishedAt) || new Date().toISOString()
    : null;

  const row = {
    source_system: sourceSystem,
    source_type: sourceType,
    source_id: sourceId || null,
    brand_id: cleanString(payload.brand?.id) || 'donaanna',
    destination_id: destinationId,
    destination_label: destinationLabel,
    destination_path: destinationPath,
    content_type: cleanString(destination.contentType) || 'article',
    title,
    slug,
    summary: cleanString(payload.content?.summary),
    markdown,
    image_url: cleanString(payload.content?.imageUrl || ''),
    tags: Array.isArray(payload.content?.tags) ? payload.content!.tags!.map(tag => String(tag).trim()).filter(Boolean) : [],
    status,
    published_at: publishedAt,
    raw_payload: payload,
    updated_at: new Date().toISOString(),
  };

  const onConflict = sourceId
    ? 'source_system,source_type,source_id'
    : 'brand_id,destination_id,slug';

  const { data, error } = await supabase
    .from('website_posts')
    .upsert(row, { onConflict })
    .select('id, slug, destination_path, status, published_at')
    .single();

  if (error) {
    json(res, 500, {
      error: error.message,
      hint: 'Run supabase_migrations/005_website_cms_posts.sql and configure SUPABASE_SERVICE_ROLE_KEY in Vercel.',
    });
    return;
  }

  const url = `${destinationPath.replace(/\/$/, '')}/${slug}`;
  const indexNow = status === 'published' ? await submitIndexNow([url]) : { ok: true, submitted: 0, status: 204 };
  json(res, 200, {
    success: true,
    id: data.id,
    slug: data.slug,
    status: data.status,
    url,
    external_url: url,
    published_at: data.published_at,
    indexNow,
  });
}
