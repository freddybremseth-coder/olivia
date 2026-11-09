#!/usr/bin/env node
// Read-only Doña Anna SEO smoke check. Intended for scheduled GitHub Actions.
const base = 'https://www.donaanna.com';
const legacy = new Map([
  ['/artikler/dona-anna-article-nettside', '/artikler/hvordan-velge-god-olivenolje'],
  ['/magasin/dona-anna-article-nettside', '/magasin/tidlig-hostet-olivenolje-biar'],
  ['/magasin/dona-anna-article-facebook', '/magasin/oppbevaring-av-olivenolje'],
]);
const failures = [];
async function request(url, redirect = 'follow') {
  const response = await fetch(url, { redirect, signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'DonaAnna-SEO-Health/1.0' } });
  return response;
}
function note(message) { failures.push(message); console.error('FAIL', message); }
function decodeXml(value) { return value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'); }

const sitemapResponse = await request(base + '/sitemap.xml');
if (!sitemapResponse.ok) note('Sitemap returned HTTP ' + sitemapResponse.status);
const xml = await sitemapResponse.text();
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => decodeXml(match[1]));
if (!urls.length) note('Sitemap has no URLs');
if (new Set(urls).size !== urls.length) note('Sitemap contains duplicate URLs');
console.log('Checking', urls.length, 'sitemap URLs');
for (let i = 0; i < urls.length; i += 5) {
  await Promise.all(urls.slice(i, i + 5).map(async url => {
    try {
      const response = await request(url);
      if (response.status !== 200) return note(url + ' returned HTTP ' + response.status);
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) return note(url + ' is not HTML');
      const html = await response.text();
      const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1];
      if (canonical !== url) note(url + ' canonical mismatch: ' + (canonical || 'missing'));
      const title = html.match(/<title>([^<]+)<\/title>/i)?.[1] || '';
      if (!title || /Dona Anna\s*[–-]\s*article\b/i.test(title)) note(url + ' missing or generic title');
      if (/<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(html)) note(url + ' unexpectedly noindex');
    } catch (error) { note(url + ' fetch failed: ' + error.message); }
  }));
}
for (const [source, destination] of legacy) {
  try {
    const response = await request(base + source, 'manual');
    if (response.status !== 301) note(source + ' expected 301, got ' + response.status);
    const location = response.headers.get('location') || '';
    if (new URL(location, base).pathname !== destination) note(source + ' redirect target mismatch: ' + location);
  } catch (error) { note(source + ' redirect check failed: ' + error.message); }
}
for (const category of ['/magasin', '/artikler', '/blogg', '/oppskrifter']) {
  try {
    const response = await request(base + category);
    const html = await response.text();
    const indexed = urls.includes(base + category);
    const noindex = /<meta\\s+name=["']robots["']\\s+content=["']noindex,follow["']/i.test(html);
    if (response.status !== 200) note('Category returned HTTP ' + response.status + ': ' + category);
    if (indexed && noindex) note('Sitemap category unexpectedly noindex: ' + category);
    if (!indexed && !noindex) note('Unlisted empty category missing noindex: ' + category);
  } catch (error) { note('Category failed: ' + category + ': ' + error.message); }
}
if (failures.length) {
  console.error(failures.length + ' SEO check(s) failed');
  process.exitCode = 1;
} else {
  console.log('PASS: sitemap, canonical, titles, redirects and empty categories');
}
