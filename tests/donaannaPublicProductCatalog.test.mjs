import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync('components/PublicB2BLandingPage.tsx', 'utf8');
const commerce = readFileSync('services/publicCommerce.ts', 'utf8');
const products = readFileSync('content/donaAnnaProducts.ts', 'utf8');

test('the five canonical products remain visible even if feed has fewer than five approved entries', () => {
  assert.match(page, /const portfolioItems = portfolio\.map\(item =>/);
  assert.doesNotMatch(page, /approvedLivePortfolio\.length >= 4 \? approvedLivePortfolio : portfolio/);
  assert.match(page, /registry\?\.availability === 'planned' \|\| !live/);
  for (const name of ['Verde Vivo', 'Verde Alto', 'Raíz Antigua', 'Cocina Viva', 'Mesa · Gordal Noble']) {
    assert.ok(products.includes(`name: '${name}'`));
  }
});

test('publish price and stock figures only with separate approvals', () => {
  assert.match(commerce, /metadata\.public_price_approved !== true/);
  assert.match(commerce, /row\.metadata\?\.public_stock_approved !== true/);
  assert.match(commerce, /row\?\.metadata\?\.public_site_approved === true/);
});

test('product cards show product-specific availability messaging', () => {
  assert.match(page, /productMedia\(item\.name\)\.availabilityText/);
});
