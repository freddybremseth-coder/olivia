import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (name) => readFileSync(name, 'utf8');
const home = read('components/PublicB2BLandingPage.tsx');
const evergreen = read('api/public-evergreen.ts');
const listing = read('api/public-listing.ts');
const article = read('api/public-article.ts');

const expected = [
  ['Gården', '/#estate'],
  ['Oljesmaking', '/#oljesmaking'],
  ['Produkter', '/produkter'],
  ['Historien', '/om-dona-anna'],
  ['Kunnskap', '/kunnskap-og-boker'],
  ['Magasin', '/magasin'],
];

test('all public page templates use the same six primary navigation destinations', () => {
  for (const [label, href] of expected) {
    const homeHref = href.startsWith('/#') ? href.slice(1) : href;
    assert.ok(home.includes("['" + label + "', '" + homeHref + "']"), 'homepage: ' + label);
    for (const [name, content] of [['evergreen', evergreen], ['listing', listing], ['article', article]]) {
      assert.ok(content.includes('<a href="' + href + '">' + label + '</a>'), name + ': ' + label);
    }
  }
  for (const content of [evergreen, listing, article]) {
    assert.match(content, /class="mobile-nav"/);
    assert.match(content, /class="topnav"/);
  }
});

test('B2B is retained as a dedicated portal action, not a competing navigation item', () => {
  const nav = home.slice(home.indexOf('const navLinks = ['), home.indexOf('  return (', home.indexOf('const navLinks = [')));
  assert.doesNotMatch(nav, /For profesjonelle|B2B|Bedriftsportal/);
  assert.match(home, /data-testid="b2b-portal-nav"/);
  assert.match(home, /id="b2b"/);
  assert.match(home, /portal: 'Bedriftsportal'/);
});

test('tablet navigation uses the compact menu until there is room for desktop links', () => {
  assert.match(home, /gap-4 xl:gap-6 xl:flex/);
  assert.match(home, /shrink-0 items-center gap-2 xl:flex/);
  assert.match(home, /xl:hidden" onClick=\{\(\) => setMenuOpen/);
  assert.match(home, /overscroll-contain border-t border-white\/10 py-4 xl:hidden/);
});

test('farm CTAs remain distinct and avoid three cramped equal-width buttons', () => {
  const estate = home.slice(home.indexOf('<section id="estate"'), home.indexOf('<section id="oljesmaking"'));
  assert.match(estate, /grid grid-cols-1 gap-3 sm:grid-cols-2/);
  assert.match(estate, /Oljesmaking på gården/);
  assert.match(estate, /Se sporbarhet/);
  assert.match(estate, /chooseInquiry\('tasting'\)/);
  assert.doesNotMatch(estate, /sm:flex-row/);
  assert.match(home, /const DONA_ANNA_FARM_TASTING_URL = 'https:\/\/www\.costablancatours\.pro\/#tour\/dona-anna'/);
});
