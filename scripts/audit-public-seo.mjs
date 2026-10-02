import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = (message) => { console.error('SEO audit failed:', message); process.exitCode = 1; };

const index = read('index.html');
const landing = read('components/PublicB2BLandingPage.tsx');
const article = read('api/public-article.ts');
const listing = read('api/public-listing.ts');
const evergreen = read('api/public-evergreen.ts');
const sitemap = read('api/sitemap.ts');
const robots = read('public/robots.txt');
const analytics = read('public/donaanna-analytics.js');
if (!fs.existsSync('public/labels/dona-anna-figure.svg')) fail('Canonical Doña Anna figure asset is missing.');
const commerce = read('services/publicCommerce.ts');
const vercel = JSON.parse(read('vercel.json'));

const FREDDY = 'https://www.freddybremseth.com/#person';
const ANNA = 'https://www.donaanna.com/#anna-bremseth';

const title = index.match(/<title>([^<]+)<\/title>/)?.[1] || '';
const description = index.match(/<meta name="description" content="([^"]+)"/)?.[1] || '';
if (title.length < 35 || title.length > 65) fail('Homepage title should stay concise and descriptive.');
if (description.length < 120 || description.length > 175) fail('Homepage meta description should stay useful and compact.');
if ((index.match(/<h1\b/gi) || []).length !== 1) fail('First-response homepage must contain exactly one H1.');
if (!index.includes('Hva er Doña Anna?')) fail('First-response homepage must expose a direct AEO answer.');
if (!index.includes('Hva vil du bruke Doña Anna til?') || !index.includes('Restaurant eller hotell') || !index.includes('Butikk eller import') || !index.includes('Matinteressert')) {
  fail('First-response homepage must expose the complete intent-first customer journey.');
}
if (!index.includes('mål om extra virgin-kvalitet') || index.includes('Verde Vivo er vår 500 ml extra virgin olivenolje')) {
  fail('Homepage must not present extra virgin as confirmed before batch classification.');
}
if (index.includes('unpkg.com/leaflet') || index.includes('family=Fira+Code') || index.includes('family=Montserrat') || index.includes('family=Roboto')) {
  fail('Public shell must not globally load map CSS or unused font families.');
}
if (!index.includes('/guider') || !index.includes('/om-dona-anna') || !index.includes('/personvern')) {
  fail('First-response homepage must expose guide, trust and privacy navigation.');
}

if (!index.includes(FREDDY) || !index.includes(ANNA)) fail('Homepage schema must identify Anna and Freddy Bremseth.');
if (!index.includes('"name": "Anna Bremseth"') || !index.includes('"name": "Freddy Bremseth"')) fail('Both people must be named in structured data.');
if (!index.includes('"@type": "Product"') || !index.includes('"name": "Doña Anna Verde Vivo"')) fail('Homepage schema must expose the real Verde Vivo product.');
if (index.includes('/donaanna/product-design/')) fail('Homepage social preview must not use unapproved bottle imagery.');
if (!index.includes('"@type": "FAQPage"') && !index.includes('"@type":"FAQPage"')) fail('Homepage must include matching FAQ schema.');
if (!index.includes('"@type": "ItemList"') && !index.includes('"@type":"ItemList"')) fail('Homepage must include product ItemList schema.');
if (!index.includes('"@type": "Place"') && !index.includes('"@type":"Place"')) fail('Homepage must identify Biar as a Place entity.');

if (!landing.includes('id="customer-path"') || !landing.includes('Hva vil du bruke Doña Anna til?')) {
  fail('Homepage must retain the intent-first customer journey.');
}
if (!landing.includes('Anna Bremseth og Freddy Bremseth driver Doña Anna sammen')) fail('Visible trust copy must name Anna and Freddy together.');
if (!landing.includes("name.trim().toLowerCase() === 'verde vivo'")) fail('Public commerce must allow only the approved Verde Vivo product.');
if (!landing.includes('VERDE VIVO · 500 ml')) fail('Visible product card must match the approved current format.');
if (!landing.includes('mål om extra virgin-kvalitet') || landing.includes("role: 'Extra virgin olivenolje'")) {
  fail('Visible product copy must keep final extra virgin classification pending batch analysis.');
}
if (!landing.includes('data-testid="tasting-request-form"')) fail('Tasting form must expose a stable submit-measurement hook.');
if (!landing.includes('href="/verde-vivo"')) fail('Homepage product card must link to the dedicated Verde Vivo page.');
if (!commerce.includes("public_site_approved === true")) fail('Live commerce data must require explicit public-site approval.');
if (!commerce.includes("const BRAND_SAFE_FALLBACK = '/donaanna/olive-trees.jpg'")) fail('Public commerce service must retain a brand-safe image fallback.');
if (!commerce.includes("!image.includes('/donaanna/product-design/')")) fail('Public commerce service must reject legacy product-design imagery.');
if (landing.includes('DOÑA ANNA · VERDE ALTO') || landing.includes('Raíz Antigua') || landing.includes('Cocina Viva') || landing.includes('Doña Anna Mesa')) {
  fail('Unapproved product lines must not be marketed as current products.');
}
if (landing.includes('/donaanna/product-design/') || landing.includes('michelin-chef-uses-dona-anna.mp4') || landing.includes('video-av-flasken-klar.mp4')) {
  fail('Public landing must not use unapproved bottle imagery or old bottle videos.');
}
if (landing.includes('<video')) fail('Public landing should avoid heavyweight autoplay/product video until approved brand media is ready.');
if (!landing.includes('ca. 60 000 m²') || !landing.includes('1500')) fail('Homepage should retain the verified estate scale.');
if (!landing.includes('/om-dona-anna') || !landing.includes('/personvern')) fail('Visible homepage must expose trust and privacy pages.');

