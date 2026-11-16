import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const files = [
 'components/PublicB2BLandingPage.tsx',
 'api/public-evergreen.ts',
 'api/public-listing.ts',
 'api/public-article.ts',
].map(path => ({ path, text: readFileSync(path, 'utf8') }));
const style = readFileSync('public/donaanna-footer.css', 'utf8');
const entry = readFileSync('index.html', 'utf8');

test('every public page has the complete estate footer and shared premium CSS', () => {
  for (const {path,text} of files) {
    for (const term of ['da-footer', 'Oljesmaking og gårdsbesøk', 'Samarbeid og B2B', 'info@donaanna.com', 'Biar, Alicante, Spania', 'Se Biar på Google Maps', 'Telefon oppgis ved avtale', 'Personvern']) {
      assert.ok(text.includes(term), path+' missing '+term);
    }
    for (const handle of ['facebook.com/groups/1837377830741494', 'instagram.com/dona_anna_olives/']) {
      assert.ok(text.includes(handle) || (path.includes('LandingPage') && handle.startsWith('facebook.')), path+' missing '+handle);
    }
  }
  assert.ok(entry.includes('/donaanna-footer.css'));
  for (const {path,text} of files.filter(x=>x.path.startsWith('api/'))) {
    assert.ok(text.includes('href="/donaanna-footer.css"'), path);
  }
  assert.match(style, /\.da-footer-grid\{display:grid/);
  assert.match(style, /@media\(max-width:640px\)/);
});

test('never claim publicly verified private farm street address or phone number', () => {
  for (const {path,text} of files) {
    assert.ok(text.includes('Privat gård'), path);
    assert.ok(text.includes('Kartet viser området, ikke nøyaktig gårdsadresse'), path);
  }
});

test('B2B and Olivia login buttons are preserved on React homepage', () => {
  const home = files[0].text;
  for (const testId of ['b2b-portal-footer', 'olivia-os-footer']) assert.ok(home.includes('data-testid="'+testId+'"'));
  assert.match(home, /onClick=\{onLogin\}/);
  assert.match(home, /onClick=\{onAdminLogin\}/);
});

test('footer symbol is large, legible and uses brand gold and cream instead of inversion', () => {
  assert.match(style, /\.da-footer-mark\{[^}]*width:76px;height:102px/);
  assert.doesNotMatch(style, /\.da-footer-mark\{[^}]*filter:invert\(1\)/);
  assert.match(style, /\.da-footer-wordmark\{[^}]*font:600 clamp\(26px/);
  assert.match(style, /@media\(max-width:640px\)\{[^}]*\.da-footer-mark\{width:64px;height:88px\}/);
});
