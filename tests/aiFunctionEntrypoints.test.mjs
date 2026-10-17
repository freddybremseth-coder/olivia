import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const paths = [
  'api/ai/gemini-vision.ts',
  'api/ai/anthropic-messages.ts',
  'api/ai/openai-chat.ts',
  'api/ai/gemini/[...path].ts',
  'api/ai/anthropic/[...path].ts',
  'api/ai/health.ts',
  'api/ai/gemini/v1beta/models/gemini-2.5-flash:generateContent.ts',
  'api/ai/anthropic/v1/messages.ts',
  'api/ai/openai/v1/chat/completions.ts',
];

for (const path of paths) {
  test(`Vercel function ${path} can load without relative runtime imports`, () => {
    const src = readFileSync(new URL('../' + path, import.meta.url), 'utf8');
    assert.match(src, /export default async function handler/);
    assert.doesNotMatch(src, /export\s+\{[^}]+\}\s+from\s+['"]\.\.?\//);
    assert.doesNotMatch(src, /import\s+(?!type\b)[\s\S]*?from\s+['"]\.\.?\//);
    assert.match(src, /function rejectCrossOrigin/);
  });
}
