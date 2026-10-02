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
if (title.length < 50 || title.length > 60) fail('Homepage title must stay within the 50–60 character SEO target.');
if (description.length < 120 || description.length > 160) fail('Homepage meta description must stay within the 120–160 character SEO target.');
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
for (const productName of ['Doña Anna Verde Vivo','Doña Anna Verde Alto','Doña Anna Raíz Antigua','Doña Anna Cocina Viva','Doña Anna Mesa · Gordal Noble']) {
  if (!index.includes('"name": "' + productName + '"')) fail('Homepage schema missing distinct product: ' + productName);
}
if (index.includes('/donaanna/product-design/')) fail('Homepage social preview must not use unapproved bottle imagery.');
if (!index.includes('<link rel="preload" as="image" href="/donaanna/hero-image.jpg" fetchpriority="high">')) {
  fail('Homepage must preload the lightweight LCP hero image.');
}
if (!index.includes('https://www.donaanna.com/donaanna/hero-image.jpg')) {
  fail('Homepage social preview must use the approved lightweight harvest image.');
}
if (!landing.includes("estateHero: '/donaanna/hero-image.jpg'")) {
  fail('Public landing must retain the lightweight harvest hero.');
}
if (!index.includes('"@type": "FAQPage"') && !index.includes('"@type":"FAQPage"')) fail('Homepage must include matching FAQ schema.');
if (!index.includes('"@type": "ItemList"') && !index.includes('"@type":"ItemList"')) fail('Homepage must include product ItemList schema.');
if (!index.includes('"@type": "Place"') && !index.includes('"@type":"Place"')) fail('Homepage must identify Biar as a Place entity.');

if (!landing.includes('id="customer-path"') || !landing.includes('Hva vil du bruke Doña Anna til?')) {
  fail('Homepage must retain the intent-first customer journey.');
}
if (!landing.includes('Anna Bremseth og Freddy Bremseth driver Doña Anna sammen')) fail('Visible trust copy must name Anna and Freddy together.');
for (const productName of ['VERDE VIVO','VERDE ALTO','RAÍZ ANTIGUA','COCINA VIVA','MESA · GORDAL NOBLE']) {
  if (!landing.includes(productName)) fail('Visible portfolio missing distinct Doña Anna product: ' + productName);
}
if (!landing.includes("name: 'Verde Vivo'") || !landing.includes("format: '500 ml · Cosecha temprana'")) {
  fail('Verde Vivo must retain its approved current public name and 500 ml format.');
}
if (!landing.includes('mål om extra virgin-kvalitet') || landing.includes("role: 'Extra virgin olivenolje'")) {
  fail('Visible product copy must keep final extra virgin classification pending batch analysis.');
}
if (!landing.includes('data-testid="tasting-request-form"')) fail('Tasting form must expose a stable submit-measurement hook.');
if (!landing.includes('id="tasting-product"') || !landing.includes('Mesa · Gordal Noble (planlagt)')) {
  fail('Tasting/customer journey must capture which distinct Doña Anna product the lead is interested in.');
}
if (!landing.includes("new URLSearchParams(window.location.search).get('product')") || !landing.includes("'mesa-gordal-noble': 'Mesa · Gordal Noble (planlagt)'")) {
  fail('Product landing pages must be able to preselect the correct product in the tasting journey.');
}
for (const slug of ['verde-vivo','verde-alto','raiz-antigua','cocina-viva','mesa-gordal-noble']) {
  if (!evergreen.includes("href: '/?product=" + slug + "#tasting'")) {
    fail('Product page CTA must deep-link to the matching tasting selection: ' + slug);
  }
}
for (const productSlug of ['verde-vivo','verde-alto','raiz-antigua','cocina-viva','mesa-gordal-noble']) {
  if (!landing.includes("slug: '" + productSlug + "'")) fail('Homepage product media/routing registry missing ' + productSlug);
}
if (!landing.includes("const productHref = (name: string) => '/' + productMedia(name).slug;")) {
  fail('Homepage product links must resolve through the product-specific media registry.');
}
if (!commerce.includes("public_site_approved === true")) fail('Live commerce data must require explicit public-site approval.');
if (!commerce.includes("const BRAND_SAFE_FALLBACK = '/donaanna/olive-trees.jpg'")) fail('Public commerce service must retain a brand-safe image fallback.');
if (!commerce.includes("!image.includes('/donaanna/product-design/')")) fail('Public commerce service must reject legacy product-design imagery.');
if (!commerce.includes('product_image_approved') || !commerce.includes('product_slug') || !commerce.includes('exactProductMatch')) {
  fail('Public commerce product imagery must require explicit approval and an exact product-slug match.');
}
if (!landing.includes('const PRODUCT_MEDIA: Record<string, ProductMedia>') || !landing.includes("approvedProductImage: null")) {
  fail('Homepage must keep a product-specific media registry with safe fallback states.');
}
for (const slug of ['verde-vivo','verde-alto','raiz-antigua','cocina-viva','mesa-gordal-noble']) {
  if (!landing.includes("slug: '" + slug + "'")) fail('Product media registry missing ' + slug);
}
if (!commerce.includes("'verde alto'") || !commerce.includes("'raíz antigua'") || !commerce.includes("'cocina viva'") || !commerce.includes("'mesa · gordal noble'")) {
  fail('Public commerce allowlist must support the distinct approved Doña Anna product names.');
}
if (landing.includes('/donaanna/product-design/') || landing.includes('michelin-chef-uses-dona-anna.mp4') || landing.includes('video-av-flasken-klar.mp4')) {
  fail('Public landing must not use unapproved bottle imagery or old bottle videos.');
}
if (landing.includes('alt="Doña Anna olivenolje helles over brød"')) {
  fail('Public image alt text must describe the image actually shown.');
}
if (!landing.includes("harvestHands: '/donaanna/hero-image.jpg'") || !landing.includes("harvestClose: '/donaanna/farming-2.jpg'")) {
  fail('Public landing must retain the approved product-free harvest image variety.');
}
if (landing.includes('<video')) fail('Public landing should avoid heavyweight autoplay/product video until approved brand media is ready.');
if (!landing.includes('ca. 60 000 m²') || !landing.includes('1500')) fail('Homepage should retain the verified estate scale.');
if (!landing.includes('Én merkevare. Flere tydelige produkter.')) fail('Homepage must present Doña Anna as a multi-product brand.');
for (const staleHomepageCopy of [
  'Meld interesse for Verde Vivo. Vi bekrefter smaksprøve',
  'dokumentasjon rundt Verde Vivo. Smaksprøve',
  'kan melde interesse for Verde Vivo. Vi svarer',
  'Prosjektet handler om gården, oliventrærne, Verde Vivo'
]) {
  if (landing.includes(staleHomepageCopy)) fail('Homepage customer journey must not collapse the portfolio into Verde Vivo.');
}
if (!landing.includes('Produktspesifikt batchpass') || !landing.includes('Hvert produkt bruker sin egen godkjente etikett')) {
  fail('Homepage traceability and product-data sections must be product-specific.');
}
if (!index.includes('Verde Alto') || !index.includes('Raíz Antigua') || !index.includes('Cocina Viva') || !index.includes('Mesa · Gordal Noble')) {
  fail('Crawlable first-response homepage must expose the distinct product line.');
}
if (!landing.includes('/om-dona-anna') || !landing.includes('/personvern')) fail('Visible homepage must expose trust and privacy pages.');

