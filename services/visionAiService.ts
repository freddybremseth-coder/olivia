import type { ComprehensiveAnalysisResult, PruningPlan } from './geminiService';

const GEMINI_VISION_URL = '/api/ai/gemini-vision';
const ANTHROPIC_MESSAGES_URL = '/api/ai/anthropic-messages';
const OPENAI_CHAT_URL = '/api/ai/openai-chat';

const CLAUDE_MODEL_CHAIN = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
];

function extractJson<T>(text: string, fallback: T): T {
  if (!text) return fallback;
  try { return JSON.parse(text) as T; } catch {}
  const block = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (block) {
    try { return JSON.parse(block[1]) as T; } catch {}
  }
  const obj = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (obj) {
    try { return JSON.parse(obj[1]) as T; } catch {}
  }
  return fallback;
}

async function readError(response: Response, provider: string): Promise<Error> {
  const body = await response.json().catch(async () => ({ raw: await response.text().catch(() => '') }));
  const message = body?.error?.message || body?.error || body?.raw || `${provider}: HTTP ${response.status}`;
  return new Error(`${provider}: ${message}`);
}

async function callGeminiJson<T>(imagesBase64: string[], prompt: string, fallback: T): Promise<T> {
  const imageParts = imagesBase64.map(data => ({
    inlineData: {
      mimeType: data.startsWith('iVBOR') ? 'image/png' : 'image/jpeg',
      data,
    },
  }));
  const response = await fetch(GEMINI_VISION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [...imageParts, { text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });
  if (!response.ok) throw await readError(response, 'Gemini');
  const data = await response.json();
  return extractJson<T>(data?.candidates?.[0]?.content?.parts?.[0]?.text || '', fallback);
}

async function callClaudeJson<T>(imagesBase64: string[], prompt: string, fallback: T): Promise<T> {
  let lastError: unknown;
  for (const model of CLAUDE_MODEL_CHAIN) {
    try {
      const content: any[] = imagesBase64.map(data => ({
        type: 'image',
        source: {
          type: 'base64',
          media_type: data.startsWith('iVBOR') ? 'image/png' : 'image/jpeg',
          data,
        },
      }));
      content.push({ type: 'text', text: `${prompt}\n\nReturner KUN gyldig JSON, uten markdown.` });
      const response = await fetch(ANTHROPIC_MESSAGES_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: 4096, messages: [{ role: 'user', content }] }),
      });
      if (!response.ok) throw await readError(response, 'Claude');
      const data = await response.json();
      return extractJson<T>(data?.content?.[0]?.text || '', fallback);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Claude feilet.');
}

async function callOpenAIJson<T>(imagesBase64: string[], prompt: string, fallback: T): Promise<T> {
  const content: any[] = imagesBase64.map(data => ({
    type: 'image_url',
    image_url: { url: data.startsWith('data:') ? data : `data:image/jpeg;base64,${data}` },
  }));
  content.push({ type: 'text', text: `${prompt}\n\nReturner KUN gyldig JSON, uten markdown.` });
  const response = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 4096, messages: [{ role: 'user', content }] }),
  });
  if (!response.ok) throw await readError(response, 'OpenAI');
  const data = await response.json();
  return extractJson<T>(data?.choices?.[0]?.message?.content || '', fallback);
}

async function runVisionJson<T>(imagesBase64: string[], prompt: string, fallback: T): Promise<T> {
  const errors: string[] = [];
  for (const [provider, fn] of [
    ['Gemini', callGeminiJson<T>],
    ['Claude', callClaudeJson<T>],
    ['OpenAI', callOpenAIJson<T>],
  ] as const) {
    try {
      return await fn(imagesBase64, prompt, fallback);
    } catch (error: any) {
      errors.push(`${provider}: ${error?.message || String(error)}`);
    }
  }
  throw new Error(`AI-analyse feilet. Sjekk Innstillinger → AI-helsesjekk. Detaljer: ${errors.join(' | ')}`);
}

export async function analyzeOliveComprehensive(imagesBase64: string[], lang: string): Promise<ComprehensiveAnalysisResult> {
  const prompt = `Du er en erfaren olivenagronom for Olea europaea i Spania. Analyser bilde(ne) og returner KUN JSON:
{
  "diagnosis": { "subject": "hva som er avbildet", "variety": "olivensort eller Ukjent", "condition": "SUNN eller OBSERVASJON eller SYK", "diagnosis": "praktisk vurdering", "actions": ["tiltak 1", "tiltak 2", "tiltak 3"] },
  "pruning": { "treeType": "sort og trekategori", "ageEstimate": "estimert alder", "pruningSteps": [{ "area": "område", "action": "tiltak", "priority": "HØY", "x": 50, "y": 30 }], "recommendedDate": "YYYY-MM-DD", "timingAdvice": "timing", "toolsNeeded": ["verktøy"] },
  "expertReport": { "urgencyScore": 5, "economicImpact": "konsekvens", "yieldEstimate": "estimat", "fertilizerRecommendation": "anbefaling", "irrigationNote": "vanning", "rejuvenationNeeded": false, "nextKeyAction": "viktigste handling" },
  "varietyConfidence": 50,
  "needsMoreImages": true,
  "missingDetails": ["heltre", "bladverk", "stamme"]
}
Språk: ${lang === 'no' ? 'norsk' : lang}. Hvis bildegrunnlaget er dårlig, gi praktiske feltobservasjoner og sett needsMoreImages=true, ikke returner tom JSON.`;
  return runVisionJson<ComprehensiveAnalysisResult>(imagesBase64, prompt, {} as ComprehensiveAnalysisResult);
}

export async function analyzeOlivePruning(imageBase64: string, lang: string): Promise<PruningPlan> {
  const prompt = `Du er olivenbeskjæringsmester i Spania. Analyser treet og returner KUN JSON:
{
  "treeType": "sort og trekategori",
  "ageEstimate": "estimert alder",
  "pruningSteps": [
    { "area": "område som skal vurderes", "action": "konkret og trygg handling", "priority": "HØY", "x": 50, "y": 30 }
  ],
  "recommendedDate": "YYYY-MM-DD",
  "timingAdvice": "forklaring",
  "toolsNeeded": ["Beskjæringssaks", "Sag", "Desinfeksjon"]
}
Regler: priority er HØY, MIDDELS eller LAV. x/y er 0-100. Gi heller forsiktige råd enn harde kutt hvis bildet ikke viser hele treet. Språk: ${lang === 'no' ? 'norsk' : lang}.`;
  return runVisionJson<PruningPlan>([imageBase64], prompt, {} as PruningPlan);
}
