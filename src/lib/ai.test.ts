import { GoogleGenAI } from "@google/genai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateInsight } from "./ai";

// Mock @google/genai
vi.mock("@google/genai", () => {
  const generateContentMock = vi.fn();
  const GoogleGenAI = vi.fn(() => ({
    models: {
      generateContent: generateContentMock,
    },
  }));

  return {
    GoogleGenAI,
    Type: {
      STRING: "STRING",
      ARRAY: "ARRAY",
      OBJECT: "OBJECT",
    },
  };
});

describe("AI Analyst", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-api-key";
  });

  it("generateInsight should call Gemini with correct config and return HTML", async () => {
    const ai = new GoogleGenAI({ apiKey: "test" });
    const generateContentMock = ai.models.generateContent as unknown as ReturnType<typeof vi.fn>;

    const mockResponseText = "<h2>Executive Summary</h2><p>Good job.</p>";

    generateContentMock.mockResolvedValue({
      text: mockResponseText,
    });

    const metricsData = {
      overview: { activeUsers: 100, sessions: 120, bounceRate: 0.5 },
      top_content: [],
      sources: [],
    };

    const result = await generateInsight(metricsData, "pro");

    const callArgs = generateContentMock.mock.calls[0][0];
    expect(callArgs.model).toBe("gemini-2.5-flash-lite");
    expect(callArgs.contents).toContain("Analyze this Google Analytics 4 data");
    expect(callArgs.config.systemInstruction).toContain("You are a Senior Data Analyst");
    expect(callArgs.config.responseMimeType).toBeUndefined();
    expect(callArgs.config.responseSchema).toBeUndefined();

    expect(result).toBe(mockResponseText);
  });

  it("generateInsight should strip markdown code blocks", async () => {
    const ai = new GoogleGenAI({ apiKey: "test" });
    const generateContentMock = ai.models.generateContent as unknown as ReturnType<typeof vi.fn>;

    const mockResponseText = "```html\n<h2>Summary</h2>\n```";

    generateContentMock.mockResolvedValue({
      text: mockResponseText,
    });

    const result = await generateInsight(
      {
        overview: { activeUsers: 0, sessions: 0, bounceRate: 0 },
        top_content: [],
        sources: [],
      },
      "free"
    );

    expect(result).toBe("<h2>Summary</h2>");
  });
});
