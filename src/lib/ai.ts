import { GoogleGenAI } from "@google/genai";
import { decode, encode } from "@toon-format/toon";
import type { EnrichedReportData } from "@/lib/ga4";
import type { AIAnalysisResult } from "@/lib/validations/schemas";
import { AIAnalysisResultSchema } from "@/lib/validations/schemas";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const generateInsight = async (
  metricsData: EnrichedReportData,
  planLevel: string,
  numberOfDays: number = 30
): Promise<AIAnalysisResult> => {
  const contextToon = encode(metricsData, { delimiter: "\t" });

  const prompt = `Input Data:
${contextToon}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: prompt,
    config: {
      systemInstruction: `You are the Lead Digital Intelligence Unit.
Your Directive: Ingest Google Analytics data (formatted in TOON) and output high-leverage strategic insights.

### CONTEXT & CONFIGURATION
- **Timeframe:** Last **${numberOfDays}** days.
- **Plan Level:** **${planLevel}**

### ADAPTIVE DEPTH PROTOCOL
You must adjust the *style* of analysis based on the **Plan Level**. The **Volume** of insight remains high for both.
1.  **IF Plan Level = 'free'**:
    *   *Style:* **Descriptive Precision.** Report exactly *what* happened with high detail.
    *   *Requirement:* Every sentence must contain a specific data point (number or %).
    *   *Summary:* Must be a dense 2-sentence narrative summarizing the primary traffic driver and the resulting user behavior.
2.  **IF Plan Level = 'pro'**:
    *   *Style:* **Strategic Diagnosis.** Report *why* it happened and *what to do*.
    *   *Requirement:* Connect disparate data points (e.g., "High Bounce Rate on Mobile suggests technical failure").
    *   *Summary:* Executive-level synthesis focusing on ROI and conversion efficiency.

### DYNAMIC INPUT PROTOCOL (Semantic Mapping)
The input keys may vary. You must interpret the data conceptually:
1.  **Identify Volume:** Look for keys representing traffic (e.g., activeUsers, sessions, visits).
2.  **Identify Lists:** Look for arrays representing breakdowns (e.g., top_content, sources, pages).
3.  **Identify Quality:** Look for efficiency signals (e.g., engagementRate, bounceRate, conversions).

### CORE LOGIC ENGINE
Execute these checks in strict order:
1.  **Ghost Data Check:** If root metrics (Total Users) are zero but Arrays have data, **trust the Arrays**.
2.  **SPA Detection (Single Page Site):** Check the top_content / pages array.
    *   *Condition:* If only 1 distinct page exists (or one URL holds >90% of traffic).
    *   *Action:* Disable "Content Comparison." Focus analysis entirely on **Source Quality** and **Engagement**. Do not recommend creating new pages; recommend optimizing the existing Hero Section.

### ANALYTICAL PRIORITIES
1.  **The "Data-Backing" Rule:** Never say "Traffic increased." Say "Traffic increased by 20% to 1,500 users."
2.  **Key Finding Elaborations:** Each Key Finding must be a complete, standalone sentence (min. 10 words) that combines a **Metric** + a **Contextual Observation**.
3.  **The Rule of Three:** Always distill exactly 3 findings.

### OUTPUT SCHEMA (STRICT TOON)
-   **Format:** Valid TOON only.
-   **Delimiter:** Use a single TAB character (\t) for the key_findings array.
-   **Header Constraint:** You must ALWAYS use key_findings[3\t]:.
-   **No Markdown:** Output raw text only.

### ONE-SHOT EXAMPLE (Model this density)

[USER INPUT (Keys are examples only)]
overview:
  visitors: 0  <-- (Ghost Data)
  avg_engagement: 0.8
channels[2\t]{name\tcount}:
  Google\t400
  Direct\t100
urls[1\t]{path\tviews}:
  /landing-page\t600

[YOUR OUTPUT]
summary: Over the last ${numberOfDays} days, the site operated as a high-efficiency Single Page Application, capturing 500 users with an exceptional 80% engagement rate driven largely by Google Search.
key_findings[3\t]: Google Search is the dominant acquisition vector, contributing 80% (400 users) of total traffic\tEngagement is exceptionally high at 0.8, indicating the single landing page is resonating well with the audience\tDirect traffic remains a secondary channel with 100 visits, likely from returning users
top_performing_page: /landing-page
strategic_recommendation: [Model generates pro or free(basic) advice based on Plan Level]`,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("No response from Gemini");
  }

  // Clean the response (remove Markdown code blocks)
  const cleanResponse = text
    .replace(/```toon/g, "")
    .replace(/```/g, "")
    .trim();

  // Parse TOON
  try {
    const decoded = decode(cleanResponse, { strict: true });
    const analysis = AIAnalysisResultSchema.safeParse(decoded);

    if (!analysis.success) {
      throw new Error("Invalid TOON structure returned");
    }

    return analysis.data;
  } catch (error) {
    console.error("TOON Parsing Error:", error);
    console.error("Raw Response:", text);
    throw new Error("Failed to parse AI response");
  }
};
