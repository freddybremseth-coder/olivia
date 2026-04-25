
import { GoogleGenAI, Type } from "@google/genai";
import { Sensor, Recipe, Ingredient } from "../types";

export interface FarmInsight {
  id: string;
  tittel: string;
  beskrivelse: string;
}

export interface PruningStep {
  area: string;
  action: string;
  priority: 'LAV' | 'MIDDELS' | 'HØY';
  x: number;
  y: number;
}

export interface PruningPlan {
  treeType: string;
  ageEstimate: string;
  pruningSteps: PruningStep[];
  recommendedDate: string;
  timingAdvice: string;
  toolsNeeded: string[];
}

export interface PlantDiagnosis {
  subject: string;
  variety: string;
  condition: 'SUNN' | 'OBSERVASJON' | 'SYK';
  diagnosis: string;
  actions: string[];
}

export interface ExpertOliveReport {
  urgencyScore: number;           // 0–10, 10 = krev umiddelbar handling
  economicImpact: string;         // Estimert produksjonstap % og konsekvens
  yieldEstimate: string;          // Estimert kg/tre basert på tilstand
  fertilizerRecommendation: string; // NPK + mikronæring anbefaling
  irrigationNote: string;         // Vanningsbehov basert på visuell tilstand
  rejuvenationNeeded: boolean;    // Trenger foryngelsesbeskjæring
  nextKeyAction: string;          // Den ene viktigste handlingen nå
}

export interface ComprehensiveAnalysisResult {
  diagnosis: PlantDiagnosis;
  pruning: PruningPlan;
  expertReport: ExpertOliveReport;
  varietyConfidence: number;
  needsMoreImages: boolean;
  missingDetails: string[];
}

export interface DroneAnalysisResult {
  canopyDensity: string;
  ndviSimulated: number;
  waterStressLevel: 'Low' | 'Moderate' | 'High';
  thermalAnomalies: string[];
  treeCountEstimation: number;
  aerialSummary: string;
}

export interface IrrigationAdvice {
  recommendation: string;
  criticalFactors: string[];
  amount: string;
  timing: string;
  confidence: number;
  reasoning: string;
}

export interface CadastralDetails {
  cadastralId: string;
  municipalityCode: string;
  provinceCode: string;
  areaSqm: number;
  treeCount: number;
  neighbors: string[];
  landUse: string;
  soilQuality: string;
  municipality: string;
  latitude: number;
  longitude: number;
  description: string;
}

/**
 * AI key strategy
 * ---------------
 *  - If a user pastes a Gemini / Claude key in Settings (stored in localStorage)
 *    we hit the upstream API directly with that key — useful for local dev
 *    and BYOK scenarios.
 *  - Otherwise we route every request through our own serverless proxies at
 *    /api/ai/gemini and /api/ai/anthropic, which inject the real key from
 *    Vercel env vars (GEMINI_API_KEY / ANTHROPIC_API_KEY). The browser never
 *    sees the production key.
 */

const GEMINI_PROXY_BASE      = '/api/ai/gemini';
const ANTHROPIC_PROXY_URL    = '/api/ai/anthropic/v1/messages';
const OPENAI_PROXY_URL       = '/api/ai/openai/v1/chat/completions';
// Placeholder accepted by the SDK when we'll proxy and inject the real key
const PROXY_PLACEHOLDER_KEY  = 'proxied';

// Default fallback models — overridable per-call.
const DEFAULT_CLAUDE_MODEL   = 'claude-sonnet-4-5-20250929';
const DEFAULT_OPENAI_MODEL   = 'gpt-4o-mini';
const DEFAULT_OPENAI_VISION_MODEL = 'gpt-4o-mini';

/**
 * Detects "quota exhausted / rate limited / billing" responses across all
 * three providers. We only fall back on these — real bugs (bad request,
 * auth) should still surface so we can fix them.
 */
