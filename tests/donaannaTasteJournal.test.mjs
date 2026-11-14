import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync('public/smakejournal.html','utf8');
const vercel=JSON.parse(readFileSync('vercel.json','utf8'));
const sitemap=readFileSync('api/sitemap.ts','utf8');
const landing=readFileSync('components/PublicB2BLandingPage.tsx','utf8');
const evergreen=readFileSync('api/public-evergreen.ts','utf8');

test('standalone journal is publicly routed and discoverable from academy and sitemap',()=>{
  assert.ok(vercel.rewrites.some(x=>x.source==='/smakejournal'&&x.destination==='/smakejournal.html'));
  assert.match(sitemap,/['"]\/smakejournal['"]/);
  assert.match(landing,/href="\/smakejournal"/);
  assert.match(evergreen,/href: '\/smakejournal'/);
  assert.match(html,/rel="canonical" href="https:\/\/www\.donaanna\.com\/smakejournal"/);
});
test('oil and wine offer distinct correct senses and paired comparisons',()=>{
  for(const item of ['Fruktighet','Bitterhet','Pepperaktig pungens','Opplevd harmoni','Aromatisk varighet','Syre','Tannin / tørrhet','Alkoholvarme','Fylde']) assert.ok(html.includes(item),item);
  assert.match(html,/sampleA:read\('a'\), sampleB:read\('b'\)/);
  assert.match(html,/Største registrerte forskjell/);
  assert.match(html,/def\.metrics/);
});
test('journal does not transmit or automatically persist visitor content',()=>{
  assert.doesNotMatch(html,/\bfetch\s*\(|\bXMLHttpRequest\b|\bnavigator\.sendBeacon\b|\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b/);
  assert.doesNotMatch(html,/<script[^>]+src=/);
  assert.match(html,/JSON\.stringify\(data\(\),null,2\)/);
  assert.match(html,/window\.print\(\)/);
  assert.match(html,/Lukker eller laster du siden på nytt, forsvinner det du ikke har lagret/);
  assert.match(html,/Ikke en offisiell|ikke en offisiell/i);
});
test('mobile layout, accessible labels and explicit choice handling are present',()=>{
  assert.match(html,/@media\(max-width:760px\)/);
  assert.match(html,/aria-pressed="true"/);
  assert.match(html,/aria-live="polite"/);
  assert.match(html,/window\.confirm\('Bytte smakstype/);
  assert.match(html,/window\.confirm\('Tømme begge prøvene/);
  assert.match(html,/escapeHtml\(/);
});
