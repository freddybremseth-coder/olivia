
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

export interface ComprehensiveAnalysisResult {
  diagnosis: PlantDiagnosis;
  pruning: PruningPlan;
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

  private getAI() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async analyzeParcelCadastre(searchQueryOrCoords: string, lang: string = 'no'): Promise<CadastralDetails> {
    const cacheKey = searchQueryOrCoords.trim().toUpperCase();
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const ai = this.getAI();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Du er en spesialisert agent for spansk eiendomsinformasjon (Catastro).
        OPPGAVE: Identifiser matrikkeldata for følgende forespørsel: "${searchQueryOrCoords}".

        INSTRUKSER:
        1. Bruk Google Search til å finne offisielle matrikkeldata fra Sede Electrónica del Catastro.
        2. Identifiser "Referencia Catastral" (20 tegn) og arealet i m2.
        3. Hvis forespørselen er for Biar, Alicante, starter referansen ofte med 03043A.
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

  async adjustRecipe(currentRecipe: Partial<Recipe>, prompt: string, lang: string = 'no'): Promise<Partial<Recipe>> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Juster denne olivenoppskriften: ${JSON.stringify(currentRecipe)} basert på: "${prompt}". Svar i JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            ingredients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  amount: { type: Type.STRING },
                  unit: { type: Type.STRING }
                }
              }
            },
            notes: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}");
  }

  async analyzeComprehensive(imagesBase64: string[], lang: string): Promise<ComprehensiveAnalysisResult> {
    const ai = this.getAI();
    const imageParts = imagesBase64.map(data => ({ inlineData: { mimeType: 'image/jpeg', data } }));
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: [...imageParts, { text: `Du er en verdensekspert på oliven (Olea europaea) og mediterrant landbruk med 30+ års erfaring.

OPPGAVE: Utfør en komplett, profesjonell analyse av disse olivenbildene.

HELSEANALYSE – Se etter:
- Sykdommer: Olivenbladflekk (Spilocaea oleagina), Antracnose (Colletotrichum acutatum), Verticilliumvisning (Verticillium dahliae), Olivenknoll (Pseudomonas savastanoi), Cercospora-flekk
- Skadedyr: Olivenflue (Bactrocera oleae), Olivenmøll (Prays oleae), Olivenvikler, Cottony cushion scale, bladlus
- Næringsstress: Nitrogen- (gulning), Jern- (klorose), Bor- (misformede knopper), Kalsium-mangel
- Vanningsstress: Overdreven tørke (rullet bladkant) eller vanningsstress (blågrønne blader)
- Treform: Sentralstemme vs vasestemme, lysgjennomtrengning, kroneprofil

SORTIDENTIFIKASJON – Forsøk å identifisere:
- Picual (trekantede blader, robuste greiner)
- Arbequina (små runde blader, hengende greiner)
- Hojiblanca (store lyse blader, flatt grenkrona)
- Cornicabra (tykke mørke blader, greiner med karakteristisk bøy)
- Manzanilla, Gordal, Empeltre, Frantoio, Leccino, eller andre
- Gi eksakt konfidenspoeng 0-100

ALDERSVURDERING:
- Undersøk stammediameter og bark-tekstur
- Veksttegn og kronform
- Estimer alder: 1-10 år (ung), 10-50 år (etablert), 50-200 år (gammel), 200+ år (historisk)

BESKJÆRINGSPLAN:
- Prioriter kuttpunkter basert på treform og lysbehov
- Angi prioritet (HØY/MIDDELS/LAV) for hvert kutt
- Beskriv nøyaktig hvilken gren/område som skal kuttes og hvorfor
- Gi anbefalt tidspunkt (etter høst = des-jan, vedlikehold = feb-mar)
- Verktøy som trengs (greinsag, hekksaks, baufil, etc.)

Svar i JSON-format.` }] },
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
            varietyConfidence: { type: Type.NUMBER },
            needsMoreImages: { type: Type.BOOLEAN },
            missingDetails: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['diagnosis', 'pruning', 'varietyConfidence', 'needsMoreImages', 'missingDetails']
        }
      }
    });
    return JSON.parse(response.text || "{}");
  }

  async analyzeDrone(imagesBase64: string[], lang: string): Promise<DroneAnalysisResult> {
    const ai = this.getAI();
    const imageParts = imagesBase64.map(data => ({ inlineData: { mimeType: 'image/jpeg', data } }));
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
      model: 'gemini-3-pro-preview',
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
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  }

  async analyzeReceipt(base64Image: string): Promise<any> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
    const ai = this.getAI();
    try {
      const weatherSummary = weather ? `Temp: ${weather.temperature_2m}°C, Fuktighet: ${weather.relative_humidity_2m}%, Vind: ${weather.wind_speed_10m} km/t` : 'ukjent vær';
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
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
      model: 'gemini-3-flash-preview',
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
      model: 'gemini-3-flash-preview',
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
      model: 'gemini-3-flash-preview',
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
