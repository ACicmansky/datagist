import { GoogleGenAI, Type } from "@google/genai";
import type { GA4ReportData } from "./ga4";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface AIInsight {
  summary: string;
  top_source: string;
  recommendations: string[];
}

export const generateInsight = async (
  metricsData: GA4ReportData,
  planLevel: string
): Promise<AIInsight> => {
  const prompt = `
    Analyze this Google Analytics 4 data for the last 30 days.
    Plan Level: ${planLevel} (If 'Pro', provide more detailed strategic advice).
    
    Metrics Data:
    ${JSON.stringify(metricsData, null, 2)}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: prompt,
    config: {
      systemInstruction:
        "You are a web analytics expert. Analyze this JSON data. Provide a summary of performance, identify the top traffic source, and give 3 specific recommendations.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          top_source: { type: Type.STRING },
          recommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["summary", "top_source", "recommendations"],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("No response from Gemini");
  }

  return JSON.parse(text) as AIInsight;
};
