import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const result = await build({ entryPoints: ['services/publicInquiry.ts'], bundle: true, format: 'esm', platform: 'node', write: false });
const source = result.outputFiles[0].text;
const { sendPublicInquiry } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

const payload = {
  kind: 'tasting',
  product: 'Verde Vivo',
  audience: 'private',
  name: 'Example Visitor',
  email: 'visitor@example.net',
  turnstileToken: 'valid-test-token',
};

test('client only confirms a completed and explicitly accepted request', async () => {
  const result = await sendPublicInquiry(payload, async (url, options) => {
    assert.equal(url, '/api/public-inquiry');
    assert.equal(options.method, 'POST');
    assert.equal(options.credentials, 'same-origin');
    const body = JSON.parse(options.body);
    assert.equal(body.product, 'Verde Vivo');
    assert.equal(body.website, '');
    return { ok: true, json: async () => ({ accepted: true }) };
  });
  assert.deepEqual(result, { accepted: true });
});

test('HTTP 200 is not enough without accepted true', async () => {
  const result = await sendPublicInquiry(payload, async () => ({ ok: true, json: async () => ({ accepted: false }) }));
  assert.deepEqual(result, { accepted: false, error: 'unconfirmed' });
});

test('API 503 and delivery failure remain unconfirmed', async () => {
  const missing = await sendPublicInquiry(payload, async () => ({ ok: false, status: 503 }));
  assert.deepEqual(missing, { accepted: false, error: 'not_configured' });
  const failed = await sendPublicInquiry(payload, async () => ({ ok: false, status: 502 }));
  assert.deepEqual(failed, { accepted: false, error: 'delivery_failed' });
});

test('network errors remain unconfirmed', async () => {
  const result = await sendPublicInquiry(payload, async () => { throw new Error('connection unavailable'); });
  assert.deepEqual(result, { accepted: false, error: 'network_error' });
});
