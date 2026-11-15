import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const analytics = readFileSync('public/donaanna-analytics.js', 'utf8');

test('Doña Anna tasting intent is a coarse next_step, never a fake delivered inquiry', () => {
  assert.match(analytics, /eventType: "next_step"/);
  assert.match(analytics, /target: productSlug \? "tasting_form_attempt_" \+ productSlug : "tasting_form_attempt"/);
  assert.match(analytics, /allowedProducts = \["verde-vivo", "verde-alto", "raiz-antigua", "cocina-viva", "mesa-gordal-noble"\]/);
  assert.doesNotMatch(analytics, /tasting_request_submitted/);
  assert.doesNotMatch(analytics, /tasting_request_delivered/);
  assert.doesNotMatch(analytics, /lead_created/);
  assert.match(analytics, /form\[data-testid="tasting-request-form"\]/);
});

test('privacy-minimal tracking never transmits visitor URL query or customer identity', () => {
  assert.match(analytics, /body: JSON.stringify\(\{/);
  assert.match(analytics, /discoverySource: discoverySource/);
  assert.doesNotMatch(analytics, /body:\s*JSON.stringify\(\{[^}]*email:/s);
  assert.doesNotMatch(analytics, /body:\s*JSON.stringify\(\{[^}]*utm_content:/s);
});
