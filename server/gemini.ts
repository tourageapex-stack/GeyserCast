import { GoogleGenAI, Type } from '@google/genai';
import { getAllGeysers } from './db';
import { generatePredictionForGeyser } from './predictionEngine';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || '';
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export interface NaturalFilterResult {
  basin?: string;
  area?: string;
  timeWindowMinutes?: number;
  minConfidence?: number;
  maxDistanceMiles?: number;
  geyserName?: string;
  summary: string;
}

/**
 * Translates Natural Language requests into structured query filters
 */
export async function parseNaturalLanguageFilter(userPrompt: string): Promise<NaturalFilterResult> {
  const fallback: NaturalFilterResult = {
    summary: `Showing search for: "${userPrompt}"`,
  };

  if (!process.env.GEMINI_API_KEY) {
    return fallback;
  }

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Translate the following visitor query about Yellowstone geysers into structured filter parameters:
Query: "${userPrompt}"

Available Basins in Yellowstone:
- Upper Geyser Basin
- Lower Geyser Basin
- Norris Geyser Basin
- Midway Geyser Basin
- West Thumb Geyser Basin
- Lone Star Basin
- Gibbon Geyser Basin
- Mud Volcano
- Shoshone Geyser Basin

Return a JSON object containing any identified parameters.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            basin: { type: Type.STRING, description: 'Matched basin name if mentioned' },
            area: { type: Type.STRING, description: 'Matched area or group if mentioned' },
            timeWindowMinutes: { type: Type.INTEGER, description: 'Time window in minutes (e.g. 60 for 1 hour, 120 for 2 hours)' },
            minConfidence: { type: Type.INTEGER, description: 'Minimum confidence percentage required (0-100)' },
            maxDistanceMiles: { type: Type.NUMBER, description: 'Maximum distance in miles if mentioned' },
            geyserName: { type: Type.STRING, description: 'Geyser name if specific geyser named' },
            summary: { type: Type.STRING, description: 'Short summary explanation of applied filter' },
          },
          required: ['summary'],
        },
      },
    });

    if (response.text) {
      const parsed = JSON.parse(response.text.trim());
      return parsed;
    }
  } catch (err) {
    console.warn('[Gemini Parse Error]', err);
  }

  return fallback;
}

/**
 * Natural Language Q&A grounded strictly in real database geysers & predictions
 */
export async function queryGeyserAssistant(userPrompt: string, userLat?: number, userLon?: number): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    return 'Gemini AI Assistant is offline. Please configure GEMINI_API_KEY in Settings > Secrets to enable intelligent Q&A.';
  }

  try {
    const geysers = getAllGeysers();
    const now = new Date();

    const currentPredictionsSummary = geysers
      .map((g) => {
        const pred = generatePredictionForGeyser(g);
        const minutesLeft = Math.round((new Date(pred.predictedTime).getTime() - now.getTime()) / (60 * 1000));
        return {
          name: g.name,
          basin: g.basin,
          predictedTimeUTC: pred.predictedTime,
          minutesUntilEruption: minutesLeft,
          windowStartUTC: pred.windowStart,
          windowEndUTC: pred.windowEnd,
          confidence: pred.confidence,
          modelUsed: pred.modelName,
          historicalMedianMin: pred.features.historicalMedianMinutes,
          usableObservations: pred.features.usableObservationsCount,
        };
      })
      .filter((row) => row.minutesUntilEruption >= -360 && row.minutesUntilEruption <= 36 * 60)
      .sort((a, b) => a.minutesUntilEruption - b.minutesUntilEruption)
      .slice(0, 80);

    const ai = getAiClient();
    const promptContext = `You are the official Yellowstone Geyser Assistant. You must ALWAYS use the real structured prediction data provided below to answer visitor questions.
CRITICAL RULES:
1. NEVER invent, hallucinate, or alter eruption times or intervals.
2. Rely strictly on the prediction summary database provided below.
3. If data is unavailable for a specific question, state clearly that live data is unavailable.
4. Format times clearly in Yellowstone Local Mountain Time (MST/MDT) and relative minutes (e.g. "in 34 minutes").

Current User Location: ${userLat != null && userLon != null ? `Lat ${userLat}, Lon ${userLon} (Yellowstone Park)` : 'Old Faithful Area'}
Current Time UTC: ${now.toISOString()}

Structured Geyser Predictions Repository:
${JSON.stringify(currentPredictionsSummary, null, 2)}

Visitor Question: "${userPrompt}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: promptContext,
      config: {
        systemInstruction: 'You are an expert, friendly Yellowstone National Parkranger AI guide. Speak clearly, accurately, and helpful to park visitors on their phones.',
      },
    });

    return response.text || 'No response generated.';
  } catch (err: any) {
    console.error('[Gemini Assistant Error]', err);
    return `Unable to answer query at this moment: ${err?.message || 'Server error'}`;
  }
}
