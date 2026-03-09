
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

export class GeminiService {
  private cache = new Map<string, CadastralDetails>();

  private getClaudeKey(): string | null {
    return localStorage.getItem('olivia_claude_api_key') || null;
  }

  private getGeminiKey(): string {
    return localStorage.getItem('olivia_gemini_api_key') || process.env.API_KEY || '';
  }

  private getAI() {
    return new GoogleGenAI({ apiKey: this.getGeminiKey() });
  }

  async callClaude(prompt: string, model: string = 'claude-sonnet-4-6'): Promise<string> {
    const key = this.getClaudeKey();
    if (!key) throw new Error('Ingen Claude API-nøkkel konfigurert');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as { error?: { message?: string } }).error?.message || `Claude API feil: ${response.status}`);
    }
    const data = await response.json() as { content: Array<{ type: string; text: string }> };
    return data.content[0]?.text || '';
  }

  private async generateText(prompt: string): Promise<string> {
    if (this.getClaudeKey()) {
      return this.callClaude(prompt);
    }
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });
    return response.text ?? '';
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
    const ai = this.getAI();

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

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Du er en ekspert på produksjon av bordoliven og matvaresikkerhet med 20 års erfaring fra Spania og Italia.

Juster denne oppskriften for bordoliven basert på brukerens ønske.
Alle mengder skal være per 1 liter saltlake/marinade (standardisert basis).

Nåværende oppskrift: ${JSON.stringify(currentRecipe)}

Brukerens ønske: "${prompt}"${marketNote}

