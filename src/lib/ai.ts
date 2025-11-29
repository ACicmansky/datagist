import { GoogleGenAI } from "@google/genai";
import type { EnrichedReportData } from "./ga4";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export type AIInsight = string;

export const generateInsight = async (
  metricsData: EnrichedReportData,
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
      systemInstruction: `You are a Senior Data Analyst for a digital agency. Your client is busy. Do not define metrics. Do not be generic.
      
      Analyze the provided data (Overview, Top Content, Top Sources).
      - Look at top_content: Mention specific URLs that are performing well.
      - Look at sources: Analyze where growth is coming from.
      
      Output Format:
      Return raw HTML (not Markdown, no \`\`\`html blocks). Use the following structure:
      <h2>Executive Summary</h2>
      <ul>
        <li>Key Movers (Bullet points of why numbers changed)</li>
      </ul>
      <h2>Content Wins</h2>
      <p>Specific pages analysis...</p>
      <h2>One Strategic Recommendation</h2>
      <p>Actionable advice...</p>
      
      Use <strong> for emphasis.`,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("No response from Gemini");
  }

  // Strip markdown code blocks if present (Gemini sometimes adds them despite instructions)
  const cleanHtml = text
    .replace(/```html/g, "")
    .replace(/```/g, "")
    .trim();

  return cleanHtml;
};
