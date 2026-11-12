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
    assert.match(registry, new RegExp(key + ': \\{[\\s\\S]*?alt: \\'[^\\']+\\''));
  }
});