Returner justert oppskrift med eksakte mengder. Tenk på balanse mellom salt, syre, fett og aromater.
Svar i JSON.`,
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
  }

  async suggestIngredientAmount(
    ingredientName: string,
    currentIngredients: Ingredient[],
    flavorTarget: string,
    batchKg: number = 100
  ): Promise<{ amount: string; unit: string; rationale: string }> {
    const ai = this.getAI();

    const flavorContext: Record<string, string> = {
      mild:      'mild og balansert smak',
      syrlig:    'syrlig/acidic profil med eddik og sitron',
      frisk:     'frisk og lett med lette urter',
      krydret:   'krydret/spicy med chilli og paprika',
      sterk:     'sterk og intens med dominerende urter',
      middelhav: 'klassisk middelhavsstil med olivenolje og urter',
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Du er ekspert på produksjon av bordoliven med 20 års erfaring.

Nåværende oppskrift (per 1 liter saltlake): ${JSON.stringify(currentIngredients)}
Batch-størrelse: ${batchKg} kg oliven
Ønsket smaksprofil: ${flavorContext[flavorTarget] || flavorTarget}
Ingredient som skal legges til: ${ingredientName}

Foreslå eksakt mengde av "${ingredientName}" per 1 liter saltlake for å oppnå god smaksbalanse.
Husk matvaresikkerhet og typiske mengder i profesjonell olivenproduksjon.
Gi en kort norsk forklaring på hvorfor denne mengden er riktig.`,
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
    return JSON.parse(response.text || '{"amount":"1","unit":"stk","rationale":""}');
  }

  async analyzeComprehensive(imagesBase64: string[], lang: string): Promise<ComprehensiveAnalysisResult> {
    const ai = this.getAI();
    const imageParts = imagesBase64.map(data => ({ inlineData: { mimeType: 'image/jpeg', data } }));
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: { parts: [...imageParts, { text: `Du er en olivenagronom med doktorgrad i Olea europaea og 30+ års felterfaring fra Andalucia, Toscana og Tunesia. Du konsulterer for profesjonelle olivenprodusenter.

OPPGAVE: Gi en komplett, agronomi-faglig analyse som en seniorekspert ville levert til en kommersiell produsent.

─── HELSEANALYSE ────────────────────────────────────────────
Se spesifikt etter (bruk latinske navn der relevant):
• Soppsykdommer: Olivenbladflekk (Spilocaea oleagina – karakteristiske sootspot-flekker), Antracnose (Colletotrichum acutatum/gloeosporioides – brunrote frukter), Verticilliumvisning (Verticillium dahliae – ensidig visning), Olivenknoll (Pseudomonas savastanoi – tumorliknende vekster), Fumagine (sotdugg fra lus-sekresjon)
• Skadedyr: Olivenflue (Bactrocera oleae – stikkeskader i frukt), Olivenmøll (Prays oleae – 3 generasjoner: blom/blad/fruktform), Cicada-skader, Cottony cushion scale (Icerya purchasi), Olivenvikler (Palpita unionalis), Bladlus (Saissetia oleae)
• Næringsstatus: N-mangel (uniformt gulning, redusert skuddvekst), Fe-klorose (ung-blad mellomgrønn klorose, pH-relatert), B-mangel (misformede knopper, abortering), Mg-mangel (intervenal klorose eldre blader), K-mangel (bladkantbrenning i tørke)
• Vannings- og abiotisk stress: Tørkestress (rullete blader, grågrønt), Overvanning (gule nedre blader, rotråte-tegn), Frostskaer (svart bark, sprekker), Saltskade (marginal nekrose)
• Kronarkitektur: Sentralstemme vs polisykkel (vaseform), lysgjennomtrengning (estimert %), internodielengde, produktiv vs ikke-produktiv ved

─── SORTIDENTIFIKASJON ─────────────────────────────────────
Vurder morfologi grundig:
• Gordal Sevillana: store, kjøttfulle frukter, store oval blader
• Changlot Real: oval/avlang frukt, mellomstore blader med lys underside, typisk Valencia
• Genoesa: regional spansk sort
• Picual: trekantede spissede blader, robuste greiner, mørk bark
• Arbequina: små runde blader, hengende greiner, kompakt vekst
• Hojiblanca: store lyse blader, flat grenarkitektur
• Manzanilla: runde blader, tidlig modning
• Cornicabra: tykke mørke blader, karakteristisk bøyde greiner
• Frantoio/Leccino: toscanske sorter, smale blader
• Gi konfidenspoeng 0–100

─── ALDERSVURDERING ────────────────────────────────────────
• Stammediameter og bark-tekstur (glatt = ung, riflet = gammel)
• Internodielengde og kronkompleksitet
• Produktiv fase: 1–15 år (ikke produktiv/lav), 15–150 år (full produksjon), 150–500 år (redusert men stabil), 500+ år (historisk, foryngelse nødvendig)
• Indiker om treet er i vekstfase, topproduksjon eller nedgangsperiode

─── BESKJÆRINGSPLAN ────────────────────────────────────────
For hvert kutt:
• Spesifikt område og grentype (primærgren, sekundærgren, sucker, vannris/suckers)
• Begrunnelse (lysblokking %, sykdomsport, for gammel ved [>8 år = lav produktivitet], ubalanse, vinterskade)
• Type kutt: tilbakeføring vs tynning vs foryngelse
• Prioritet HØY (produktivitet/helse) / MIDDELS (form) / LAV (estetikk)
• xy-koordinater i bildet (0–100)
Angi: lett vedlikehold, moderat renovasjon ELLER kraftig foryngelse (policing)

─── EKSPERTRAPPORT ──────────────────────────────────────────
• urgencyScore 0–10: 0=perfekt, 10=krev tiltak i dag
• Estimert produksjonstap % pga påviste problemer
• Realistisk avkastningsestimat kg/tre under nåværende tilstand
• Gjødselanbefaling: NPK-ratio og mikronæring (f.eks. "N:P:K 15-5-20 + 0.3% borsyre foliærsprøyting")
• Vanningsobservasjon
• Er foryngelsesbeskjæring nødvendig?
• Den ÉNE viktigste handlingen akkurat nå

Svar i JSON.` }] },
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            diagnosis: {
              type: Type.OBJECT,
              properties: {
                subject: { type: Type.STRING },
                variety: { type: Type.STRING },
                condition: { type: Type.STRING },
                diagnosis: { type: Type.STRING },
                actions: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['subject', 'variety', 'condition', 'diagnosis', 'actions']
            },
            pruning: {
              type: Type.OBJECT,
              properties: {
                treeType: { type: Type.STRING },
                ageEstimate: { type: Type.STRING },
                pruningSteps: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      area: { type: Type.STRING },
                      action: { type: Type.STRING },
                      priority: { type: Type.STRING },
                      x: { type: Type.NUMBER },
                      y: { type: Type.NUMBER }
                    }
                  }
                },
                recommendedDate: { type: Type.STRING },
                timingAdvice: { type: Type.STRING },
                toolsNeeded: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['treeType', 'ageEstimate', 'pruningSteps', 'recommendedDate', 'timingAdvice', 'toolsNeeded']
            },
            expertReport: {
              type: Type.OBJECT,
              properties: {
                urgencyScore: { type: Type.NUMBER },
                economicImpact: { type: Type.STRING },
                yieldEstimate: { type: Type.STRING },
                fertilizerRecommendation: { type: Type.STRING },
                irrigationNote: { type: Type.STRING },
                rejuvenationNeeded: { type: Type.BOOLEAN },
                nextKeyAction: { type: Type.STRING },
              },
              required: ['urgencyScore', 'economicImpact', 'yieldEstimate', 'fertilizerRecommendation', 'irrigationNote', 'rejuvenationNeeded', 'nextKeyAction']
            },
            varietyConfidence: { type: Type.NUMBER },
            needsMoreImages: { type: Type.BOOLEAN },
            missingDetails: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['diagnosis', 'pruning', 'expertReport', 'varietyConfidence', 'needsMoreImages', 'missingDetails']
        }
      }
    });
    return JSON.parse(response.text || "{}");
  }

  async analyzeDrone(imagesBase64: string[], lang: string): Promise<DroneAnalysisResult> {
    const ai = this.getAI();
    const imageParts = imagesBase64.map(data => ({ inlineData: { mimeType: 'image/jpeg', data } }));
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [...imageParts, { text: `Du er en presisjonsjordbruksekspert med drone-analyse. Analyser dette luftbildet av en olivenlund.

Gi:
- Kanonitettstetthet (%) og krondekning
- NDVI-simulasjon (0.0–1.0) basert på fargeintensitet
- Vannstressvurdering (Lav/Moderat/Høy) basert på blad-/kronefarge
- Termiske anomalier (soner med stress, sykdom, varme)
- Teller-estimat av trær synlige i bildet
- Identifiser mulige problemsoner (tørre flekker, sykdomsspredning, høydedifferanser)
- Luftig sammendrag med agronomiske anbefalinger

Svar i JSON.` }] },
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  }

  async analyzePruning(image: string, lang: string): Promise<PruningPlan> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: image } }, { text: `Du er olivenbeskjæringsmester med ekspertise fra Spania, Italia og Marokko.

Lag en detaljert BESKJÆRINGSPLAN for dette treet:

1. TREANALYSE:
   - Sort (Picual, Arbequina, Hojiblanca, etc.) og aldersstimeering
   - Nåværende form (vase, åpen midt, flerleder)
   - Lysgjennomtrengning (estimert %)

2. PRIORITERTE KUTT:
   - For hvert kutt: område, handling, prioritet (HØY/MIDDELS/LAV)
   - Begrunn hvert kutt (lysblokking, sykdom, for gammel ved, ubalanse)
   - Gi x,y koordinater i bildet (0-100 skala)

3. TIMING:
   - Beste tidspunkt (oliven beskjæres normalt jan-mars i Spania)
   - Om treet trenger kraftig foryngelsesbeskjæring vs lett vedlikehold

4. VERKTØY: List spesifikke verktøy med begrunnelse

Svar i JSON.` }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            treeType: { type: Type.STRING },
            ageEstimate: { type: Type.STRING },
            pruningSteps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  area: { type: Type.STRING },
                  action: { type: Type.STRING },
                  priority: { type: Type.STRING },
                  x: { type: Type.NUMBER },
                  y: { type: Type.NUMBER }
                },
                required: ['area', 'action', 'priority', 'x', 'y']
              }
            },
            recommendedDate: { type: Type.STRING },
            timingAdvice: { type: Type.STRING },
            toolsNeeded: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['treeType', 'ageEstimate', 'pruningSteps', 'recommendedDate', 'timingAdvice', 'toolsNeeded']
        }
      }
    });
    return JSON.parse(response.text || "{}");
  }

  async analyzeReceipt(base64Image: string): Promise<any> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Image } }, { text: `Analyser denne kvitteringen/fakturaen fra et gårdsbruk.

Ekstraher:
- Totalbeløp (number, uten valutasymbol)
- Dato (YYYY-MM-DD format)
- Kategori: velg én av [Gjødsel, Arbeidskraft, Vedlikehold, Vann, Sprøytemiddel, Drivstoff, Utstyr, Salg, Annet]
- Kort notat (maks 60 tegn) som beskriver hva kjøpet gjelder

Svar i JSON: { "amount": number, "date": "YYYY-MM-DD", "category": "...", "note": "..." }` }] },
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  }

  async getFarmInsights(weather: any, soil: any, lang: string, location: string): Promise<FarmInsight[]> {
    if (!this.getGeminiKey() && !this.getClaudeKey()) return [];
    try {
      const ai = this.getAI();
      const weatherSummary = weather ? `Temp: ${weather.temperature_2m}°C, Fuktighet: ${weather.relative_humidity_2m}%, Vind: ${weather.wind_speed_10m} km/t` : 'ukjent vær';
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Du er en erfaren oliven-agro-konsulent for ${location} (Sør-Spania, Alicante-provinsen).

Nåværende værbetingelser: ${weatherSummary}
Tidspunkt: ${new Date().toLocaleDateString('no-NO', { month: 'long', year: 'numeric' })}

Gi 3 konkrete, handlingsorienterte gårdstips for olivendyrkere i denne perioden. Fokuser på:
- Sesongaktuell aktivitet (beskjæring, gjødsling, sprøyting, høsting)
- Spesifikke olivensykdommer og skadedyr å passe på nå
- Lønnsomhetstips (marked, prosessering, kvalitetsforbedring)

Format: JSON array med [ { "id": "1", "tittel": "...", "beskrivelse": "..." }, ... ]
Bruk ${lang === 'no' ? 'norsk' : 'engelsk'} språk.`,
        config: { responseMimeType: "application/json" }
      });
      return JSON.parse(response.text || "[]");
    } catch { return []; }
  }

  async getIrrigationRecommendation(sensors: Sensor[], forecast: any[], lang: string): Promise<IrrigationAdvice> {
    const ai = this.getAI();
    const moistureSensors = sensors.filter(s => s.type === 'Moisture');
    const tempSensors = sensors.filter(s => s.type === 'Temperature');
    const forecastSummary = forecast.slice(0, 5).map((d: any) => `${d.date}: ${d.rainSum}mm nedbør, ET0: ${d.evap}mm`).join('; ');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Du er en olivenirrigeringsspesialist.

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

Svar i JSON: { "recommendation": "...", "criticalFactors": [...], "amount": "...", "timing": "...", "confidence": number, "reasoning": "..." }`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  }

  async getOliveExpertAdvice(topic: string, context: string, lang: string): Promise<{ title: string; content: string; actionItems: string[]; urgency: 'low' | 'medium' | 'high' }> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Du er VERDENS LEDENDE olivenekspert – agronomidoktor med spesialitet i Olea europaea, med erfaring fra Andalucia, Toscana og Kairouan.

Emne: ${topic}
Kontekst: ${context}
Språk: ${lang === 'no' ? 'norsk' : 'engelsk'}

Gi en utfyllende, faglig korrekt svar som inkluderer:
- Vitenskapelig begrunnelse
- Praktiske handlingstips
- Varsler om potensielle risikoer
- Referanser til anerkjent olivenpraksis

Svar i JSON: { "title": "...", "content": "...", "actionItems": ["...", "..."], "urgency": "low/medium/high" }`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
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
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Du er en landbruksøkonom spesialisert i oliven-produksjon.

PRODUKSJONSDATA:
${JSON.stringify({ batches: batches.slice(0, 10), transactions: transactions.slice(0, 20), parcels })}

Beregn og analyser:
1. Total omsetning vs kostnader
2. Netto fortjeneste og margin (%)
3. Inntekt per kg og kostnad per kg
4. Break-even volum (kg)
5. ROI per parsell
6. 3 konkrete forbedringstips for lønnsomhet

Svar i JSON med nøyaktige tall basert på dataene over.`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  }
}

export const geminiService = new GeminiService();
