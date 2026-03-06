
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Sensor, Recipe, Language } from "../types";

//<editor-fold desc="Interfaces">
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
  municipalityCode?: string;
  provinceCode?: string;
  areaSqm: number;
  treeCount?: number;
  neighbors?: string[];
  landUse: string;
  soilQuality?: string;
  municipality: string;
  latitude: number;
  longitude: number;
  description?: string;
}
//</editor-fold>

/**
 * Service class to interact with Google's Gemini AI for various agricultural analyses.
 */
export class GeminiService {
  private cache = new Map<string, CadastralDetails>();

  private getGeminiKey(): string {
    // First, try to get the key set specifically in the app's local storage
    const oliviaKey = localStorage.getItem('olivia_gemini_api_key');
    if (oliviaKey) return oliviaKey;
  
    // Fallback to environment variable (useful for development/server-side)
    // Note: Vite uses import.meta.env for client-side variables
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    if(envKey) return envKey;

    // If still no key, return empty, triggering an error downstream.
    return '';
  }

  private getAI() {
    const apiKey = this.getGeminiKey();
    if (!apiKey) {
      throw new Error('API key for Gemini is not configured. Please set it in the application settings.');
    }
    return new GoogleGenerativeAI(apiKey);
  }

  async analyzeParcelCadastre(searchQueryOrCoords: string, lang: Language = 'no'): Promise<CadastralDetails> {
    const cacheKey = searchQueryOrCoords.trim().toUpperCase();
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const ai = this.getAI();
    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
      systemInstruction: `You are a specialized agent for Spanish property information (Catastro).
      TASK: Identify cadastral data for the following request.
      INSTRUCTIONS:
      1. Use Google Search to find official cadastral data from Sede Electrónica del Catastro.
      2. Find the complete 20-character "Referencia Catastral".
      3. Find the area in square meters (m²).
      4. Find the center point (GPS coordinates) of the parcel.
      5. If the request is for Biar, Alicante, the reference often starts with 03023A.
      Respond ONLY with a valid JSON object matching the requested schema. Do not return text or markdown outside the JSON block.`,
    });

    try {
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: `Forespørsel: "${searchQueryOrCoords}"` }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: 'OBJECT',
                    properties: {
                        cadastralId: { type: 'STRING' },
                        areaSqm: { type: 'NUMBER' },
                        landUse: { type: 'STRING' },
                        municipality: { type: 'STRING' },
                        latitude: { type: 'NUMBER' },
                        longitude: { type: 'NUMBER' },
                        description: { type: 'STRING', nullable: true },
                    },
                    required: ['cadastralId', 'areaSqm', 'landUse', 'municipality', 'latitude', 'longitude']
                },
                temperature: 0.1,
            },
            // @ts-ignore - TODO: Remove when SDK is updated
            tools: [{ 'googleSearch': {} }],
        });

      const data = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!data) {
        throw new Error("AI response was empty or invalid.");
      }
      
      const parsedData = JSON.parse(data) as CadastralDetails;

      if (!parsedData.cadastralId || parsedData.cadastralId.length < 14 || !parsedData.areaSqm || !parsedData.latitude) {
        console.error("Validation Error: Incomplete data from AI", parsedData);
        throw new Error("The model returned incomplete data. Try a more specific search.");
      }
      
      this.cache.set(cacheKey, parsedData);
      return parsedData;

    } catch (error: any) {
      console.error("Cadastral Analysis Error:", error);
      if (error.message?.includes('500') || error.message?.includes('xhr') || error.message?.includes('API key')) {
        throw new Error("Communication error with the AI service. Check the API key or try again later.");
      }
      throw error;
    }
  }

  async adjustRecipe(currentRecipe: Partial<Recipe>, prompt: string): Promise<Partial<Recipe>> {
    const ai = this.getAI();
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{text: `Adjust this olive recipe: ${JSON.stringify(currentRecipe)} based on: "${prompt}". Respond in JSON.`}]}],
        generationConfig: {
            responseMimeType: "application/json",
            // Define a schema based on the Recipe type for consistency
        }
    });
    const text = result.response.text();
    return JSON.parse(text);
  }

  async analyzeComprehensive(imagesBase64: string[], lang: Language): Promise<ComprehensiveAnalysisResult> {
    const ai = this.getAI();
    const model = ai.getGenerativeModel({ 
        model: "gemini-1.5-pro-latest",
        systemInstruction: `You are an expert agronomist and botanist specializing in olive trees ("Olea europaea"). Your task is to perform a comprehensive analysis based on user-provided images.

        Analysis Steps:
        1.  **Identify Subject and Variety**: Identify the main subject of the images (e.g., olive tree, branch, leaves). Attempt to identify the specific olive variety. Rate your confidence in this identification.
        2.  **Assess Health (PlantDiagnosis)**: Examine the tree for signs of disease, pests, or nutrient deficiencies.
            *   Classify the condition as 'SUNN' (Healthy), 'OBSERVASJON' (Observation needed), or 'SYK' (Diseased/Infested).
            *   Provide a clear diagnosis (e.g., "Olive peacock spot (Spilocaea oleaginea)", "Sooty mold", "Nitrogen deficiency").
            *   Recommend concrete, actionable steps to address any issues.
        3.  **Create Pruning Plan (PruningPlan)**:
            *   Estimate the tree's age and state its type (olive tree).
            *   Identify specific areas on the tree that need pruning (e.g., "lower crossing branches", "suckers at base", "dense canopy center").
            *   For each area, describe the action needed (e.g., "Remove completely", "Thin out", "Head back").
            *   Assign a priority ('LAV', 'MIDDELS', 'HØY') to each step. Use the image coordinates (x, y from 0 to 1) to pinpoint the location of each step.
            *   Recommend the best time of year for pruning (e.g., "Late winter, after frost risk but before flowering") and explain why.
            *   List the necessary tools (e.g., "Pruning shears", "Loppers", "Pruning saw").
        4.  **Evaluate Image Quality**: Determine if more or different images are needed for a more accurate analysis (e.g., "Close-up of leaves", "Photo of the entire tree", "Image of the trunk base"). List any missing details that would improve the analysis.
        
        You must respond in the specified language: ${lang}.
        Output ONLY the JSON object matching the schema.`,
    });

    const imageParts = imagesBase64.map(data => ({
        inlineData: {
            mimeType: 'image/jpeg',
            data
        }
    }));
    
    const textPrompt = `Analyze the provided image(s) of an olive tree and provide a comprehensive report in ${lang}.`;

    try {
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [...imageParts, { text: textPrompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: 'OBJECT',
                    properties: {
                        diagnosis: {
                            type: 'OBJECT',
                            properties: {
                                subject: { type: 'STRING' },
                                variety: { type: 'STRING' },
                                condition: { type: 'STRING', enum: ['SUNN', 'OBSERVASJON', 'SYK'] },
                                diagnosis: { type: 'STRING' },
                                actions: { type: 'ARRAY', items: { type: 'STRING' } },
                            },
                            required: ['subject', 'variety', 'condition', 'diagnosis', 'actions']
                        },
                        pruning: {
                            type: 'OBJECT',
                            properties: {
                                treeType: { type: 'STRING' },
                                ageEstimate: { type: 'STRING' },
                                pruningSteps: {
                                    type: 'ARRAY',
                                    items: {
                                        type: 'OBJECT',
                                        properties: {
                                            area: { type: 'STRING' },
                                            action: { type: 'STRING' },
                                            priority: { type: 'STRING', enum: ['LAV', 'MIDDELS', 'HØY'] },
                                            x: { type: 'NUMBER' },
                                            y: { type: 'NUMBER' },
                                        },
                                        required: ['area', 'action', 'priority', 'x', 'y']
                                    }
                                },
                                recommendedDate: { type: 'STRING' },
                                timingAdvice: { type: 'STRING' },
                                toolsNeeded: { type: 'ARRAY', items: { type: 'STRING' } },
                            },
                             required: ['treeType', 'ageEstimate', 'pruningSteps', 'recommendedDate', 'timingAdvice', 'toolsNeeded']
                        },
                        varietyConfidence: { type: 'NUMBER' },
                        needsMoreImages: { type: 'BOOLEAN' },
                        missingDetails: { type: 'ARRAY', items: { type: 'STRING' } },
                    },
                    required: ['diagnosis', 'pruning', 'varietyConfidence', 'needsMoreImages', 'missingDetails']
                },
            },
        });
        
        const text = result.response.text();
        return JSON.parse(text) as ComprehensiveAnalysisResult;

    } catch (error) {
        console.error("Comprehensive Analysis Error:", error);
        throw new Error("Failed to generate comprehensive AI analysis. Please check your API key and network connection.");
    }
  }

  async getIrrigationRecommendation(sensors: Sensor[], forecast: any[], lang: Language): Promise<IrrigationAdvice> {
    const ai = this.getAI();
    const model = ai.getGenerativeModel({
        model: "gemini-1.5-flash-latest",
        systemInstruction: `You are an expert irrigation advisor for olive farms. Your task is to provide a concrete irrigation recommendation based on sensor data and weather forecasts.

        Analyze the provided data to determine the immediate water needs of the olive grove.
        
        Respond in ${lang} with ONLY a JSON object matching the schema.`,
    });
    
    const prompt = `
        Current sensor data: ${JSON.stringify(sensors)}
        Weather forecast: ${JSON.stringify(forecast)}
        
        Based on this data, provide a detailed irrigation recommendation.
    `;
    
    try {
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: 'OBJECT',
                    properties: {
                        recommendation: { type: 'STRING' },
                        criticalFactors: { type: 'ARRAY', items: { type: 'STRING' } },
                        amount: { type: 'STRING' },
                        timing: { type: 'STRING' },
                        confidence: { type: 'NUMBER' },
                        reasoning: { type: 'STRING' },
                    },
                    required: ['recommendation', 'criticalFactors', 'amount', 'timing', 'confidence', 'reasoning']
                },
            },
        });
        const text = result.response.text();
        return JSON.parse(text) as IrrigationAdvice;
    } catch(error) {
        console.error("Irrigation Recommendation Error:", error);
        throw new Error("Failed to get irrigation recommendation.");
    }
  }

  async getYearlyRainfallAnalysis(
    monthlyData: { name: string; rain: number; normal: number }[],
    locationName: string,
    lang: Language = 'no'
  ): Promise<{ title: string; analysis: string }> {
    const ai = this.getAI();
    const model = ai.getGenerativeModel({
        model: "gemini-1.5-flash-latest",
        systemInstruction: `You are an AI agronomist with a PhD in olive cultivation and 30 years of experience with climate effects on Mediterranean crops. You are analyzing rainfall data for an olive farm in ${locationName}.

        TASK:
        1.  **Analyze Data**: Compare "rain" against "normal" for the whole year and for critical periods.
        2.  **Identify Critical Periods**: Focus on how rainfall deviations (deficits and surpluses) might have affected:
            *   **Spring (Mar-May)**: Crucial for flowering and fruit set. Drought here is very negative.
            *   **Summer/Early Autumn (Jun-Oct)**: Crucial for oil accumulation. Drought stress can reduce oil content.
            *   **Winter (Nov-Feb)**: Tree recovery period.
        3.  **Formulate Conclusion/Trend**: Provide a concrete prediction for the next season's harvest. Is the trend positive, negative, or neutral? Provide your professional reasoning.
        4.  **Be Specific**: Use numbers from the data to support your claims (e.g., "A rainfall deficit of X% in May may have...").
        
        OUTPUT FORMAT:
        Return ONLY a valid JSON object in ${lang} with the specified structure. Do not write anything before or after the JSON object.`,
    });

    const prompt = `Here is the data:
        ${JSON.stringify(monthlyData, null, 2)}
    `;

    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: 'OBJECT',
            properties: {
                title: { type: 'STRING' },
                analysis: { type: 'STRING' }
            },
            required: ['title', 'analysis']
          },
          temperature: 0.4,
        }
      });
      const text = result.response.text();
      const analysisResult = JSON.parse(text) as { title: string; analysis: string };
      if (!analysisResult.title || !analysisResult.analysis) {
        throw new Error("AI response missing title or analysis.");
      }
      return analysisResult;
    } catch (error: any) {
      console.error("Yearly Rainfall Analysis Error:", error);
      throw new Error("Could not generate yearly rainfall analysis.");
    }
  }
}

export const geminiService = new GeminiService();
