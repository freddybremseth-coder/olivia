import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const index = readFileSync('index.html','utf8');
const landing = readFileSync('components/PublicB2BLandingPage.tsx','utf8');
const evergreen = readFileSync('api/public-evergreen.ts','utf8');
const catalog = readFileSync('content/donaAnnaProducts.ts','utf8');

test('public premium opening is owner-led and shows verified real estate photography', () => {
  assert.match(landing, /headline: 'Doña Anna – olivenolje med røtter i Biar\.'/);
  assert.match(landing, /Vi er Anna og Freddy/);
  assert.match(landing, /src=\{estatePhotosPublished \? estatePhotos\.heritageTree\.src : imagePaths\.estateHero\}/);
  assert.match(landing, /estatePhotosPublished \? estatePhotos\.grove\.src : biarGrovePhoto/);
  assert.match(index, /Doña Anna \| Olivenolje med røtter i Biar/);
  assert.match(index, /garden-2026\/biar-oliventre-kraftig-stamme\.webp/);
});
test('founder story stays specific and avoids unverifiable scarcity or sensory promises', () => {
  const start = evergreen.indexOf("  'om-dona-anna': {");
  const end = evergreen.indexOf("  personvern: {",start);
  const about = evergreen.slice(start,end);
  assert.match(about,/60 000 m²/);
  assert.match(about,/1 500 oliventrær/);
  assert.match(about,/Genovesa, Gordal, Changlot Real og Picual/);
  assert.match(about,/beskrives for den faktiske produksjonen/);
  assert.match(about,/før dokumentasjonen foreligger/);
});
test('premium design never presents five pending product photos or labels as approved', () => {
  const photos = [...catalog.matchAll(/approvedProductImage: null/g)];
  assert.equal(photos.length,5);
  assert.match(landing, /Kun godkjente etiketter vises som ferdige/);
  assert.doesNotMatch(landing, /Hvert produkt bruker sin egen godkjente etikett/);
  assert.doesNotMatch(landing, /€80|80 euro/);
});