function isQuotaError(err: unknown): boolean {
  const msg = String((err as any)?.message || err || '').toLowerCase();
  return (
    msg.includes('quota') ||
    msg.includes('resource_exhausted') ||
    msg.includes('rate limit') ||
    msg.includes('rate_limit') ||
    msg.includes('exhausted') ||
    msg.includes('insufficient') ||
    msg.includes('billing') ||
    msg.includes('429')
  );
}

export class GeminiService {
  private cache = new Map<string, CadastralDetails>();

  private getClaudeKey(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem('olivia_claude_api_key') || null;
  }

  private getGeminiKey(): string {
    if (typeof localStorage === 'undefined') return '';
    return localStorage.getItem('olivia_gemini_api_key') || '';
  }

  /** True when we should route AI calls through our serverless proxies. */
  private useGeminiProxy(): boolean { return !this.getGeminiKey(); }
  private useClaudeProxy(): boolean { return !this.getClaudeKey(); }

  private getAI() {
    if (this.useGeminiProxy()) {
      // Point the SDK at our proxy; the placeholder key is never used upstream.
      return new GoogleGenAI({
        apiKey: PROXY_PLACEHOLDER_KEY,
        httpOptions: { baseUrl: GEMINI_PROXY_BASE },
      });
    }
    return new GoogleGenAI({ apiKey: this.getGeminiKey() });
  }

