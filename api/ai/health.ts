/**
 * /api/ai/health — diagnostic endpoint for the three AI proxies.
 *
 * Reports which API keys are configured AND optionally pings each upstream
 * to check that the keys are valid + the accounts have credit. Returns:
 *
 *   {
 *     gemini:    { configured, ok, status, error? },
 *     anthropic: { configured, ok, status, error? },
 *     openai:    { configured, ok, status, error? }
 *   }
 *
 * Pass ?probe=1 to actually hit each upstream (costs ~tokens, but tiny).
 * Without ?probe, only the env-var presence is checked (no network).
 *
 * Never returns the keys themselves — only a boolean and an upstream status.
 */

import type { IncomingMessage, ServerResponse } from 'http';

interface ProviderHealth {
  configured: boolean;
  ok: boolean;
  status?: number;
  error?: string;
}

async function probeGemini(key: string): Promise<ProviderHealth> {
  try {
    // Cheapest call: list models. Doesn't burn quota.
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
      { method: 'GET' },
    );
    if (res.ok) return { configured: true, ok: true, status: res.status };
    const body = await res.text();
    return {
      configured: true,
      ok: false,
      status: res.status,
      error: body.slice(0, 200),
    };
  } catch (e: any) {
    return { configured: true, ok: false, error: e?.message || String(e) };
  }
}

async function probeAnthropic(key: string): Promise<ProviderHealth> {
  try {
    // 1-token completion. Cost is ~$0.000003.
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    });
    if (res.ok) return { configured: true, ok: true, status: res.status };
    const body = await res.text();
    return {
      configured: true,
      ok: false,
      status: res.status,
      error: body.slice(0, 200),
    };
  } catch (e: any) {
    return { configured: true, ok: false, error: e?.message || String(e) };
  }
}

async function probeOpenAI(key: string): Promise<ProviderHealth> {
  try {
    // Cheapest possible call: list models. No tokens billed.
    const res = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${key}` },
    });
    if (res.ok) return { configured: true, ok: true, status: res.status };
    const body = await res.text();
    return {
      configured: true,
      ok: false,
      status: res.status,
      error: body.slice(0, 200),
    };
  } catch (e: any) {
    return { configured: true, ok: false, error: e?.message || String(e) };
  }
}

export default async function handler(
  req: IncomingMessage & { url: string; method?: string },
  res: ServerResponse,
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');

  const url = new URL(req.url || '/', 'http://localhost');
  const probe = url.searchParams.get('probe') === '1';

  const geminiKey    = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey    = process.env.OPENAI_API_KEY;

  const result: Record<string, ProviderHealth> = {
    gemini:    { configured: !!geminiKey,    ok: false },
    anthropic: { configured: !!anthropicKey, ok: false },
    openai:    { configured: !!openaiKey,    ok: false },
  };

  if (probe) {
    const [g, a, o] = await Promise.all([
      geminiKey    ? probeGemini(geminiKey)       : Promise.resolve(result.gemini),
      anthropicKey ? probeAnthropic(anthropicKey) : Promise.resolve(result.anthropic),
      openaiKey    ? probeOpenAI(openaiKey)       : Promise.resolve(result.openai),
    ]);
    result.gemini    = g;
    result.anthropic = a;
    result.openai    = o;
  } else {
    // Without probe, "ok" means the key is present (we can't say more).
    result.gemini.ok    = !!geminiKey;
    result.anthropic.ok = !!anthropicKey;
    result.openai.ok    = !!openaiKey;
  }

  res.writeHead(200);
  res.end(JSON.stringify(result, null, 2));
}