if (!article.includes("'@type': 'BreadcrumbList'")) fail('Articles must retain BreadcrumbList schema.');
if (!article.includes("author: { '@id': SITE + '/#organization' }")) fail('Editorial articles must use the brand as author unless a verified individual author is supplied.');
if (!article.includes('function inlineMarkup')) fail('Article renderer must support safe internal/external Markdown links.');
if (!article.includes('Hva vil du gjøre videre?')) fail('Articles must expose a next-step journey.');
if (!article.includes('/om-dona-anna') || !article.includes('/personvern')) fail('Articles must retain trust/privacy navigation.');
if (!article.includes("const htmlLevel = Math.min(4, Math.max(2, level));")) fail('Article headings must preserve H2/H3/H4 hierarchy.');

if (!listing.includes("'@type': 'ItemList'")) fail('Listing pages must expose article ItemList schema.');
if (!listing.includes("creator: { '@id': SITE + '/#organization' }")) fail('Editorial hubs must use the brand as creator.');
if (!listing.includes('Fra kunnskap til neste steg')) fail('Editorial hubs must expose the customer next step.');

const evergreenSlugs = [
  'guider',
  'verde-vivo',
  'olivenolje-fra-biar',
  'tidlig-hostet-olivenolje',
  'olivenolje-for-restauranter',
  'bordoliven-fra-biar',
  'om-dona-anna',
  'personvern',
];
const routeRewrites = Array.isArray(vercel.rewrites) ? vercel.rewrites : [];
for (const slug of evergreenSlugs) {
  if (!evergreen.includes(slug + ':') && !evergreen.includes("'" + slug + "':")) fail('Evergreen page missing ' + slug);
  if (!sitemap.includes("'/" + slug + "'")) fail('Sitemap missing evergreen path /' + slug);
  if (!routeRewrites.some((row) => row.source === '/' + slug && String(row.destination || '').includes('/api/public-evergreen'))) {
    fail('Evergreen route must stay server rendered: /' + slug);
  }
}
if (!evergreen.includes("'@type': 'FAQPage'")) fail('Evergreen pages must include FAQPage schema.');
if (!evergreen.includes("page.slug === 'verde-vivo'") || !evergreen.includes("'@type': 'Product'")) fail('Verde Vivo page must expose Product schema.');
if (!evergreen.includes("'@type': 'BreadcrumbList'")) fail('Evergreen pages must include breadcrumb schema.');
if (!evergreen.includes("author: { '@id': ORG }")) fail('Evergreen pages must use Doña Anna as the page author entity.');
if (!evergreen.includes("name: 'Anna Bremseth'") || !evergreen.includes("name: 'Freddy Bremseth'")) fail('Evergreen schema must expose both people.');
if (!evergreen.includes("dateModified: '2026-10-02'")) fail('Evergreen pages must expose an updated date.');
if (!evergreen.includes('Doña Anna har ikke lansert bordoliven som et tilgjengelig produkt nå')) {
  fail('Bordoliven page must clearly distinguish future plans from current products.');
}
if (!evergreen.includes('Anna Bremseth og Freddy Bremseth driver Doña Anna sammen')) fail('About page must state shared responsibility.');

if (!routeRewrites.some((row) => row.source === '/magasin/:slug' && String(row.destination || '').includes('/api/public-article'))) {
  fail('Magazine article routes must stay server rendered.');
}
if (!routeRewrites.some((row) => row.source === '/sitemap.xml' && String(row.destination || '').includes('/api/sitemap'))) {
  fail('Sitemap must stay dynamic.');
}
if (!analytics.includes('/api/public/search-discovery')) fail('Public measurement must capture privacy-minimal search/AI arrivals.');
if (!analytics.includes('/api/public/conversion-event')) fail('Public measurement must capture coarse CTA progression.');
for (const target of ['tasting_interest','tasting_request_submitted','verde_vivo','restaurant_guide','guide_hub','b2b_portal']) {
  if (!analytics.includes(target)) fail('Public measurement missing coarse CTA target ' + target);
}
if (!analytics.includes('addEventListener("submit"') || !analytics.includes('tasting-request-form')) {
  fail('Public measurement must distinguish actual tasting request submission from CTA interest.');
}
if (analytics.includes('tastingRequest') || analytics.includes('email.value') || analytics.includes('company.value')) {
  fail('Public measurement must never read visitor form values.');
}
if (!index.includes('/donaanna-analytics.js') || !evergreen.includes('/donaanna-analytics.js') || !article.includes('/donaanna-analytics.js') || !listing.includes('/donaanna-analytics.js')) {
  fail('All public surfaces must load the privacy-minimal measurement layer.');
}

if (!robots.includes('Sitemap: https://www.donaanna.com/sitemap.xml')) fail('robots.txt must advertise the sitemap.');
for (const path of ['/app','/olivia','/b2b','/api/']) {
  if (!robots.includes('Disallow: ' + path)) fail('robots.txt must protect private/internal route ' + path);
}

if (!process.exitCode) console.log('Doña Anna manual-aligned SEO/AEO/GEO/customer-journey audit passed.');
