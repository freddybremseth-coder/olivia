import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const landing = readFileSync('components/PublicB2BLandingPage.tsx', 'utf8');
const community = readFileSync('docs/donaanna-fellesskap-instagram-facebook-90-dager-2026-11-14.md', 'utf8');

test('owner-provided Facebook group is linked safely from public gallery and footer', () => {
  assert.match(landing, /DONA_ANNA_FACEBOOK_GROUP_URL = "https:\/\/www\.facebook\.com\/groups\/1837377830741494"/);
  assert.match(landing, /Bli med i olivenfellesskapet/);
  assert.match(landing, /Facebook-gruppen · olivenfellesskapet/);
  assert.equal((landing.match(/href=\{DONA_ANNA_FACEBOOK_GROUP_URL\} target="_blank" rel="noopener noreferrer"/g) || []).length, 2);
});

test('Facebook group is a manual community destination, not a third autopilot publishing channel', () => {
  assert.match(community, /Facebook-gruppe: https:\/\/www\.facebook\.com\/groups\/1837377830741494/);
  assert.match(community, /gruppens faktiske navn er ikke verifisert/i);
  assert.match(community, /manuelt med Facebooks native gruppeverktøy/i);
});
