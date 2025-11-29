import { GoogleGenAI, Type } from "@google/genai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateInsight } from "./ai";

// Mock @google/genai
vi.mock("@google/genai", () => {
  const generateContentMock = vi.fn();
  const GoogleGenAI = vi.fn(() => {
    return {
      models: {
        generateContent: generateContentMock,
      },
    };
  });

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

  it("generateInsight should call Gemini with correct config", async () => {
    const ai = new GoogleGenAI({ apiKey: "test" });
    const generateContentMock = ai.models.generateContent as unknown as ReturnType<typeof vi.fn>;

    const mockResponseText = JSON.stringify({
      summary: "Performance is good.",
      top_source: "Organic Search",
      recommendations: ["Do this", "Do that"],
    });

    generateContentMock.mockResolvedValue({
      text: mockResponseText,
    });

    const metricsData = {
      totals: {
        activeUsers: 100,
        sessions: 50,
        screenPageViews: 200,
        engagementRate: 0.75,
      },
      rows: [],
    };

    await generateInsight(metricsData, "pro");

    const callArgs = generateContentMock.mock.calls[0][0];
    expect(callArgs.model).toBe("gemini-2.5-flash-lite");
    expect(callArgs.contents).toContain("Analyze this Google Analytics 4 data");
    expect(callArgs.config.systemInstruction).toContain("You are a web analytics expert");
    expect(callArgs.config.responseMimeType).toBe("application/json");
    expect(callArgs.config.responseSchema.type).toBe(Type.OBJECT);
  });

  it("generateInsight should parse JSON response correctly", async () => {
    const ai = new GoogleGenAI({ apiKey: "test" });
    const generateContentMock = ai.models.generateContent as unknown as ReturnType<typeof vi.fn>;

    const mockData = {
      summary: "Traffic increased.",
      top_source: "Direct",
      recommendations: ["Optimize SEO"],
    };

    generateContentMock.mockResolvedValue({
      text: JSON.stringify(mockData),
    });

    const result = await generateInsight(
      {
        totals: {
          activeUsers: 0,
          sessions: 0,
          screenPageViews: 0,
          engagementRate: 0,
        },
        rows: [],
      },
      "free"
    );

    expect(result).toEqual(mockData);
  });
});
