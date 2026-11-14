import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const landing=readFileSync('components/PublicB2BLandingPage.tsx','utf8');
const evergreen=readFileSync('api/public-evergreen.ts','utf8');
const sitemap=readFileSync('api/sitemap.ts','utf8');
const vercel=JSON.parse(readFileSync('vercel.json','utf8'));
const editorial=readFileSync('docs/donaanna-bokforankret-historie-og-smakeakademi-2026-11-14.md','utf8');

test('three education pages are linked, indexed and follow existing public handler routing', () => {
 for(const slug of ['kunnskap-og-boker','laer-a-smake-olivenolje','laer-a-smake-vin']){
   assert.match(evergreen,new RegExp("'"+slug+"': \\{"));
   assert.ok(vercel.rewrites.some(r=>r.source==='/'+slug && r.destination==='/api/public-evergreen?page='+slug));
   assert.ok(sitemap.includes("'/" +slug+"'"));
   assert.ok(landing.includes('href="/'+slug+'"'));
 }
 assert.ok(evergreen.includes("href: 'https://books.freddybremseth.com/'"));
});
test('new book manuscripts are described as manuscripts rather than purchasable finished books', () => {
 const start=evergreen.indexOf("  'kunnskap-og-boker': {");
 const end=evergreen.indexOf("  guider: {");
 const academy=evergreen.slice(start,end);
 assert.ok(start>0 && end>start);
 for(const phrase of ['arbeidsmanus','ikke annonsert som tilgjengelig for salg','ikke en vinbutikk','ikke en offisiell sensorisk','My Journey as a Father']){
   assert.ok(academy.toLowerCase().includes(phrase.toLowerCase()),phrase);
 }
 assert.doesNotMatch(academy,/€80|kr [0-9]|bestill nå|kredittkort/i);
});
test('tasting exercises preserve distinction between pedagogy and formal oil classification', () => {
 assert.match(evergreen,/En mild olje kan være svært god/);
 assert.match(evergreen,/Hjemmeøvelser|hjemmeøvelse|offisiell klassifisering/i);
 assert.match(evergreen,/Mild.*Arbequina|mild Arbequina/);
 assert.match(evergreen,/Picual eller Coratina/);
 assert.match(evergreen,/Tannin kan kjennes som tørrhet/);
 assert.match(evergreen,/ikke en vinprodusent/);
});
test('founder and legacy story is supported without public family-member exposure or unverified quality claims', () => {
 assert.match(editorial,/My Journey as a Father/);
 assert.match(editorial,/Ikke gjenbruk private eller konfliktfylte familieepisoder/);
 assert.match(editorial,/Polyfenolens kraft/);
 assert.match(editorial,/Kunsten å høste tidlig/);
 assert.match(landing,/id="academy"/);
 assert.match(landing,/Kunnskapen bak oljen er også en del av historien/);
 assert.match(landing,/arbeidsmanus, ikke lanserte produkter/);
});
