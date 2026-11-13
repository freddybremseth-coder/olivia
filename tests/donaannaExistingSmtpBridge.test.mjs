import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const client = readFileSync('components/PublicB2BLandingPage.tsx', 'utf8');
const server = readFileSync('api/public-inquiry.ts', 'utf8');

test('existing SMTP bridge is disabled without ALL separate launch and abuse controls', () => {
  assert.match(server, /DONAANNA_INQUIRY_ENABLED !== 'true'/);
  assert.match(server, /DONAANNA_REALTYFLOW_BRIDGE_ENABLED === 'true'/);
  assert.match(server, /DONAANNA_INQUIRY_ABUSE_CONTROLS_READY === 'true'/);
  assert.match(server, /DONAANNA_REALTYFLOW_BRIDGE_SECRET/);
});

test('existing SMTP bridge is server-only and strictly destination constrained', () => {
  assert.match(server, /https:\/\/realtyflow\.chatgenius\.pro\/api\/integrations\/donaanna\/public-inquiry/);
  assert.match(server, /'x-donaanna-inquiry-secret': bridgeSecret!/);
  assert.match(server, /answer\.accepted === true/);
  assert.match(server, /origin_not_allowed/);
});

test('shared SMTP frontend is prepared without Cloudflare script or token requirement', () => {
  assert.match(client, /usesExistingEmailTransport = import\.meta\.env\.VITE_DONAANNA_INQUIRY_TRANSPORT === 'realtyflow'/);
  assert.match(client, /if \(!directInquiryEnabled \|\| usesExistingEmailTransport\) return/);
  assert.match(client, /if \(!usesExistingEmailTransport && !turnstileToken\)/);
  assert.match(client, /directInquiryEnabled && !usesExistingEmailTransport && <div id="donaanna-inquiry-turnstile"/);
  assert.match(client, /VITE_DONAANNA_DIRECT_INQUIRY === 'true'/);
});
