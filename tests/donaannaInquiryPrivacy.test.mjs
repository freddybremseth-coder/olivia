import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const page = readFileSync('api/public-evergreen.ts','utf8');
const landing = readFileSync('components/PublicB2BLandingPage.tsx','utf8');

test('privacy information explains both manual email and future direct delivery accurately', () => {
  const index = page.indexOf('  personvern: {');
  assert.ok(index > 0);
  const privacy = page.slice(index);
  assert.match(privacy,/Når direkte innsending er deaktivert/);
  assert.match(privacy,/Når direkte innsending er aktivert/);
  assert.match(privacy,/RealtyFlow PRO/);
  assert.match(privacy,/logg over utsendelsen/);
  assert.match(privacy,/ikke som en automatisk påmelding til markedsføring/);
  assert.match(privacy,/Rå IP-adresser lagres ikke i denne spesifikke begrensningstabellen/);
  assert.doesNotMatch(privacy,/Forespørselen åpner en e-post i brukerens eget e-postprogram\.'/);
});
test('contact form links to privacy information beside action button', () => {
  assert.match(landing, /href="\/personvern" className="font-semibold underline underline-offset-2"/);
  assert.match(landing, /directInquiryEnabled \?/);
});