if (!article.includes("'@type': 'BreadcrumbList'")) fail('Articles must retain BreadcrumbList schema.');
if (!article.includes("author: { '@id': SITE + '/#organization' }")) fail('Editorial articles must use the brand as author unless a verified individual author is supplied.');
if (!article.includes('function inlineMarkup')) fail('Article renderer must support safe internal/external Markdown links.');
if (!article.includes('Hva vil du gjøre videre?')) fail('Articles must expose a next-step journey.');
if (!article.includes('/om-dona-anna') || !article.includes('/personvern')) fail('Articles must retain trust/privacy navigation.');
if (!article.includes("const htmlLevel = Math.min(4, Math.max(2, level));")) fail('Article headings must preserve H2/H3/H4 hierarchy.');

const listingSeoTitles = [...listing.matchAll(/seoTitle:\s*'([^']+)'/g)].map(match => match[1]);
const listingDescriptions = [...listing.matchAll(/description:\s*'([^']+)'/g)].map(match => match[1]).slice(0, 4);
if (listingSeoTitles.length !== 4 || listingSeoTitles.some(value => value.length < 50 || value.length > 60)) {
  fail('Editorial hub SEO titles must stay within the 50–60 character target.');
}
if (listingDescriptions.length !== 4 || listingDescriptions.some(value => value.length < 120 || value.length > 160)) {
  fail('Editorial hub meta descriptions must stay within the 120–160 character target.');
}
if (!listing.includes("'@type': 'ItemList'")) fail('Listing pages must expose article ItemList schema.');
if (!listing.includes("creator: { '@id': SITE + '/#organization' }")) fail('Editorial hubs must use the brand as creator.');
if (!listing.includes('Fra kunnskap til neste steg')) fail('Editorial hubs must expose the customer next step.');

