import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../public/donaanna-site-links.js', import.meta.url), 'utf8');

function runScript(pathname) {
  const created = [];
  const scheduled = [];
  const document = {
    readyState: 'complete',
    querySelector: () => null,
    getElementById: () => null,
    createElement: (tag) => {
      created.push(tag);
      return { id: '', rel: '', href: '', type: '', textContent: '' };
    },
    head: { appendChild: () => {} },
    body: { appendChild: () => {}, prepend: () => {} },
  };
  vm.runInNewContext(source, {
    document,
    window: { location: { pathname } },
    setTimeout: (callback) => scheduled.push(callback),
  });
  return { created, scheduled };
}

test('public marketing menu is never injected into app routes', () => {
  for (const path of ['/olivia', '/olivia/', '/olivia/dashboard', '/app', '/b2b', '/b2b/']) {
    const result = runScript(path);
    assert.equal(result.created.length, 0, path);
    assert.equal(result.scheduled.length, 0, path);
  }
});

test('public marketing pages still initialize their navigation', () => {
  const result = runScript('/');
  assert.ok(result.created.includes('style'));
  assert.ok(result.scheduled.length > 0);
});

test('a public-page timer cannot create a product menu after entering Olivia', () => {
  const path = { pathname: '/' };
  const scheduled = [];
  let elements = 0;
  const document = {
    readyState: 'complete',
    querySelector: () => null,
    getElementById: () => null,
    createElement: () => { elements++; return { style: {}, textContent: '' }; },
    head: { appendChild: () => {} },
    body: { appendChild: () => {}, prepend: () => {} },
  };
  vm.runInNewContext(source, { document, window: { location: path }, setTimeout: fn => scheduled.push(fn) });
  const initial = elements;
  path.pathname = '/olivia';
  for (const callback of scheduled) callback();
  assert.equal(elements, initial);
});
