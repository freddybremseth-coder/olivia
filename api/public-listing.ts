import type { IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';

const SITE = 'https://www.donaanna.com';
const DESTINATIONS: Record<string, { label: string; heading: string; seoTitle: string; description: string }> = {
  magasin: {
    label: 'Magasin',
    heading: 'Doña Anna Magasin',
    seoTitle: 'Doña Anna Magasin | Olivenolje og gårdsliv fra Biar',
    description: 'Les Doña Anna Magasin om olivenolje, kvalitet, gårdsliv, høsting, mat og smak fra Biar i Alicante, med konkrete råd og dokumenterte erfaringer.',
  },
  artikler: {
    label: 'Artikler',
    heading: 'Kunnskap om olivenolje',
    seoTitle: 'Artikler om olivenolje, råvarer og kvalitet | Doña Anna',
    description: 'Fagartikler fra Doña Anna om olivenolje, råvarer, kvalitet, høsting og kjøkkenbruk for kokker, innkjøpere og matinteresserte.',
  },
  blogg: {
    label: 'Blogg',
    heading: 'Notater fra gården',
    seoTitle: 'Blogg fra olivengården i Biar, Alicante | Doña Anna',
    description: 'Følg livet på Doña Anna-gården i Biar: olivenlund, sesong, høsting, produksjon og erfaringer fra arbeidet med Verde Vivo.',
  },
  oppskrifter: {
    label: 'Oppskrifter',
    heading: 'Oppskrifter med olivenolje',
    seoTitle: 'Oppskrifter med olivenolje fra Biar, Alicante | Doña Anna',
    description: 'Oppskrifter og serveringsideer med olivenolje fra Doña Anna i Biar, med smakskombinasjoner, råvarer og praktiske tips til kjøkkenet.',
  },
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
  const roleKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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
    console.error('Doña Anna public listing query failed', { code: error.code, message: error.message });
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
  const sharedNavCss = '.topbar{position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;gap:20px;padding:16px clamp(20px,5vw,70px);border-bottom:1px solid rgba(255,255,255,.1);background:rgba(13,13,13,.95);color:#fff;backdrop-filter:blur(16px)}.brand{flex-shrink:0;font:600 14px Georgia,serif;letter-spacing:.2em;text-decoration:none;color:#fff}.topnav{display:flex;flex-wrap:nowrap;align-items:center;gap:clamp(12px,1.6vw,22px)}.topnav a{white-space:nowrap;color:#d8d0c1;text-decoration:none;font-size:12px;text-transform:uppercase;letter-spacing:.1em}.topnav a:hover{color:#d4af37}.mobile-nav{display:none}.mobile-nav summary{list-style:none;cursor:pointer;border:1px solid rgba(255,255,255,.3);padding:10px 13px;color:#fff;font-size:12px;text-transform:uppercase}.mobile-nav summary::-webkit-details-marker{display:none}.mobile-nav-links{position:absolute;left:0;right:0;top:100%;display:grid;padding:12px 20px 22px;background:#0d0d0d;border-bottom:1px solid rgba(212,175,55,.3);box-shadow:0 20px 30px rgba(0,0,0,.25)}.mobile-nav-links a{display:block;color:#fff;text-decoration:none;font-size:14px;padding:12px;border-bottom:1px solid rgba(255,255,255,.1)}@media(max-width:900px){.topnav{display:none}.mobile-nav{display:block}}';
  const css = ':root{--ink:#0d0d0d;--paper:#f4efe3;--gold:#9a741d;--gold2:#d4af37;--line:rgba(30,24,15,.14)}' +
    '*{box-sizing:border-box}body{background:var(--paper);color:#191713;margin:0;font-family:Inter,Arial,sans-serif;line-height:1.7}a{color:#765916;text-underline-offset:3px}' +
    'header{position:sticky;top:0;z-index:10;background:rgba(13,13,13,.95);border-bottom:1px solid rgba(255,255,255,.1);padding:17px clamp(20px,5vw,70px);backdrop-filter:blur(16px)}header nav{display:flex;flex-wrap:wrap;gap:18px}header a{color:#d8d0c1;text-decoration:none;font-size:.78rem;text-transform:uppercase;letter-spacing:.12em}' +
    '.hero{background:radial-gradient(circle at 78% 20%,rgba(212,175,55,.18),transparent 28rem),#0d0d0d;color:#fff;padding:clamp(58px,8vw,108px) clamp(20px,6vw,84px)}.hero-inner{max-width:1200px;margin:auto}.eyebrow{color:#d4af37;font-size:12px;font-weight:800;letter-spacing:.24em;text-transform:uppercase}' +
    'main{max-width:1200px;margin:0 auto;padding:0 24px 90px}.hero h1{max-width:880px;margin:18px 0 0;font:600 clamp(2.8rem,7vw,5.5rem)/.98 Georgia,serif;letter-spacing:-.035em}.intro{max-width:760px;color:#d7d0c4;font-size:1.2rem}.direct{max-width:820px;margin-top:26px;padding:20px 22px;border:1px solid rgba(212,175,55,.34);background:rgba(255,255,255,.05);color:#e9e1d4}.direct strong{color:#d4af37}' +
    '.byline{margin:26px 0 0;color:#9f9484;font-size:.92rem}.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr));gap:22px;margin-top:52px}.card{border:1px solid var(--line);background:#fff;box-shadow:0 18px 46px -42px rgba(35,28,17,.55)}.card img{width:100%;height:220px;object-fit:cover}.card-body{padding:25px}.card h2{font:600 1.8rem/1.15 Georgia,serif;margin:.25rem 0}.card p{color:#5b5448}.card .date{color:#8a6a19;font-size:.75rem;font-weight:800;text-transform:uppercase;letter-spacing:.14em}' +
    '.journey{margin-top:58px;padding:34px;background:#15120e;color:#fff}.journey h2{font:600 clamp(2rem,4vw,3.4rem)/1.05 Georgia,serif;margin:0}.journey p{max-width:760px;color:#d0c7b8}.journey-links{display:flex;flex-wrap:wrap;gap:12px 20px;margin-top:20px}.journey a{color:#d4af37}.guides{display:flex;flex-wrap:wrap;gap:10px 18px;margin-top:24px;padding-top:20px;border-top:1px solid rgba(255,255,255,.12)}' +
    '.network{border-top:1px solid rgba(255,255,255,.1);background:#0d0d0d;padding:28px clamp(20px,5vw,70px);color:#8f8372;font-size:.82rem}.network strong{display:block;color:#d4af37;margin-bottom:10px;letter-spacing:.12em;text-transform:uppercase}.network a{color:#b9aa8c;margin-right:16px;white-space:nowrap}' +
    '@media(max-width:640px){.topbar .topnav{display:none}.card img{height:190px}.hero{padding-top:64px}}';
  const html = '<!doctype html><html lang="no"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + escapeHtml(config.seoTitle) + '</title>' +
    '<meta name="description" content="' + escapeHtml(config.description) + '">' +
    (articles.length ? '' : '<meta name="robots" content="noindex,follow">') +
    '<link rel="canonical" href="' + canonical + '">' +
    '<meta property="og:type" content="website"><meta property="og:site_name" content="Doña Anna">' +
    '<meta property="og:url" content="' + canonical + '">' +
    '<meta property="og:title" content="' + escapeHtml(config.seoTitle) + '"><meta name="author" content="Doña Anna">' +
    '<script type="application/ld+json">' + JSON.stringify(schema).replace(/</g, '\\u003c') + '</script>' +
    '<link rel="stylesheet" href="/donaanna-footer.css"><style>' + css + sharedNavCss + '</style></head><body>' +
    '<header class="topbar"><a class="brand" href="/" aria-label="Doña Anna – forsiden">DOÑA ANNA</a><nav class="topnav" aria-label="Hovedmeny"><a href="/#estate">Gården</a><a href="/#oljesmaking">Oljesmaking</a><a href="/produkter">Produkter</a><a href="/om-dona-anna">Historien</a><a href="/kunnskap-og-boker">Kunnskap</a><a href="/magasin">Magasin</a></nav><details class="mobile-nav"><summary>☰ Meny</summary><nav class="mobile-nav-links" aria-label="Mobilmeny"><a href="/#estate">Gården</a><a href="/#oljesmaking">Oljesmaking</a><a href="/produkter">Produkter</a><a href="/om-dona-anna">Historien</a><a href="/kunnskap-og-boker">Kunnskap</a><a href="/magasin">Magasin</a></nav></details></header>' +
    '<section class="hero"><div class="hero-inner"><p class="eyebrow">Doña Anna · kunnskap</p><h1>' + escapeHtml(config.heading) + '</h1><p class="intro">' + escapeHtml(config.description) + '</p><p class="byline">Redaksjonelt innhold fra Doña Anna · <a href="/om-dona-anna">Anna og Freddy Bremseth</a></p></div></section>' +
    '<main>' +
    (cards ? '<section class="cards" aria-label="' + escapeHtml(config.label) + '">' + cards + '</section>'
      : '<p>Her finner du publiserte saker når de er klare.</p>') +
    '<section class="journey"><h2>Fra kunnskap til neste steg</h2><p>Les videre om opprinnelse og tidlig høsting, se Verde Vivo eller meld interesse for smaksprøve dersom du vurderer Doña Anna for restaurant, hotell, butikk eller import.</p><div class="journey-links"><a href="/#portfolio">Se Verde Vivo</a><a href="/#tasting">Meld interesse</a><a href="/#estate">Gården i Biar</a></div><nav class="guides" aria-label="Doña Anna guider"><a href="/olivenolje-fra-biar">Olivenolje fra Biar</a><a href="/tidlig-hostet-olivenolje">Tidlig høstet olivenolje</a><a href="/olivenolje-for-restauranter">For restauranter</a><a href="/bordoliven-fra-biar">Bordoliven – planlagt</a></nav></section>' +
    '</main><footer class="da-footer" aria-label="Doña Anna – kontakt og lenker"><div class="da-footer-inner"><div class="da-footer-grid"><div><div class="da-footer-brand"><img class="da-footer-mark" src="/labels/dona-anna-figure.svg" alt="" loading="lazy"><div><span class="da-footer-wordmark">DOÑA ANNA</span><span class="da-footer-kicker">Fra olivenlunden i Biar · Alicante</span></div></div><p class="da-footer-story">Oliven, jord og ekte mennesker. Doña Anna vokser frem på gården vår i Biar. Bli bedre kjent med oljene, oppdag historien og besøk oss for en personlig smaksopplevelse.</p><a class="da-footer-feature" href="/#oljesmaking">Opplev oljesmaking på gården →</a><div class="da-footer-social"><span class="da-footer-social-label">Følg oss</span><a class="da-footer-social-link" href="https://www.facebook.com/groups/1837377830741494" target="_blank" rel="noopener noreferrer" aria-label="Doña Anna olivenfellesskap på Facebook"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.98H7.9V12h2.54V9.8c0-2.5 1.49-3.88 3.77-3.88 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.9h-2.34v6.98A10 10 0 0 0 22 12Z"/></svg>Facebook · olivenfellesskapet</a></div></div><div><h2 class="da-footer-heading">Opplev og utforsk</h2><ul class="da-footer-links"><li><a href="/#oljesmaking">Oljesmaking og gårdsbesøk</a></li><li><a href="/#estate">Vår olivengård i Biar</a></li><li><a href="/produkter">Oljer og produkter</a></li><li><a href="/kunnskap-og-boker">Kunnskap og bøker</a></li><li><a href="/laer-a-smake-olivenolje">Lær å smake olivenolje</a></li><li><a href="/magasin">Magasin fra gården</a></li></ul></div><div><h2 class="da-footer-heading">For restauranter og faghandel</h2><ul class="da-footer-links"><li><a href="/#b2b">Samarbeid og B2B</a></li><li><a href="/olivenolje-for-restauranter">Olivenolje til restauranter</a></li><li><a href="/#tasting">Be om smaksprøve</a></li><li><a href="mailto:info@donaanna.com?subject=B2B%20Do%C3%B1a%20Anna">Kontakt bedriftsavdelingen</a></li></ul></div><div><h2 class="da-footer-heading">Kontakt og besøk</h2><div class="da-footer-contact"><div class="da-footer-contact-item"><span class="da-footer-contact-symbol" aria-hidden="true">✉</span><a href="mailto:info@donaanna.com">info@donaanna.com</a></div><div class="da-footer-contact-item"><span class="da-footer-contact-symbol" aria-hidden="true">⌖</span><div>Olivenlunden vår<br>Biar, Alicante, Spania<span class="da-footer-mapnote">Privat gård · besøk etter avtale</span></div></div><div class="da-footer-contact-item"><span class="da-footer-contact-symbol" aria-hidden="true">↗</span><div><a href="https://www.google.com/maps/search/?api=1&amp;query=Biar%2C%20Alicante%2C%20Spain" target="_blank" rel="noopener noreferrer">Se Biar på Google Maps</a><span class="da-footer-mapnote">Kartet viser området, ikke nøyaktig gårdsadresse</span></div></div><div class="da-footer-contact-item"><span class="da-footer-contact-symbol" aria-hidden="true">☎</span><span>Telefon oppgis ved avtale</span></div></div></div></div><div class="da-footer-rule"></div><div class="da-footer-bottom"><span>© 2026 Doña Anna · Anna &amp; Freddy · Biar, Alicante</span><nav class="da-footer-bottom-links" aria-label="Bunntekst og juridisk"><a href="/om-dona-anna">Historien vår</a><a href="/personvern">Personvern</a><a href="https://www.freddybremseth.com/" target="_blank" rel="noopener noreferrer">FreddyBremseth.com</a><a href="https://www.pinosoecolife.com/" target="_blank" rel="noopener noreferrer">Pinoso Eco Life</a></nav></div></div></footer><script src="/donaanna-analytics.js" defer></script></body></html>';

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
  });
  res.end(html);
}
