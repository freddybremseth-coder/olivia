import type { IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';

const SITE = 'https://www.donaanna.com';
const DESTINATIONS: Record<string, { label: string; heading: string; description: string }> = {
  magasin: { label: 'Magasin', heading: 'Doña Anna Magasin', description: 'Olivenolje, kvalitet, gårdsliv og smaker fra Biar i Alicante.' },
  artikler: { label: 'Artikler', heading: 'Kunnskap om olivenolje', description: 'Fagartikler, råvarer og praktisk veiledning for kokker og matinteresserte.' },
  blogg: { label: 'Blogg', heading: 'Notater fra gården', description: 'Historier fra olivenlunden, kjøkkenet og markedet.' },
  oppskrifter: { label: 'Oppskrifter', heading: 'Oppskrifter med olivenolje', description: 'Serveringsideer, smakskombinasjoner og praktiske oppskrifter.' },
};

function escapeHtml(value: unknown) {
  return String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char] || char));
}

function formatDate(value: unknown) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return '';
  return new Intl.DateTimeFormat('nb-NO', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Oslo',
  }).format(new Date(value));
}

export default async function handler(
  req: IncomingMessage & { query?: Record<string, string | string[]> },
  res: ServerResponse,
) {
  const destination = typeof req.query?.destination === 'string' ? req.query.destination : '';
  const config = DESTINATIONS[destination];
  if (!config) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Siden finnes ikke');
    return;
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const roleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !roleKey) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('Innholdet er midlertidig utilgjengelig');
    return;
  }

  const supabase = createClient(url, roleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.from('website_posts')
    .select('slug,title,summary,image_url,published_at')
    .eq('brand_id', 'donaanna')
    .eq('destination_id', destination)
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(100);

  if (error) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('Innholdet er midlertidig utilgjengelig');
    return;
  }

  const articles = (data || []).filter(post =>
    post.slug && /^[a-z0-9][a-z0-9-]{0,89}$/.test(String(post.slug))
  );
  const cards = articles.map(post => {
    const href = '/' + destination + '/' + encodeURIComponent(String(post.slug));
    const title = escapeHtml(post.title);
    const summary = escapeHtml(post.summary);
    const date = formatDate(post.published_at);
    let image = '';
    try {
      const parsed = new URL(String(post.image_url || ''), SITE);
      if (parsed.protocol === 'https:') image = parsed.href;
    } catch {}
    return '<article class="card">' +
      (image ? '<a href="' + href + '"><img src="' + escapeHtml(image) + '" alt="' + title + '" loading="lazy"></a>' : '') +
      '<div class="card-body">' +
      (date ? '<p class="date">' + escapeHtml(date) + '</p>' : '') +
      '<h2><a href="' + href + '">' + title + '</a></h2>' +
      (summary ? '<p>' + summary + '</p>' : '') +
      '<p><a href="' + href + '">Les ' + title + ' →</a></p></div></article>';
  }).join('');

  const canonical = SITE + '/' + destination;
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': canonical + '#collection',
        url: canonical,
        name: config.heading,
        description: config.description,
        isPartOf: { '@id': SITE + '/#website' },
        creator: { '@id': SITE + '/#organization' },
        publisher: { '@id': SITE + '/#organization' },
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
        '@type': 'ItemList',
        name: config.heading + ' – publiserte saker',
        itemListElement: articles.slice(0, 30).map((post, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: String(post.title || ''),
          url: canonical + '/' + encodeURIComponent(String(post.slug)),
        })),
      },
    ],
  };
  const css = ':root{--ink:#0d0d0d;--paper:#f4efe3;--gold:#9a741d;--gold2:#d4af37;--line:rgba(30,24,15,.14)}' +
    '*{box-sizing:border-box}body{background:var(--paper);color:#191713;margin:0;font-family:Inter,Arial,sans-serif;line-height:1.7}a{color:#765916;text-underline-offset:3px}' +
    'header{position:sticky;top:0;z-index:10;background:rgba(13,13,13,.95);border-bottom:1px solid rgba(255,255,255,.1);padding:17px clamp(20px,5vw,70px);backdrop-filter:blur(16px)}header nav{display:flex;flex-wrap:wrap;gap:18px}header a{color:#d8d0c1;text-decoration:none;font-size:.78rem;text-transform:uppercase;letter-spacing:.12em}' +
    '.hero{background:radial-gradient(circle at 78% 20%,rgba(212,175,55,.18),transparent 28rem),#0d0d0d;color:#fff;padding:clamp(58px,8vw,108px) clamp(20px,6vw,84px)}.hero-inner{max-width:1200px;margin:auto}.eyebrow{color:#d4af37;font-size:12px;font-weight:800;letter-spacing:.24em;text-transform:uppercase}' +
    'main{max-width:1200px;margin:0 auto;padding:0 24px 90px}.hero h1{max-width:880px;margin:18px 0 0;font:600 clamp(2.8rem,7vw,5.5rem)/.98 Georgia,serif;letter-spacing:-.035em}.intro{max-width:760px;color:#d7d0c4;font-size:1.2rem}.direct{max-width:820px;margin-top:26px;padding:20px 22px;border:1px solid rgba(212,175,55,.34);background:rgba(255,255,255,.05);color:#e9e1d4}.direct strong{color:#d4af37}' +
    '.byline{margin:26px 0 0;color:#9f9484;font-size:.92rem}.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr));gap:22px;margin-top:52px}.card{border:1px solid var(--line);background:#fff;box-shadow:0 18px 46px -42px rgba(35,28,17,.55)}.card img{width:100%;height:220px;object-fit:cover}.card-body{padding:25px}.card h2{font:600 1.8rem/1.15 Georgia,serif;margin:.25rem 0}.card p{color:#5b5448}.card .date{color:#8a6a19;font-size:.75rem;font-weight:800;text-transform:uppercase;letter-spacing:.14em}' +
    '.journey{margin-top:58px;padding:34px;background:#15120e;color:#fff}.journey h2{font:600 clamp(2rem,4vw,3.4rem)/1.05 Georgia,serif;margin:0}.journey p{max-width:760px;color:#d0c7b8}.journey-links{display:flex;flex-wrap:wrap;gap:12px 20px;margin-top:20px}.journey a{color:#d4af37}.guides{display:flex;flex-wrap:wrap;gap:10px 18px;margin-top:24px;padding-top:20px;border-top:1px solid rgba(255,255,255,.12)}' +
    '.network{border-top:1px solid rgba(255,255,255,.1);background:#0d0d0d;padding:28px clamp(20px,5vw,70px);color:#8f8372;font-size:.82rem}.network strong{display:block;color:#d4af37;margin-bottom:10px;letter-spacing:.12em;text-transform:uppercase}.network a{color:#b9aa8c;margin-right:16px;white-space:nowrap}' +
    '@media(max-width:640px){header nav a:nth-child(n+4){display:none}.card img{height:190px}.hero{padding-top:64px}}';
  const html = '<!doctype html><html lang="no"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + escapeHtml(config.heading) + ' | Doña Anna · Freddy Bremseth</title>' +
    '<meta name="description" content="' + escapeHtml(config.description) + '">' +
    '<link rel="canonical" href="' + canonical + '">' +
    '<meta property="og:type" content="website"><meta property="og:site_name" content="Doña Anna">' +
    '<meta property="og:url" content="' + canonical + '">' +
    '<meta property="og:title" content="' + escapeHtml(config.heading) + ' | Doña Anna · Freddy Bremseth"><meta name="author" content="Freddy Bremseth">' +
    '<script type="application/ld+json">' + JSON.stringify(schema).replace(/</g, '\\u003c') + '</script>' +
    '<style>' + css + '</style></head><body>' +
    '<header><nav><a href="/">DOÑA ANNA</a><a href="/magasin">Magasin</a>' +
    '<a href="/artikler">Artikler</a><a href="/blogg">Blogg</a><a href="/oppskrifter">Oppskrifter</a><a href="/#tasting">Smaksprøve</a></nav></header>' +
    '<section class="hero"><div class="hero-inner"><p class="eyebrow">Doña Anna · kunnskap</p><h1>' + escapeHtml(config.heading) + '</h1><p class="intro">' + escapeHtml(config.description) + '</p><div class="direct"><strong>Kort fortalt:</strong> ' + escapeHtml(config.description) + '</div><p class="byline">Redaksjonelt innhold fra Doña Anna · <a href="https://www.freddybremseth.com/olivenolje-og-dona-anna.html">Freddy Bremseth</a></p></div></section>' +
    '<main>' +
    (cards ? '<section class="cards" aria-label="' + escapeHtml(config.label) + '">' + cards + '</section>'
      : '<p>Her finner du publiserte saker når de er klare.</p>') +
    '<section class="journey"><h2>Fra kunnskap til neste steg</h2><p>Les videre om opprinnelse og tidlig høsting, se produktene eller be om smaksprøve dersom du vurderer Doña Anna for restaurant, hotell, butikk eller import.</p><div class="journey-links"><a href="/#portfolio">Se produktene</a><a href="/#tasting">Be om smaksprøve</a><a href="/#estate">Gården i Biar</a></div><nav class="guides" aria-label="Doña Anna guider"><a href="/olivenolje-fra-biar">Olivenolje fra Biar</a><a href="/tidlig-hostet-olivenolje">Tidlig høstet olivenolje</a><a href="/olivenolje-for-restauranter">For restauranter</a><a href="/bordoliven-fra-biar">Bordoliven fra Biar</a></nav></section>' +
    '</main><footer class="network"><strong>Freddy Bremseth network</strong>' +
    '<a href="https://www.freddybremseth.com/">FreddyBremseth.com</a>' +
    '<a href="https://www.zenecohomes.com/">Zen Eco Homes</a>' +
    '<a href="https://www.pinosoecolife.com/">Pinoso Eco Life</a>' +
    '<a href="https://www.chatgenius.pro/">ChatGenius</a>' +
    '<a href="https://books.freddybremseth.com/">Books</a>' +
    '<a href="https://art.freddybremseth.com/">Art</a>' +
    '<a href="https://remaster.freddybremseth.com/">Re-Master Freddy</a></footer><script src="/donaanna-analytics.js" defer></script></body></html>';

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
  });
  res.end(html);
}