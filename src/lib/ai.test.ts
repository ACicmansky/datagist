import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EnrichedReportData } from "./ga4";

// Create mock for generateContent
const generateContentMock = vi.fn();

// Mock @google/genai
vi.mock("@google/genai", () => {
  // biome-ignore lint/complexity/useArrowFunction: Mock constructor
  const GoogleGenAI = vi.fn(function () {
    return {
      models: {
        generateContent: generateContentMock,
      },
    };
  });

  return {
    GoogleGenAI,
  };
});

// Mock @toon-format/toon
vi.mock("@toon-format/toon", () => ({
  encode: vi.fn(() => "mocked-toon-string"),
  decode: vi.fn(() => ({
    analysis: [
      {
        summary: "Executive Summary",
        key_findings: "Finding 1|Finding 2",
        top_performing_page: "/home",
        strategic_recommendation: "Do this.",
      },
    ],
  })),
}));

describe("AI Analyst", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-key";
  });

  it("generateInsight should return structured analysis object", async () => {
    // Import after mocks are set up
    const { generateInsight } = await import("./ai");

    // Setup mock response
    generateContentMock.mockResolvedValue({
      text: `
        \`\`\`toon
        analysis[1]{summary,key_findings,top_performing_page,strategic_recommendation}:
        "Executive Summary","Finding 1|Finding 2","/home","Do this."
        \`\`\`
      `,
    });

    const mockData: EnrichedReportData = {
      overview: { activeUsers: 100, sessions: 120, engagementRate: 0.5 },
      top_content: [],
      sources: [],
    };

    const result = await generateInsight(mockData, "free");

    expect(result).toEqual({
      summary: "Executive Summary",
      key_findings: ["Finding 1", "Finding 2"],
      top_performing_page: "/home",
      strategic_recommendation: "Do this.",
    });

    expect(generateContentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: expect.stringContaining("mocked-toon-string"),
        config: expect.objectContaining({
          systemInstruction: expect.stringContaining("You communicate only in TOON format"),
        }),
      })
    );
  });
});
