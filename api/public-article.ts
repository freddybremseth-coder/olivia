import type { IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';

const SITE = 'https://www.donaanna.com';
const DESTINATIONS = new Set(['magasin', 'artikler', 'blogg', 'oppskrifter']);

function escapeHtml(value: unknown) {
  return String(value || '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch] || ch));
}

function inlineMarkup(value: string) {
  const input = String(value || '');
  const linkPattern = /\[([^\]]+)\]\((https:\/\/[^\s)]+|\/[^\s)]+)\)/g;
  let output = '';
  let lastIndex = 0;
  for (const match of input.matchAll(linkPattern)) {
    const index = match.index ?? 0;
    output += escapeHtml(input.slice(lastIndex, index));
    const href = match[2];
    const external = href.startsWith('https://');
    output += '<a href="' + escapeHtml(href) + '"' + (external ? ' rel="noopener"' : '') + '>' + escapeHtml(match[1]) + '</a>';
    lastIndex = index + match[0].length;
  }
  output += escapeHtml(input.slice(lastIndex));
  return output;
}

function articleMarkup(markdown: string) {
  const lines = String(markdown || '').split(/\r?\n/);
  const output: string[] = [];
  let unordered: string[] = [];
  let ordered: string[] = [];
  let firstHeading = true;

  function flushLists() {
    if (unordered.length) {
      output.push('<ul>' + unordered.map(item => '<li>' + inlineMarkup(item) + '</li>').join('') + '</ul>');
      unordered = [];
    }
    if (ordered.length) {
      output.push('<ol>' + ordered.map(item => '<li>' + inlineMarkup(item) + '</li>').join('') + '</ol>');
      ordered = [];
    }
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushLists(); continue; }

    if (/^[-*]\s+/.test(line)) {
      if (ordered.length) flushLists();
      unordered.push(line.replace(/^[-*]\s+/, ''));
      continue;
    }

    if (/^\d+[.)]\s+/.test(line)) {
      if (unordered.length) flushLists();
      ordered.push(line.replace(/^\d+[.)]\s+/, ''));
      continue;
    }

    flushLists();
    const heading = line.match(/^(#{1,6})\s+(.+)/);
    if (heading) {
      const level = heading[1].length;
      if (firstHeading && level === 1) { firstHeading = false; continue; }
      firstHeading = false;
      const htmlLevel = Math.min(4, Math.max(2, level));
      output.push('<h' + htmlLevel + '>' + inlineMarkup(heading[2]) + '</h' + htmlLevel + '>');
    } else {
      firstHeading = false;
      output.push('<p>' + inlineMarkup(line) + '</p>');
    }
  }

  flushLists();
  return output.join('\n');
}