const evergreenSlugs = [
  'guider',
  'produkter',
  'verde-vivo',
  'verde-alto',
  'raiz-antigua',
  'cocina-viva',
  'mesa-gordal-noble',
  'olivenolje-fra-biar',
  'tidlig-hostet-olivenolje',
  'olivenolje-for-restauranter',
  'bordoliven-fra-biar',
  'om-dona-anna',
  'personvern',
];
const routeRewrites = Array.isArray(vercel.rewrites) ? vercel.rewrites : [];
const routeRedirects = Array.isArray(vercel.redirects) ? vercel.redirects : [];
const legacyRedirects = {
  '/product-verde-vivo.html': '/verde-vivo',
  '/product-verde-alto.html': '/verde-alto',
  '/product-raiz-antigua.html': '/raiz-antigua',
  '/product-cocina-viva.html': '/cocina-viva',
  '/product-mesa-gordal-noble.html': '/mesa-gordal-noble',
  '/organic-extra-virgin-olive-oil.html': '/olivenolje-fra-biar',
  '/olive-oil-for-restaurants.html': '/olivenolje-for-restauranter',
  '/b2b-olive-oil.html': '/olivenolje-for-restauranter',
  '/olive-oil-traceability.html': '/verde-vivo',
  '/tasting-kit.html': '/olivenolje-for-restauranter',
};
for (const [source, destination] of Object.entries(legacyRedirects)) {
  if (!routeRedirects.some((row) => row.source === source && row.destination === destination && row.permanent === true)) {
    fail('Legacy public route must redirect permanently: ' + source);
  }
}
for (const slug of evergreenSlugs) {
  if (!evergreen.includes(slug + ':') && !evergreen.includes("'" + slug + "':")) fail('Evergreen page missing ' + slug);
  if (!sitemap.includes("'/" + slug + "'")) fail('Sitemap missing evergreen path /' + slug);
  if (!routeRewrites.some((row) => row.source === '/' + slug && String(row.destination || '').includes('/api/public-evergreen'))) {
    fail('Evergreen route must stay server rendered: /' + slug);
  }
}
const evergreenTitles = [...evergreen.matchAll(/^\s{4}title:\s*'([^']+)'/gm)].map(match => match[1]);
const evergreenDescriptions = [...evergreen.matchAll(/^\s{4}description:\s*'([^']+)'/gm)].map(match => match[1]);
if (evergreenTitles.length < 8 || evergreenTitles.some(value => value.length < 50 || value.length > 60)) {
  fail('Every evergreen SEO title must stay within the 50–60 character target.');
}
if (evergreenDescriptions.length < 8 || evergreenDescriptions.some(value => value.length < 120 || value.length > 160)) {
  fail('Every evergreen meta description must stay within the 120–160 character target.');
}
if (!evergreen.includes("'@type': 'FAQPage'")) fail('Evergreen pages must include FAQPage schema.');
if (!evergreen.includes("const productSchema: Record<string") || !evergreen.includes("'@type': 'Product'")) fail('Distinct product pages must expose Product schema.');
for (const productSlug of ['verde-vivo','verde-alto','raiz-antigua','cocina-viva','mesa-gordal-noble']) {
  if (!evergreen.includes("'" + productSlug + "': { name:")) fail('Product schema map missing ' + productSlug);
}
if (!evergreen.includes("'@type': 'BreadcrumbList'")) fail('Evergreen pages must include breadcrumb schema.');
if (!evergreen.includes("author: { '@id': ORG }")) fail('Evergreen pages must use Doña Anna as the page author entity.');
if (!evergreen.includes("name: 'Anna Bremseth'") || !evergreen.includes("name: 'Freddy Bremseth'")) fail('Evergreen schema must expose both people.');
if (!evergreen.includes("dateModified: '2026-10-02'")) fail('Evergreen pages must expose an updated date.');
for (const staleClaim of [
  'tidlig høstede extra virgin olivenolje fra Biar',
  '500 ml extra virgin olivenolje utviklet rundt tidlig høsting',
  'tidlig høstet extra virgin olivenolje.',
  'Produktretningen er extra virgin olivenolje'
]) {
  if (evergreen.includes(staleClaim)) fail('Evergreen content must not present extra virgin as confirmed before batch classification.');
}
if (!evergreen.includes('mål om extra virgin-kvalitet') || !evergreen.includes('Endelig kvalitetsklasse')) {
  fail('Evergreen product pages must clearly qualify the pending extra virgin classification.');
}
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
