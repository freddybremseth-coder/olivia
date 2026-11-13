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
  DONAANNA_INQUIRY_TRANSPORT: process.env.DONAANNA_INQUIRY_TRANSPORT,
  DONAANNA_REALTYFLOW_BRIDGE_ENABLED: process.env.DONAANNA_REALTYFLOW_BRIDGE_ENABLED,
  DONAANNA_REALTYFLOW_BRIDGE_SECRET: process.env.DONAANNA_REALTYFLOW_BRIDGE_SECRET,
  DONAANNA_INQUIRY_ABUSE_CONTROLS_READY: process.env.DONAANNA_INQUIRY_ABUSE_CONTROLS_READY,
};
const originalFetch = globalThis.fetch;

function configure(enabled = false) {
  process.env.DONAANNA_INQUIRY_ENABLED = enabled ? 'true' : 'false';
  process.env.DONAANNA_INQUIRY_TRANSPORT = 'resend';
  delete process.env.DONAANNA_REALTYFLOW_BRIDGE_ENABLED;
  delete process.env.DONAANNA_REALTYFLOW_BRIDGE_SECRET;
  delete process.env.DONAANNA_INQUIRY_ABUSE_CONTROLS_READY;
  process.env.DONAANNA_RESEND_API_KEY = 'test-key';
  process.env.DONAANNA_MAIL_FROM = 'Doña Anna <noreply@donaanna.com>';
  process.env.DONAANNA_TURNSTILE_SECRET = 'test-secret';
}

function call({ origin = 'https://www.donaanna.com', method = 'POST', body = {}, contentType = 'application/json' } = {}) {
  const req = {
    method,
    headers: { origin, 'content-type': contentType, 'x-vercel-forwarded-for': '203.0.113.18' },
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

test('gift preference is validated and carried into provider email', { concurrency: false }, async () => {
  configure(true);
  const sent = [];
  globalThis.fetch = async (url, options) => {
    sent.push({ url, options });
    if (url.includes('turnstile')) return { ok: true, json: async () => ({ success: true, hostname: 'www.donaanna.com' }) };
    return { ok: true };
  };
  const gift = { ...valid, kind: 'gift', product: '', giftPreference: 'personal-gift' };
  assert.equal((await call({ body: { ...gift, giftPreference: 'invented' } })).status, 400);
  assert.equal(sent.length, 0);
  assert.equal((await call({ body: gift })).status, 200);
  assert.equal(sent.length, 2);
  const email = JSON.parse(sent[1].options.body);
  assert.match(email.text, /Gavetype: Personlig gave/);
});

test('existing RealtyFlow SMTP path remains off until the anti-abuse and transport gates are satisfied', { concurrency: false }, async () => {
  configure(true);
  process.env.DONAANNA_INQUIRY_TRANSPORT = 'realtyflow';
  process.env.DONAANNA_REALTYFLOW_BRIDGE_SECRET = 'test-private-bridge-key';
  process.env.DONAANNA_REALTYFLOW_BRIDGE_ENABLED = 'true';
  let sent = 0;
  globalThis.fetch = async () => { sent++; throw new Error('Unsafe request sent'); };
  const response = await call({ body: { ...valid, turnstileToken: '' } });
  assert.equal(response.status, 503);
  assert.equal(sent, 0);
});

test('RealtyFlow SMTP relay sends exclusively to authenticated existing endpoint when deliberately enabled', { concurrency: false }, async () => {
  configure(true);
  process.env.DONAANNA_INQUIRY_TRANSPORT = 'realtyflow';
  process.env.DONAANNA_REALTYFLOW_BRIDGE_SECRET = 'test-private-bridge-key';
  process.env.DONAANNA_REALTYFLOW_BRIDGE_ENABLED = 'true';
  process.env.DONAANNA_INQUIRY_ABUSE_CONTROLS_READY = 'true';
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => ({ accepted: true }) };
  };
  const result = await call({ body: { ...valid, turnstileToken: '' } });
  assert.equal(result.status, 200);
  assert.deepEqual(result.payload, { accepted: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://realtyflow.chatgenius.pro/api/integrations/donaanna/public-inquiry');
  assert.equal(calls[0].options.headers['x-donaanna-inquiry-secret'], 'test-private-bridge-key');
  const envelope = JSON.parse(calls[0].options.body);
  assert.equal(envelope.email, valid.email);
  assert.match(envelope.rateIdentityIp, /^[a-f0-9]{64}$/);
  assert.match(envelope.rateIdentityEmail, /^[a-f0-9]{64}$/);
  assert.notEqual(envelope.rateIdentityIp, envelope.rateIdentityEmail);
  assert.equal(calls[0].options.body.includes('test-private-bridge-key'), false);
});


test('shared SMTP rejects missing unmetered client IP before forwarding', { concurrency: false }, async () => {
  configure(true);
  process.env.DONAANNA_INQUIRY_TRANSPORT = 'realtyflow';
  process.env.DONAANNA_REALTYFLOW_BRIDGE_SECRET = 'test-private-bridge-key';
  process.env.DONAANNA_REALTYFLOW_BRIDGE_ENABLED = 'true';
  process.env.DONAANNA_INQUIRY_ABUSE_CONTROLS_READY = 'true';
  let called = 0;
  globalThis.fetch = async () => { called++; throw new Error('Unexpected forward'); };
  const req = { method: 'POST', headers: { origin: 'https://www.donaanna.com', 'content-type': 'application/json' }, body: { ...valid, turnstileToken: '' } };
  let status = 0;
  await handler(req, { writeHead: (s) => { status = s; }, end: () => {} });
  assert.equal(status, 503);
  assert.equal(called, 0);
});

test('RealtyFlow SMTP failure or unconfirmed response is never an accepted inquiry', { concurrency: false }, async () => {
  configure(true);
  process.env.DONAANNA_INQUIRY_TRANSPORT = 'realtyflow';
  process.env.DONAANNA_REALTYFLOW_BRIDGE_SECRET = 'test-private-bridge-key';
  process.env.DONAANNA_REALTYFLOW_BRIDGE_ENABLED = 'true';
  process.env.DONAANNA_INQUIRY_ABUSE_CONTROLS_READY = 'true';
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ accepted: false }) });
  assert.equal((await call({ body: { ...valid, turnstileToken: '' } })).status, 502);
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
