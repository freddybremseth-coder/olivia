import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const registry = fs.readFileSync('data/estatePhotos.ts', 'utf8');
const landing = fs.readFileSync('components/PublicB2BLandingPage.tsx', 'utf8');
const manifest = [
  'biar-oliventre-kraftig-stamme.webp',
  'biar-gammel-oliventre-rotstruktur.webp',
  'biar-olivenlund-blaa-himmel.webp',
  'biar-gronne-oliven-naerbilde.webp',
  'biar-oliven-modning-gronn-lilla.webp',
  'biar-morke-oliven-gren.webp',
  'biar-oliventre-hul-stamme.webp',
  'biar-oliventre-lund.webp',
  'biar-gronne-oliven-grener.webp',
  'biar-oliven-gronn-lilla-himmel.webp',
];

test('photo plan references the exact ten prepared web filenames', () => {
  for (const file of manifest) {
    assert.ok(registry.includes(file), `Missing authentic photo: ${file}`);
  }
  const listed = [...registry.matchAll(/\$\{basePath\}\/([^\x60]+\.webp)/g)].map((match) => match[1]);
  assert.deepEqual(new Set(listed), new Set(manifest));
  assert.equal(listed.length, 10);
});

test('authentic estate photos stay hidden until files and use rights are verified', () => {
  const published = registry.match(/export const estatePhotosPublished = (true|false)/)?.[1];
  assert.ok(published, 'Publication flag must exist');
  const allPresent = manifest.every((name) => fs.existsSync(path.join('public/donaanna/garden-2026', name)));
  if (published === 'true') {
    assert.ok(allPresent, 'Do not enable images before all ten files are present in public assets');
    assert.ok(fs.existsSync('docs/donaanna-photo-rights-confirmed.md'), 'Document owner rights confirmation before enabling public images');
  }
  assert.ok(landing.includes('estatePhotosPublished ? estatePhotos.heritageTree.src : biarGrovePhoto'));
  assert.ok(landing.includes('{estatePhotosPublished && ('), 'Gallery must be gated by publication flag');
});

test('authentic-photo descriptions must not claim a named cultivar or an exact tree age', () => {
  assert.ok(registry.includes('NOT verified pictures of any'));
  assert.ok(!registry.includes('500 years'));
  for (const key of ['heritageTree','roots','grove','green','mixed','dark','hollow','wholeTree','branches','color']) {
    const start = registry.indexOf(key + ': {');
    assert.ok(start >= 0, 'Missing image key ' + key);
    assert.ok(registry.slice(start, start + 320).includes("alt: '"), 'Missing descriptive alt for ' + key);
  }
});

test('generated illustration placeholders are not presented as actual estate photos', () => {
  assert.match(landing, /Illustrasjonsbilde\. Ekte fotografier fra vår olivengård publiseres/);
  assert.match(landing, /alt=\{estatePhotosPublished \? estatePhotos\.heritageTree\.alt : 'Illustrasjon av en olivenlund'\}/);
  assert.match(landing, /src=\{biarGrovePhoto\} alt="Illustrasjon av et oliventre"/);
  assert.match(landing, /src=\{imagePaths\.oliveGrove\} alt="Illustrasjon av oliven i en lund"/);
});

test('remaining stock and illustrative harvest imagery does not claim verified estate provenance', () => {
  assert.match(landing, /alt="Illustrasjonsbilde med oliven på trær"/);
  assert.match(landing, /imageAlt: 'Illustrasjonsmotiv med oliven'/);
  assert.match(landing, /imageAlt: 'Illustrasjonsmotiv med oliventrær'/);
  assert.match(landing, /imageAlt: 'Illustrasjon av grønne oliven'/);
  assert.match(landing, /imageAlt: 'Illustrasjon av oliven som råvare'/);
  assert.doesNotMatch(landing, /alt="Mørke oliven på trærne på Doña Anna-gården i Biar"/);
});