  private async callGeminiVision(imagesBase64: string[], prompt: string): Promise<string> {
    return this.runWithFallback(
      async () => {
        const imageParts = imagesBase64.map(data => ({
          inline_data: {
            mime_type: data.startsWith('iVBOR') ? 'image/png' : 'image/jpeg',
            data,
          },
        }));

        const body = {
          contents: [{ parts: [...imageParts, { text: prompt }] }],
          generationConfig: { response_mime_type: 'application/json' },
        };

        const url = this.useGeminiProxy()
          ? `${GEMINI_PROXY_BASE}/v1beta/models/gemini-2.0-flash:generateContent`
          : `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.getGeminiKey()}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          const errMsg = (err as any)?.error?.message || `HTTP ${response.status}`;
          throw new Error(errMsg);
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Tom respons fra Gemini API');
        return text;
      },
      prompt,
      // Fallback returns raw text — callers of callGeminiVision parse JSON themselves.
      (text) => text,
      { json: true, images: imagesBase64 },
    );
  }

  async callClaude(prompt: string, model: string = DEFAULT_CLAUDE_MODEL): Promise<string> {
    const useProxy = this.useClaudeProxy();
    const url = useProxy ? ANTHROPIC_PROXY_URL : 'https://api.anthropic.com/v1/messages';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    };
    if (!useProxy) {
      headers['x-api-key'] = this.getClaudeKey()!;
      headers['anthropic-dangerous-direct-browser-access'] = 'true';
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as { error?: { message?: string } }).error?.message || `Claude API feil: ${response.status}`);
    }
    const data = await response.json() as { content: Array<{ type: string; text: string }> };
    return data.content[0]?.text || '';
  }

  /** Vision call to Claude — used as fallback when Gemini quota is hit. */
  private async callClaudeVision(imagesBase64: string[], prompt: string, model: string = DEFAULT_CLAUDE_MODEL): Promise<string> {
    const useProxy = this.useClaudeProxy();
    const url = useProxy ? ANTHROPIC_PROXY_URL : 'https://api.anthropic.com/v1/messages';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    };
    if (!useProxy) {
      headers['x-api-key'] = this.getClaudeKey()!;
      headers['anthropic-dangerous-direct-browser-access'] = 'true';
    }
    const content: any[] = imagesBase64.map(data => ({
      type: 'image',
      source: {
        type: 'base64',
        media_type: data.startsWith('iVBOR') ? 'image/png' : 'image/jpeg',
        data,
      },
    }));
    content.push({ type: 'text', text: prompt });
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, max_tokens: 4096, messages: [{ role: 'user', content }] }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as { error?: { message?: string } }).error?.message || `Claude vision: HTTP ${response.status}`);
    }
    const data = await response.json() as { content: Array<{ type: string; text: string }> };
    return data.content[0]?.text || '';
  }

  /** Text call to OpenAI Chat Completions — second-tier fallback. */
  async callOpenAI(prompt: string, model: string = DEFAULT_OPENAI_MODEL, json: boolean = false): Promise<string> {
    const body: any = {
      model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    };
    if (json) body.response_format = { type: 'json_object' };
    const response = await fetch(OPENAI_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as { error?: { message?: string } }).error?.message || `OpenAI API feil: ${response.status}`);
    }
    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices?.[0]?.message?.content || '';
  }

  /** Vision call to OpenAI — used as second-tier fallback. Accepts raw base64 OR data-URL. */
  private async callOpenAIVision(imagesBase64: string[], prompt: string, model: string = DEFAULT_OPENAI_VISION_MODEL): Promise<string> {
    const content: any[] = imagesBase64.map(data => ({
      type: 'image_url',
      image_url: {
        url: data.startsWith('data:') ? data : `data:image/jpeg;base64,${data}`,
      },
    }));
    content.push({ type: 'text', text: prompt });
    const response = await fetch(OPENAI_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [{ role: 'user', content }],
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as { error?: { message?: string } }).error?.message || `OpenAI vision: HTTP ${response.status}`);
    }
    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * Robust JSON extractor. Claude/OpenAI sometimes wrap JSON in markdown code
   * blocks or add explanatory prose. This pulls out the first valid JSON
   * object/array we can parse.
   */
  private extractJson<T = any>(text: string, fallback?: T): T {
    if (!text) {
      if (fallback !== undefined) return fallback;
      throw new Error('Tom respons fra AI.');
    }
    // 1. Try direct parse
    try { return JSON.parse(text) as T; } catch {}
    // 2. Try ```json ... ``` block
    const block = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (block) {
      try { return JSON.parse(block[1]) as T; } catch {}
    }
    // 3. Try first {...} or [...]
    const obj = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (obj) {
      try { return JSON.parse(obj[1]) as T; } catch {}
    }
    if (fallback !== undefined) return fallback;
    throw new Error('Kunne ikke tolke JSON-svar fra AI.');
  }

  /**
   * Run a Gemini call; on quota errors, fall back to Claude, then OpenAI.
   * Real errors (auth, bad request) are re-thrown unchanged.
   *
   * @param geminiFn      The original Gemini call. Returns parsed result T.
   * @param fallbackPrompt Plain-text prompt for the fallback LLMs (no Gemini schemas).
   * @param parser        Parses the fallback LLM's text response into T.
   * @param opts.json     Append "Return ONLY valid JSON" hint to prompt.
   * @param opts.images   Optional base64 images — switches to vision fallback.
   */
  private async runWithFallback<T>(
    geminiFn: () => Promise<T>,
    fallbackPrompt: string,
    parser: (text: string) => T,
    opts: { json?: boolean; images?: string[] } = {},
  ): Promise<T> {
    try {
      return await geminiFn();
    } catch (e: any) {
      if (!isQuotaError(e)) throw e;
      console.warn('[geminiService] Gemini quota/rate-limit hit, attempting Claude fallback…', e?.message);

      const promptForFallback = opts.json
        ? `${fallbackPrompt}\n\nVIKTIG: Returner KUN gyldig JSON, uten markdown-koding eller annen tekst rundt.`
        : fallbackPrompt;

      // Tier 1: Claude
      try {
        const text = opts.images?.length
          ? await this.callClaudeVision(opts.images, promptForFallback)
          : await this.callClaude(promptForFallback);
        return parser(text);
      } catch (claudeErr: any) {
        console.warn('[geminiService] Claude fallback failed, trying OpenAI…', claudeErr?.message);
      }

      // Tier 2: OpenAI
      try {
        const text = opts.images?.length
          ? await this.callOpenAIVision(opts.images, promptForFallback)
          : await this.callOpenAI(promptForFallback, DEFAULT_OPENAI_MODEL, !!opts.json);
        return parser(text);
      } catch (openaiErr: any) {
        console.error('[geminiService] OpenAI fallback also failed', openaiErr?.message);
      }

      throw new Error('AI-tjenester er midlertidig utilgjengelige (Gemini-kvote oppbrukt, og både Claude og OpenAI feilet). Prøv igjen senere eller kontakt administrator.');
    }
  }

  private async generateText(prompt: string): Promise<string> {
    // Prefer Claude only when the user has explicitly set a Claude key
    if (this.getClaudeKey()) {
      return this.callClaude(prompt);
    }
    return this.runWithFallback(
      async () => {
        const ai = this.getAI();
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        return response.text ?? '';
      },
      prompt,
      (text) => text,
    );
  }

  async analyzeParcelCadastre(searchQueryOrCoords: string, lang: string = 'no'): Promise<CadastralDetails> {
    const cacheKey = searchQueryOrCoords.trim().toUpperCase();
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const ai = this.getAI();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Du er en spesialisert agent for spansk eiendomsinformasjon (Catastro).
        OPPGAVE: Identifiser matrikkeldata for følgende forespørsel: "${searchQueryOrCoords}".

        INSTRUKSER:
        1. Bruk Google Search til å finne offisielle matrikkeldata fra Sede Electrónica del Catastro.
        2. Identifiser "Referencia Catastral" (20 tegn) og arealet i m2.
        3. Hvis forespørselen er for Biar, Alicante, starter referansen ofte med 03040A.
        4. Returner nøyaktige GPS-koordinater (lat/lon) for senteret av parsellen.

        Returner KUN JSON:
        {
          "cadastralId": "20 tegn",
          "municipalityCode": "3 siffer",
          "provinceCode": "2 siffer",
          "areaSqm": antall_m2,
          "treeCount": estimert_trær,
          "neighbors": [],
          "landUse": "Klassifisering",
          "soilQuality": "Beskrivelse",
          "municipality": "Navn",
          "latitude": float,
          "longitude": float,
          "description": "Kort sammendrag"
        }`,
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.1,
        }
      });
      
