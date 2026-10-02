import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = (message) => { console.error('SEO audit failed:', message); process.exitCode = 1; };

const index = read('index.html');
const landing = read('components/PublicB2BLandingPage.tsx');
const article = read('api/public-article.ts');
const listing = read('api/public-listing.ts');
const evergreen = read('api/public-evergreen.ts');
const sitemap = read('api/sitemap.ts');
const vercel = JSON.parse(read('vercel.json'));

const stablePerson = 'https://www.freddybremseth.com/#person';
const networkDomains = [
  'www.freddybremseth.com',
  'www.zenecohomes.com',
  'www.pinosoecolife.com',
  'www.chatgenius.pro',
  'books.freddybremseth.com',
  'art.freddybremseth.com',
  'remaster.freddybremseth.com',
];

if (!/<title>[^<]*Freddy Bremseth[^<]*<\/title>/.test(index)) fail('Homepage title must connect Doña Anna to Freddy Bremseth.');
if (!index.includes(stablePerson)) fail('Homepage must use the stable Freddy Bremseth Person @id.');
if (!/"founder"\s*:\s*\{\s*"@id"\s*:\s*"https:\/\/www\.freddybremseth\.com\/#person"\s*\}/.test(index)) fail('Doña Anna entity must identify Freddy Bremseth as founder.');
if (!landing.includes('Hva er Doña Anna?')) fail('Homepage must retain the direct-answer AEO section.');
if (!landing.includes('id="people"')) fail('Homepage must retain the visible Freddy Bremseth section.');
if (!landing.includes('Freddy Bremseth network')) fail('Homepage must retain visible cross-brand navigation.');
if (!landing.includes('id="customer-path"')) fail('Homepage must retain the intent-first customer journey.');
if (!landing.includes('Hva vil du bruke Doña Anna til?')) fail('Homepage customer journey must start with user intent.');
if (!landing.includes('/olivenolje-fra-biar') || !landing.includes('/tidlig-hostet-olivenolje') || !landing.includes('/olivenolje-for-restauranter') || !landing.includes('/bordoliven-fra-biar')) {
  fail('Homepage must link the evergreen oliven cluster.');
}
if (!index.includes('"@type": "FAQPage"') && !index.includes('"@type":"FAQPage"')) fail('Homepage must include visible-question FAQ schema.');
if (!index.includes('"@type": "ItemList"') && !index.includes('"@type":"ItemList"')) fail('Homepage must include product portfolio ItemList schema.');
if (!index.includes('"@type": "Place"') && !index.includes('"@type":"Place"')) fail('Homepage must identify Biar as a Place entity.');

for (const domain of networkDomains) {
  if (!landing.includes(domain)) fail('Homepage network missing ' + domain);
  if (!article.includes(domain)) fail('Article network missing ' + domain);
  if (!listing.includes(domain)) fail('Listing network missing ' + domain);
}

if (!article.includes(stablePerson) || !article.includes("author: { '@id': 'https://www.freddybremseth.com/#person' }")) {
  fail('Server-rendered articles must use Freddy Bremseth as the author entity.');
}
if (!article.includes("'@type': 'BreadcrumbList'")) fail('Articles must retain BreadcrumbList schema.');
if (!article.includes("const htmlLevel = Math.min(4, Math.max(2, level));")) fail('Article heading hierarchy must preserve H2/H3/H4 levels.');
if (!listing.includes("creator: { '@id': 'https://www.freddybremseth.com/#person' }")) fail('Listing pages must retain Freddy creator entity.');
if (!listing.includes("'@type': 'ItemList'")) fail('Listing pages must expose article ItemList schema.');
if (!listing.includes('Fra kunnskap til neste steg')) fail('Listing pages must expose a customer next-step journey.');
if (!article.includes('function inlineMarkup')) fail('Article renderer must support safe internal/external markdown links.');
if (!article.includes('Hva vil du gjøre videre?')) fail('Articles must expose a next-step journey.');

for (const slug of ['olivenolje-fra-biar','tidlig-hostet-olivenolje','olivenolje-for-restauranter','bordoliven-fra-biar']) {
  if (!evergreen.includes("'" + slug + "'")) fail('Evergreen page missing ' + slug);
  if (!sitemap.includes("'/" + slug + "'")) fail('Sitemap missing evergreen path /' + slug);
  const rewrites = Array.isArray(vercel.rewrites) ? vercel.rewrites : [];
  if (!rewrites.some((row) => row.source === '/' + slug && String(row.destination || '').includes('/api/public-evergreen'))) {
    fail('Evergreen route must stay server rendered: /' + slug);
  }
}
if (!evergreen.includes("'@type': 'FAQPage'")) fail('Evergreen pages must include FAQPage schema.');
if (!evergreen.includes("'@type': 'BreadcrumbList'")) fail('Evergreen pages must include breadcrumb schema.');
if (!evergreen.includes("dateModified: '2026-10-02'")) fail('Evergreen pages must expose an updated date.');

const routeRewrites = Array.isArray(vercel.rewrites) ? vercel.rewrites : [];
if (!routeRewrites.some((row) => row.source === '/magasin/:slug' && String(row.destination || '').includes('/api/public-article'))) {
  fail('Magazine article routes must stay server rendered.');
}
if (!routeRewrites.some((row) => row.source === '/sitemap.xml' && String(row.destination || '').includes('/api/sitemap'))) {
  fail('Sitemap must stay dynamic.');
}

if (!process.exitCode) console.log('Doña Anna SEO/AEO/GEO entity audit passed.');
