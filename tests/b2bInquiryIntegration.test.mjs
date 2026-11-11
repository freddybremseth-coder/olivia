import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = relativePath => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('public B2B form saves a request and shows an error if saving fails', () => {
  const page = read('components/PublicB2BLandingPage.tsx');
  assert.match(page, /await createB2BTastingRequest\(/);
  assert.match(page, /setTastingStatus\('success'\)/);
  assert.match(page, /setTastingStatus\('error'\)/);
  assert.match(page, /data-testid="tasting-request-form"/);
  assert.match(page, /name="website" tabIndex=\{-1\}/);
});

test('B2B insertion is write-only for the public and restricted in the database', () => {
  const sql = read('docs/b2b-tasting-requests-setup.sql');
  assert.match(sql, /GRANT INSERT ON olivia\.b2b_tasting_requests TO anon, authenticated/);
  assert.match(sql, /FOR SELECT TO authenticated\s+USING \(olivia_private\.is_olivia_admin\(\)\)/);
  assert.match(sql, /FOR UPDATE TO authenticated\s+USING \(olivia_private\.is_olivia_admin\(\)\)/);
  assert.doesNotMatch(sql, /GRANT SELECT ON olivia\.b2b_tasting_requests TO anon/);
});

test('admin B2B inbox supports refresh and tracked follow-up states', () => {
  const hub = read('components/CommerceHub.tsx');
  assert.match(hub, /fetchB2BTastingRequests\(/);
  assert.match(hub, /updateB2BInquiryStatus\(/);
  for (const status of ['new', 'qualified', 'contacted', 'closed']) {
    assert.match(hub, new RegExp(`value="${status}"`));
  }
});

test('B2B email notifications are server-only, authenticated and re-read stored records', () => {
  const handler = read('api/b2b/notify.ts');
  const setup = read('docs/b2b-email-notifications.md');
  assert.match(handler, /timingSafeEqual/);
  assert.match(handler, /DONAANNA_B2B_WEBHOOK_SECRET/);
  assert.match(handler, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(handler, /\.eq\('id', id\)\.maybeSingle\(\)/);
  assert.match(handler, /htmlEscape\(value\)/);
  assert.match(handler, /Idempotency-Key/);
  assert.match(setup, /ikke aktivert/);
  assert.match(setup, /Database Webhook/);
  assert.doesNotMatch(handler, /import\.meta\.env|VITE_RESEND/);
});

test('B2B admin CSV handoff is explicit and does not silently create RealtyFlow contacts', () => {
  const service = read('services/b2bTasting.ts');
  const hub = read('components/CommerceHub.tsx');
  const guide = read('docs/b2b-realtyflow-handoff.md');
  assert.match(service, /export function exportB2BInquiriesCsv/);
  assert.match(service, /\[=\+@-\]/);
  assert.match(hub, /Eksporter viste/);
  assert.match(guide, /manuell handoff/);
  assert.match(guide, /donaanna/);
});

test('admin inquiry list supports search and status filtering, and exports only visible rows', () => {
  const hub = read('components/CommerceHub.tsx');
  assert.match(hub, /inquiryQuery/);
  assert.match(hub, /inquiryStatusFilter/);
  assert.match(hub, /visibleInquiries\.map/);
  assert.match(hub, /exportB2BInquiriesCsv\(visibleInquiries\)/);
});
