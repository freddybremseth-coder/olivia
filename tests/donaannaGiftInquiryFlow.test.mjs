import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('components/PublicB2BLandingPage.tsx', 'utf8');

test('product is mandatory for tastings but not for gift interest', () => {
  assert.match(source, /id="tasting-product" required=\{inquiryKind === 'tasting'\}/);
  assert.match(source, /inquiryKind !== 'tasting' && <option value="">Ikke bestemt ennå<\/option>/);
});

test('every gift CTA enters shared inquiry form with appropriate type', () => {
  assert.match(source, /onClick=\{\(\) => chooseInquiry\('gift'\)\}/);
  assert.match(source, /onClick=\{\(\) => chooseInquiry\('corporate-gift', 'business'\)\}/);
  assert.match(source, /kind: inquiryKind/);
});

test('mailto fallback distinguishes product selection from no preference', () => {
  assert.match(source, /Produktinteresse: \$\{tastingRequest\.product \|\| 'Ikke bestemt'\}/);
  assert.match(source, /window\.location\.href = `mailto:info@donaanna\.com/);
});
