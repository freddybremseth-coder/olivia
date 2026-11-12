import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const result = await build({
  entryPoints: ['api/public-inquiry.ts'],
  platform: 'node',
  format: 'esm',
  bundle: true,
  write: false,
});
const url = 'data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64');
const { default: handler } = await import(url);

const originalEnv = {
  DONAANNA_INQUIRY_ENABLED: process.env.DONAANNA_INQUIRY_ENABLED,
  DONAANNA_RESEND_API_KEY: process.env.DONAANNA_RESEND_API_KEY,
  DONAANNA_MAIL_FROM: process.env.DONAANNA_MAIL_FROM,
  DONAANNA_TURNSTILE_SECRET: process.env.DONAANNA_TURNSTILE_SECRET,
};
const originalFetch = globalThis.fetch;

function configure(enabled = false) {
  process.env.DONAANNA_INQUIRY_ENABLED = enabled ? 'true' : 'false';
  process.env.DONAANNA_RESEND_API_KEY = 'test-key';
  process.env.DONAANNA_MAIL_FROM = 'Doña Anna <noreply@donaanna.com>';
  process.env.DONAANNA_TURNSTILE_SECRET = 'test-secret';
}

function call({ origin = 'https://www.donaanna.com', method = 'POST', body = {}, contentType = 'application/json' } = {}) {
  const req = {
    method,
    headers: { origin, 'content-type': contentType },
    body,
  };
  let status = -1;
  let payload;
  const res = {
    writeHead(code) { status = code; },
    end(value) { payload = JSON.parse(value); },
  };
  return handler(req, res).then(() => ({ status, payload }));
}

const valid = {
  kind: 'tasting',
  product: 'Verde Vivo',
  audience: 'private',
  name: 'Test Visitor',
  email: 'visitor@example.net',
  turnstileToken: 'token',
};

test('production intake remains off even if provider credentials are provisioned', { concurrency: false }, async () => {
  configure(false);
  let sent = 0;
  globalThis.fetch = async () => { sent++; throw new Error('Must not send'); };
  const result = await call({ body: valid });
  assert.equal(result.status, 503);
  assert.equal(result.payload.error, 'not_configured');
  assert.equal(sent, 0);
});

test('rejects unsupported origin and oversized pre-parsed JSON', { concurrency: false }, async () => {
  configure(true);
  assert.equal((await call({ origin: 'https://malicious.example', body: valid })).status, 403);
  assert.equal((await call({ body: { ...valid, message: 'x'.repeat(9000) } })).status, 400);
});

test('blocks invalid and unverified requests without sending email', { concurrency: false }, async () => {
  configure(true);
  let calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    return { ok: true, json: async () => ({ success: false, hostname: 'www.donaanna.com' }) };
  };
  assert.equal((await call({ body: { ...valid, product: 'unapproved product' } })).status, 400);
  assert.equal((await call({ body: valid })).status, 403);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].includes('turnstile'));
});

test('only confirmed verification and mail provider success count as accepted', { concurrency: false }, async () => {
  configure(true);
  const sent = [];
  globalThis.fetch = async (url, options) => {
    sent.push({ url, options });
    if (url.includes('turnstile')) return { ok: true, json: async () => ({ success: true, hostname: 'www.donaanna.com' }) };
    return { ok: true };
  };
  const result = await call({ body: valid });
  assert.equal(result.status, 200);
  assert.deepEqual(result.payload, { accepted: true });
  assert.equal(sent.length, 2);
  const envelope = JSON.parse(sent[1].options.body);
  assert.deepEqual(envelope.to, ['info@donaanna.com']);
  assert.deepEqual(envelope.reply_to, ['visitor@example.net']);
});

test('provider failure never returns acceptance', { concurrency: false }, async () => {
  configure(true);
  globalThis.fetch = async (url) =>
    url.includes('turnstile') ? { ok: true, json: async () => ({ success: true, hostname: 'www.donaanna.com' }) } : { ok: false };
  const result = await call({ body: valid });
  assert.equal(result.status, 502);
  assert.equal(result.payload.error, 'delivery_failed');
});

process.on('exit', () => {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