export default async function handler(
  req: IncomingMessage & { query?: Record<string, string | string[]> },
  res: ServerResponse,
) {
  const destination = typeof req.query?.destination === 'string' ? req.query.destination : '';
  const slug = typeof req.query?.slug === 'string' ? req.query.slug : '';
  if (!DESTINATIONS.has(destination) || !/^[a-z0-9][a-z0-9-]{0,89}$/.test(slug)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Siden finnes ikke');
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('Innholdet er midlertidig utilgjengelig');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.from('website_posts')
    .select('title,slug,summary,markdown,image_url,published_at,updated_at')
    .eq('brand_id', 'donaanna')
    .eq('destination_id', destination)
    .eq('status', 'published')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('Innholdet er midlertidig utilgjengelig');
    return;
  }
  if (!data) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Siden finnes ikke');
    return;
  }

  const title = String(data.title || '');
  const summary = String(data.summary || 'Les om oliven, olivenolje og livet på Doña Anna i Biar, Alicante.').slice(0, 250);
  const canonical = SITE + '/' + destination + '/' + encodeURIComponent(slug);
  let image = '';
  try {
    const source = String(data.image_url || '').trim();
    if (source) {
      const parsed = new URL(source, SITE);
      if (parsed.protocol === 'https:') image = parsed.href;
    }
  } catch {}

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': canonical + '#article',
        headline: title,
        description: summary,
        url: canonical,
        mainEntityOfPage: canonical,
        image: image || undefined,
        datePublished: data.published_at || undefined,
        dateModified: data.updated_at || data.published_at || undefined,
        author: { '@id': SITE + '/#organization' },
        publisher: { '@id': SITE + '/#organization' },
        isPartOf: { '@id': SITE + '/#website' },
      },
      {
        '@type': 'Person',
        '@id': SITE + '/#anna-bremseth',
        name: 'Anna Bremseth',
        affiliation: { '@id': SITE + '/#organization' },
      },
      {
        '@type': 'Person',
        '@id': 'https://www.freddybremseth.com/#person',
        name: 'Freddy Bremseth',
        url: 'https://www.freddybremseth.com/',
      },
      {
        '@type': 'Organization',
        '@id': SITE + '/#organization',
        name: 'Doña Anna',
        url: SITE + '/',
        member: [
          { '@id': SITE + '/#anna-bremseth' },
          { '@id': 'https://www.freddybremseth.com/#person' },
        ],
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Doña Anna', item: SITE + '/' },
          { '@type': 'ListItem', position: 2, name: destination, item: SITE + '/' + destination },
          { '@type': 'ListItem', position: 3, name: title, item: canonical },
        ],
      },
    ],
  };

  const css = ':root{--ink:#0d0d0d;--paper:#f4efe3;--gold:#9a741d;--gold2:#d4af37;--line:rgba(30,24,15,.14);--muted:#665e52}' +
    '*{box-sizing:border-box}html{scroll-behavior:smooth}body{background:var(--paper);color:#191713;margin:0;font-family:Inter,Arial,sans-serif;line-height:1.75}' +
    'a{color:#765916;text-underline-offset:3px}header{position:sticky;top:0;z-index:10;background:rgba(13,13,13,.95);color:#fff;border-bottom:1px solid rgba(255,255,255,.1);padding:17px clamp(20px,5vw,70px);backdrop-filter:blur(16px)}' +
    'header nav{display:flex;flex-wrap:wrap;gap:18px;align-items:center}header a{color:#d9d0c1;text-decoration:none;font-size:.78rem;text-transform:uppercase;letter-spacing:.12em}' +
    'main{max-width:1040px;margin:0 auto;padding:clamp(46px,7vw,88px) 22px 100px}.crumbs{font-size:.78rem;text-transform:uppercase;letter-spacing:.12em;color:#7a7062;margin-bottom:30px}' +
    'article{max-width:820px}h1,h2,h3{font-family:Georgia,serif;line-height:1.12}h1{font-size:clamp(2.7rem,7vw,5.4rem);letter-spacing:-.035em;margin:.15em 0 .35em}h2{font-size:clamp(2rem,4vw,3rem);margin-top:2.4rem}h3{font-size:1.55rem;margin-top:2rem}' +
    'p,li{font-size:1.08rem;color:#4d473d}.summary{font-size:clamp(1.2rem,2vw,1.45rem);color:#554d40;max-width:760px}.direct{margin:28px 0;padding:20px 22px;border:1px solid #cfbd91;background:#fff9e9;color:#403a31}.direct strong{color:#765916}' +
    '.byline{color:#7c7264;font-size:.92rem;margin:12px 0 28px}.hero-image{width:100%;height:auto;margin:26px 0 38px;border-radius:2px}.author-card{border:1px solid var(--line);background:#fff;padding:24px;margin:46px 0}' +
    '.next{margin:38px 0;padding:30px;background:#15120e;color:#fff}.next h2{margin-top:0;color:#fff}.next p{color:#d0c7b8}.next a{color:#d4af37}.next-links{display:flex;flex-wrap:wrap;gap:12px 20px;margin-top:18px}' +
    '.network{border-top:1px solid rgba(255,255,255,.1);background:#0d0d0d;padding:28px clamp(20px,5vw,70px);color:#8f8372;font-size:.82rem}.network strong{display:block;color:#d4af37;margin-bottom:10px;letter-spacing:.12em;text-transform:uppercase}.network a{color:#b9aa8c;margin-right:16px;white-space:nowrap}' +
    '@media(max-width:640px){header nav a:nth-child(n+4){display:none}main{padding-inline:18px}.next{padding:22px}}';
  const html = '<!doctype html><html lang="no"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + escapeHtml(title) + ' | Doña Anna</title>' +
    '<meta name="description" content="' + escapeHtml(summary) + '">' +
    '<link rel="canonical" href="' + escapeHtml(canonical) + '">' +
    '<meta property="og:type" content="article"><meta property="og:site_name" content="Doña Anna">' +
    '<meta property="og:url" content="' + escapeHtml(canonical) + '">' +
    '<meta property="og:title" content="' + escapeHtml(title) + '">' +
    '<meta property="og:description" content="' + escapeHtml(summary) + '"><meta name="author" content="Doña Anna">' +
    (image ? '<meta property="og:image" content="' + escapeHtml(image) + '">' : '') +
    '<script type="application/ld+json">' + JSON.stringify(schema).replace(/</g, '\\u003c') + '</script>' +
    '<style>' + css + '</style></head><body>' +
    '<header><nav><a href="/">DOÑA ANNA</a><a href="/guider">Guider</a><a href="/magasin">Magasin</a><a href="/artikler">Artikler</a><a href="/oppskrifter">Oppskrifter</a><a href="/#tasting">Kontakt</a></nav></header>' +
    '<main><p class="crumbs"><a href="/">Doña Anna</a> · <a href="/' + destination + '">' + escapeHtml(destination) + '</a></p><article><h1>' + escapeHtml(title) + '</h1><p class="summary">' + escapeHtml(summary) + '</p><div class="direct"><strong>Kort fortalt:</strong> ' + escapeHtml(summary) + '</div>' +
    '<p class="byline">Doña Anna redaksjon · <a href="/om-dona-anna">Anna og Freddy Bremseth</a>' +
    (data.updated_at || data.published_at ? ' · Oppdatert ' + escapeHtml(new Intl.DateTimeFormat('nb-NO',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Oslo'}).format(new Date(data.updated_at || data.published_at))) : '') + '</p>' +
    (image ? '<img class="hero-image" src="' + escapeHtml(image) + '" alt="' + escapeHtml(title) + '">' : '') +
    articleMarkup(String(data.markdown || '')) +
    '<aside class="author-card"><strong>Om Doña Anna</strong><p>Anna og Freddy Bremseth driver Doña Anna sammen i Biar, Alicante. <a href="/om-dona-anna">Les om gården, prosjektet og menneskene bak</a>.</p></aside>' +
    '<section class="next"><h2>Hva vil du gjøre videre?</h2><p>Gå fra artikkelen til produkt, opprinnelse eller en konkret forespørsel. Doña Anna viser bare tilgjengelighet, pris og batchdata som faktisk er publisert.</p><div class="next-links"><a href="/#portfolio">Se produktene</a><a href="/olivenolje-fra-biar">Olivenolje fra Biar</a><a href="/tidlig-hostet-olivenolje">Tidlig høstet olivenolje</a><a href="/olivenolje-for-restauranter">For restauranter</a><a href="/#tasting">Be om smaksprøve</a></div></section>' +
    '</article><p><a href="/' + destination + '">← Tilbake</a></p></main>' +
    '<footer class="network"><strong>Relatert</strong>' +
    '<a href="/om-dona-anna">Om Doña Anna</a>' +
    '<a href="https://www.freddybremseth.com/">FreddyBremseth.com</a>' +
    '<a href="https://www.pinosoecolife.com/">Pinoso Eco Life</a>' +
    '<a href="/personvern">Personvern</a></footer><script src="/donaanna-analytics.js" defer></script></body></html>';

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
  });
  res.end(html);
}