      const text = response.text || "";
      const jsonMatch = text.match(/\{[\s\S]*?\}/);
      
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]) as CadastralDetails;
        
        if (!data.cadastralId || data.cadastralId.length < 14) {
          throw new Error("Fant ikke en gyldig matrikkelreferanse. Vennligst sjekk Polígono/Parcela.");
        }
        
        this.cache.set(cacheKey, data);
        return data;
      }
      
      throw new Error("Kunne ikke tyde svaret fra matrikkelregisteret.");
    } catch (error: any) {
      console.error("Cadastral Analysis Error:", error);
      if (error.message?.includes('500') || error.message?.includes('xhr')) {
        throw new Error("Tilkoblingsproblem mot spanske registre. Prøv igjen om noen sekunder.");
      }
      throw error;
    }
  }

  async adjustRecipe(currentRecipe: Partial<Recipe>, prompt: string, lang: string = 'no', flavorTarget?: string): Promise<Partial<Recipe>> {
    const flavorContext: Record<string, string> = {
      mild:      'Mild og balansert. Passer for supermarked og massemarked globalt. Klassisk smak uten dominerende urter.',
      syrlig:    'Syrlig/acidic profil. Passer for italienske og spanske antipasti-markeder. Eddik, sitron og laktosyre fremheves.',
      frisk:     'Frisk og lett. Passer for premium-markeder i Skandinavia og Benelux. Lette urter som dill, persille, sitron.',
      krydret:   'Krydret/spicy. Passer for arabiske, latinamerikanske og asiatiske markeder. Chilli, paprika, hvitløk fremheves.',
      sterk:     'Sterk og intens. Passer for spesialbutikker og foodie-markeder. Rosmarin, timian, hvitløk, pepper dominerer.',
      middelhav: 'Klassisk middelhavsstil. Passer for gourmetrestauranter og delicatessen. Olivenolje, rosmarin, timian, laurbær.',
    };
    const marketNote = flavorTarget && flavorContext[flavorTarget]
      ? `\n\nMARKEDSMÅL: ${flavorContext[flavorTarget]}`
      : '';

    const fullPrompt = `Du er en ekspert på produksjon av bordoliven og matvaresikkerhet med 20 års erfaring fra Spania og Italia.

Juster denne oppskriften for bordoliven basert på brukerens ønske.
Alle mengder skal være per 1 liter saltlake/marinade (standardisert basis).

Nåværende oppskrift: ${JSON.stringify(currentRecipe)}

Brukerens ønske: "${prompt}"${marketNote}

Returner justert oppskrift med eksakte mengder. Tenk på balanse mellom salt, syre, fett og aromater.
Svar i JSON med feltene: name, description, flavorProfile, ingredients (array av {name, amount, unit}), notes, readyAfterDays.`;

    return this.runWithFallback<Partial<Recipe>>(
      async () => {
        const ai = this.getAI();
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: fullPrompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                flavorProfile: { type: Type.STRING },
                ingredients: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      amount: { type: Type.STRING },
                      unit: { type: Type.STRING }
                    },
                    required: ['name', 'amount', 'unit']
                  }
                },
                notes: { type: Type.STRING },
                readyAfterDays: { type: Type.NUMBER },
              }
            }
          }
        });
        return JSON.parse(response.text || "{}");
      },
      fullPrompt,
      (text) => this.extractJson<Partial<Recipe>>(text, {}),
      { json: true },
    );
  }

  async suggestIngredientAmount(
    ingredientName: string,
    currentIngredients: Ingredient[],
    flavorTarget: string,
    batchKg: number = 100
  ): Promise<{ amount: string; unit: string; rationale: string }> {
    const flavorContext: Record<string, string> = {
      mild:      'mild og balansert smak',
      syrlig:    'syrlig/acidic profil med eddik og sitron',
      frisk:     'frisk og lett med lette urter',
      krydret:   'krydret/spicy med chilli og paprika',
      sterk:     'sterk og intens med dominerende urter',
      middelhav: 'klassisk middelhavsstil med olivenolje og urter',
    };

    const fullPrompt = `Du er ekspert på produksjon av bordoliven med 20 års erfaring.

Nåværende oppskrift (per 1 liter saltlake): ${JSON.stringify(currentIngredients)}
Batch-størrelse: ${batchKg} kg oliven
Ønsket smaksprofil: ${flavorContext[flavorTarget] || flavorTarget}
Ingredient som skal legges til: ${ingredientName}

Foreslå eksakt mengde av "${ingredientName}" per 1 liter saltlake for å oppnå god smaksbalanse.
Husk matvaresikkerhet og typiske mengder i profesjonell olivenproduksjon.
Gi en kort norsk forklaring på hvorfor denne mengden er riktig.

Svar i JSON med feltene: amount (string), unit (string), rationale (string).`;

    const fallback = { amount: '1', unit: 'stk', rationale: '' };
    return this.runWithFallback<{ amount: string; unit: string; rationale: string }>(
      async () => {
        const ai = this.getAI();
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: fullPrompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                amount: { type: Type.STRING },
                unit:   { type: Type.STRING },
                rationale: { type: Type.STRING }
              },
              required: ['amount', 'unit', 'rationale']
            }
          }
        });
        return JSON.parse(response.text || JSON.stringify(fallback));
      },
      fullPrompt,
      (text) => this.extractJson(text, fallback),
      { json: true },
    );
  }

  async analyzeComprehensive(imagesBase64: string[], lang: string): Promise<ComprehensiveAnalysisResult> {
    const prompt = `Du er en olivenagronom med doktorgrad i Olea europaea og 30+ års felterfaring fra Andalucia, Toscana og Tunesia.

Analyser bildet(ene) grundig og returner NØYAKTIG dette JSON-objektet (ingen markdown, bare ren JSON):

{
  "diagnosis": {
    "subject": "hva som er avbildet",
    "variety": "olivensort eller Ukjent",
    "condition": "SUNN eller OBSERVASJON eller SYK",
    "diagnosis": "detaljert patologisk vurdering med latinske navn der relevant",
    "actions": ["tiltak 1", "tiltak 2", "tiltak 3"]
  },
  "pruning": {
    "treeType": "sort og trekategori",
    "ageEstimate": "estimert alder som tekst",
    "pruningSteps": [
      { "area": "grenområde", "action": "hva som skal gjøres", "priority": "HØY", "x": 50, "y": 30 }
    ],
    "recommendedDate": "YYYY-MM-DD",
    "timingAdvice": "forklaring på optimal timing",
    "toolsNeeded": ["verktøy 1", "verktøy 2"]
  },
  "expertReport": {
    "urgencyScore": 5,
    "economicImpact": "estimert produksjonstap % og konsekvens",
    "yieldEstimate": "estimert kg/tre",
    "fertilizerRecommendation": "NPK-ratio + mikronæring",
    "irrigationNote": "vanningsbehov basert på visuell tilstand",
    "rejuvenationNeeded": false,
    "nextKeyAction": "den ene viktigste handlingen nå"
  },
  "varietyConfidence": 75,
  "needsMoreImages": false,
  "missingDetails": []
}

Bruk faglig ekspertise:
- Sykdommer: Spilocaea oleagina, Colletotrichum acutatum, Verticillium dahliae, Pseudomonas savastanoi
- Skadedyr: Bactrocera oleae, Prays oleae, Saissetia oleae
- Næring: N/Fe/B/Mg/K-mangler med spesifikke symptomer
- Sorter: Gordal Sevillana (store blader), Changlot Real (lys underside), Picual (spisse blader), Arbequina (kompakt), Hojiblanca (lyse blader)
- urgencyScore: 0=perfekt, 10=krev tiltak i dag
- priority-felt: kun verdiene HØY, MIDDELS eller LAV
- x/y: koordinater 0–100 i bildet`;
    const text = await this.callGeminiVision(imagesBase64, prompt);
    return JSON.parse(text);
  }

  async analyzeDrone(imagesBase64: string[], lang: string): Promise<DroneAnalysisResult> {
    const dronePrompt = `Du er en presisjonsjordbruksekspert med drone-analyse. Analyser dette luftbildet av en olivenlund.

Gi:
- Kanonitettstetthet (%) og krondekning
- NDVI-simulasjon (0.0–1.0) basert på fargeintensitet
- Vannstressvurdering (Lav/Moderat/Høy) basert på blad-/kronefarge
- Termiske anomalier (soner med stress, sykdom, varme)
- Teller-estimat av trær synlige i bildet
- Identifiser mulige problemsoner (tørre flekker, sykdomsspredning, høydedifferanser)
- Luftig sammendrag med agronomiske anbefalinger

Svar i JSON med feltene: canopyDensity (string), ndviSimulated (number 0–1), waterStressLevel ("Low"/"Moderate"/"High"), thermalAnomalies (string[]), treeCountEstimation (number), aerialSummary (string).`;

    return this.runWithFallback<DroneAnalysisResult>(
      async () => {
        const ai = this.getAI();
        const imageParts = imagesBase64.map(data => ({ inlineData: { mimeType: 'image/jpeg', data } }));
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [...imageParts, { text: dronePrompt }] }],
          config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
      },
      dronePrompt,
      (text) => this.extractJson<DroneAnalysisResult>(text, {} as DroneAnalysisResult),
      { json: true, images: imagesBase64 },
    );
  }

  async analyzePruning(image: string, lang: string): Promise<PruningPlan> {
    const prompt = `Du er olivenbeskjæringsmester med ekspertise fra Spania, Italia og Marokko.

Analyser treet og returner NØYAKTIG dette JSON-objektet (ingen markdown, bare ren JSON):

{
  "treeType": "sort og trekategori",
  "ageEstimate": "estimert alder som tekst",
  "pruningSteps": [
    { "area": "grenområde som skal kuttes", "action": "spesifikk handling og begrunnelse", "priority": "HØY", "x": 50, "y": 30 }
  ],
  "recommendedDate": "YYYY-MM-DD",
  "timingAdvice": "forklaring på optimal timing for beskjæring",
  "toolsNeeded": ["Beskjæringssaks", "Baufil", "Sårpasta"]
}

Regler:
- priority: kun HØY, MIDDELS eller LAV
- x/y: koordinater 0–100 der kuttet er i bildet
- Gi minst 3 og maks 8 kuttpunkter
- recommendedDate: en dato i YYYY-MM-DD format`;
    const text = await this.callGeminiVision([image], prompt);
    return JSON.parse(text);
  }

  async analyzeReceipt(base64Image: string): Promise<any> {
    const receiptPrompt = `Analyser denne kvitteringen/fakturaen fra et gårdsbruk.

Ekstraher:
- Totalbeløp (number, uten valutasymbol)
- Dato (YYYY-MM-DD format)
- Kategori: velg én av [Gjødsel, Arbeidskraft, Vedlikehold, Vann, Sprøytemiddel, Drivstoff, Utstyr, Salg, Annet]
- Kort notat (maks 60 tegn) som beskriver hva kjøpet gjelder

Svar i JSON: { "amount": number, "date": "YYYY-MM-DD", "category": "...", "note": "..." }`;

    return this.runWithFallback<any>(
      async () => {
        const ai = this.getAI();
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Image } }, { text: receiptPrompt }] },
          config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
      },
      receiptPrompt,
      (text) => this.extractJson(text, {}),
      { json: true, images: [base64Image] },
    );
  }

  async getFarmInsights(weather: any, soil: any, lang: string, location: string): Promise<FarmInsight[]> {
    // Note: this function used to gate on having a key, but we now always have
    // proxies available (Gemini, Claude, OpenAI) so we proceed unconditionally.
    const weatherSummary = weather ? `Temp: ${weather.temperature_2m}°C, Fuktighet: ${weather.relative_humidity_2m}%, Vind: ${weather.wind_speed_10m} km/t` : 'ukjent vær';
    const fullPrompt = `Du er en erfaren oliven-agro-konsulent for ${location} (Sør-Spania, Alicante-provinsen).

Nåværende værbetingelser: ${weatherSummary}
Tidspunkt: ${new Date().toLocaleDateString('no-NO', { month: 'long', year: 'numeric' })}

Gi 3 konkrete, handlingsorienterte gårdstips for olivendyrkere i denne perioden. Fokuser på:
- Sesongaktuell aktivitet (beskjæring, gjødsling, sprøyting, høsting)
- Spesifikke olivensykdommer og skadedyr å passe på nå
- Lønnsomhetstips (marked, prosessering, kvalitetsforbedring)

Format: JSON array med [ { "id": "1", "tittel": "...", "beskrivelse": "..." }, ... ]
Bruk ${lang === 'no' ? 'norsk' : 'engelsk'} språk.`;

    try {
      return await this.runWithFallback<FarmInsight[]>(
        async () => {
          const ai = this.getAI();
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: fullPrompt,
            config: { responseMimeType: "application/json" }
          });
          return JSON.parse(response.text || "[]");
        },
        fullPrompt,
        (text) => this.extractJson<FarmInsight[]>(text, []),
        { json: true },
      );
    } catch {
      // Insights are best-effort — never break the dashboard if all providers fail.
      return [];
    }
  }

  async getIrrigationRecommendation(sensors: Sensor[], forecast: any[], lang: string): Promise<IrrigationAdvice> {
    const moistureSensors = sensors.filter(s => s.type === 'Moisture');
    const tempSensors = sensors.filter(s => s.type === 'Temperature');
    const forecastSummary = forecast.slice(0, 5).map((d: any) => `${d.date}: ${d.rainSum}mm nedbør, ET0: ${d.evap}mm`).join('; ');

    const fullPrompt = `Du er en olivenirrigeringsspesialist.

SENSORER:
- Jordfuktighet: ${moistureSensors.map(s => `${s.name}: ${s.value}${s.unit}`).join(', ') || 'Ingen data'}
- Temperatur: ${tempSensors.map(s => `${s.name}: ${s.value}${s.unit}`).join(', ') || 'Ingen data'}

VÆRUTSIKT (neste 5 dager): ${forecastSummary || 'Ingen data'}

For oliven er kritisk vannpunkt ved jordmfuktighet < 35%. Optimal: 45-65%.

Gi:
- Konkret anbefaling (vann NÅ / vent / juster)
- Kritiske faktorer som påvirker beslutningen
- Nøyaktig mengde (liter/tre eller mm/m²)
- Beste tidspunkt (tidlig morgen anbefales)
- Konfidensnivå 0-100
- Kortfattet begrunnelse

Svar i JSON: { "recommendation": "...", "criticalFactors": [...], "amount": "...", "timing": "...", "confidence": number, "reasoning": "..." }`;

    return this.runWithFallback<IrrigationAdvice>(
      async () => {
        const ai = this.getAI();
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: fullPrompt,
          config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
      },
      fullPrompt,
      (text) => this.extractJson<IrrigationAdvice>(text, {} as IrrigationAdvice),
      { json: true },
    );
  }

  async getOliveExpertAdvice(topic: string, context: string, lang: string): Promise<{ title: string; content: string; actionItems: string[]; urgency: 'low' | 'medium' | 'high' }> {
    const fullPrompt = `Du er VERDENS LEDENDE olivenekspert – agronomidoktor med spesialitet i Olea europaea, med erfaring fra Andalucia, Toscana og Kairouan.

Emne: ${topic}
Kontekst: ${context}
Språk: ${lang === 'no' ? 'norsk' : 'engelsk'}

Gi en utfyllende, faglig korrekt svar som inkluderer:
- Vitenskapelig begrunnelse
- Praktiske handlingstips
- Varsler om potensielle risikoer
- Referanser til anerkjent olivenpraksis

Svar i JSON: { "title": "...", "content": "...", "actionItems": ["...", "..."], "urgency": "low/medium/high" }`;

    return this.runWithFallback<{ title: string; content: string; actionItems: string[]; urgency: 'low' | 'medium' | 'high' }>(
      async () => {
        const ai = this.getAI();
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: fullPrompt,
          config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
      },
      fullPrompt,
      (text) => this.extractJson(text, { title: '', content: '', actionItems: [], urgency: 'low' as const }),
      { json: true },
    );
  }

  async getProfitabilityAnalysis(batches: any[], transactions: any[], parcels: any[], lang: string): Promise<{
    totalRevenue: number;
    totalCosts: number;
    netProfit: number;
    profitMargin: number;
    revenuePerKg: number;
    costPerKg: number;
    breakEvenKg: number;
    insights: string[];
    parcelROI: Array<{ parcelId: string; roi: number; revenue: number; costs: number }>;
  }> {
    const fullPrompt = `Du er en landbruksøkonom spesialisert i oliven-produksjon.

PRODUKSJONSDATA:
${JSON.stringify({ batches: batches.slice(0, 10), transactions: transactions.slice(0, 20), parcels })}

Beregn og analyser:
1. Total omsetning vs kostnader
2. Netto fortjeneste og margin (%)
3. Inntekt per kg og kostnad per kg
4. Break-even volum (kg)
5. ROI per parsell
6. 3 konkrete forbedringstips for lønnsomhet

Svar i JSON med nøyaktige tall basert på dataene over. Felter: totalRevenue, totalCosts, netProfit, profitMargin, revenuePerKg, costPerKg, breakEvenKg, insights (string[]), parcelROI (array av {parcelId, roi, revenue, costs}).`;

    return this.runWithFallback(
      async () => {
        const ai = this.getAI();
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: fullPrompt,
          config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
      },
      fullPrompt,
      (text) => this.extractJson(text, {} as any),
      { json: true },
    );
  }
}

export const geminiService = new GeminiService();
