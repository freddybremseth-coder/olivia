import assert from 'node:assert/strict';
import { test } from 'node:test';
import { portalForPath, resolvePortalNavigation } from '../services/portalRouting.ts';

test('B2B entry stays in sales for owners, staff and customers', () => {
  for (const role of ['super_admin', 'farmer', 'b2b_customer']) {
    assert.deepEqual(resolvePortalNavigation('b2b_portal', role, 'olivia'), { tab: 'b2b_portal', portal: 'b2b', path: '/b2b' });
  }
});
test('internal users explicitly switch from B2B to Olivia and back', () => {
  assert.deepEqual(resolvePortalNavigation('dashboard', 'super_admin', 'b2b'), { tab: 'dashboard', portal: 'olivia', path: '/olivia' });
  assert.equal(resolvePortalNavigation('economy', 'farmer', 'olivia').path, '/olivia');
});
test('customers cannot enter farm, finance or admin routes', () => {
  for (const tab of ['dashboard', 'economy', 'admin', 'commerce']) {
    assert.equal(resolvePortalNavigation(tab, 'b2b_customer', 'olivia').tab, 'b2b_portal');
  }
});
test('settings retain the selected portal and non-admins cannot open admin', () => {
  assert.equal(resolvePortalNavigation('settings', 'super_admin', 'b2b').path, '/b2b');
  assert.equal(resolvePortalNavigation('settings', 'farmer', 'olivia').path, '/olivia');
  assert.equal(resolvePortalNavigation('admin', 'farmer', 'olivia').tab, 'dashboard');
});
test('direct links, legacy links and trailing slashes resolve consistently', () => {
  for (const path of ['/b2b', '/b2b/']) assert.equal(portalForPath(path), 'b2b');
  for (const path of ['/olivia', '/olivia/', '/app']) assert.equal(portalForPath(path), 'olivia');
  assert.equal(portalForPath('/'), null);
});
