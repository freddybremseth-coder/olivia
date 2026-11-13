import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const landing = readFileSync('components/PublicB2BLandingPage.tsx','utf8');
const photos = readFileSync('data/estatePhotos.ts','utf8');
const brief = readFileSync('docs/donaanna-signaturflaske-design-og-kvalitetsbrief-v1-2026-11-13.md','utf8');

test('premium craft uses verified photo registry and preserves disabled-by-default fallback', () => {
  assert.match(landing,/id="premium-craft"/);
  assert.match(landing,/src=\{estatePhotosPublished \? estatePhotos\.roots\.src : imagePaths\.oliveGrove\}/);
  assert.match(landing,/estatePhotosPublished \? estatePhotos\.roots\.alt : 'Illustrasjon av oliventrær'/);
  assert.match(photos,/roots: \{/);
});
test('premium message is about provenance, evidence and design rather than invented €80 stock', () => {
  const start = landing.indexOf('<section id="premium-craft"');
  const end = landing.indexOf('<section id="gifts"', start);
  assert.ok(start > 0 && end > start);
  const section = landing.slice(start, end);
  assert.match(section,/01 · Opprinnelse/);
  assert.match(section,/02 · Kvalitet/);
  assert.match(section,/03 · Presentasjon/);
  assert.match(section,/analys/);
  assert.match(section,/godkjente fysiske prøver/);
  assert.match(section,/Ingen pris, begrenset opplag/);
  assert.doesNotMatch(section, /€80|80 euro|garantert|sertifisert økologisk|prisvinnende/);
});
test('internal signature bottle brief has separate supplier, batch and market gates', () => {
  for(const phrase of ['Biar Nocturne','Raíz Escultura','Tierra Lata','Gate A','Gate B','Gate C','Gate D','Blindsmaking','Ikke lov nummerering']) {
    assert.ok(brief.includes(phrase), 'Missing brief requirement: '+phrase);
  }
});
