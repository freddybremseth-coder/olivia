
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
      contents: { parts: [...imageParts, { text: "Analyser helse og beskjæring for disse olivenbildene. Returner resultatet i JSON-format." }] },
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
      contents: { parts: [...imageParts, { text: "Simuler drone-analyse. JSON." }] },
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  }

  async analyzePruning(image: string, lang: string): Promise<PruningPlan> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: image } }, { text: "Beskjæringsplan. JSON." }] },
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  }

  async analyzeReceipt(base64Image: string): Promise<any> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Image } }, { text: "Kvitteringsskann. JSON." }] },
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  }

  async getFarmInsights(weather: any, soil: any, lang: string, location: string): Promise<FarmInsight[]> {
    const ai = this.getAI();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Gi 3 korte landbrukstips for ${location}. JSON array.`,
        config: { responseMimeType: "application/json" }
      });
      return JSON.parse(response.text || "[]");
    } catch { return []; }
  }

  async getIrrigationRecommendation(sensors: Sensor[], forecast: any[], lang: string): Promise<IrrigationAdvice> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Vanningsanbefaling for: ${JSON.stringify(sensors)}. JSON.`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  }
}

export const geminiService = new GeminiService();
