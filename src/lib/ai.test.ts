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
    summary: "Executive Summary",
    key_findings: ["Finding 1", "Finding 2", "Finding 3"],
    top_performing_page: "/home",
    strategic_recommendation: "Do this.",
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

    // Setup mock response matching the new TOON format with tabs
    generateContentMock.mockResolvedValue({
      text: `
        \`\`\`toon
        summary: Executive Summary
        key_findings[3\t]: Finding 1\tFinding 2\tFinding 3
        top_performing_page: /home
        strategic_recommendation: Do this.
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
      key_findings: ["Finding 1", "Finding 2", "Finding 3"],
      top_performing_page: "/home",
      strategic_recommendation: "Do this.",
    });

    expect(generateContentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-2.5-flash-lite",
        contents: expect.stringContaining("mocked-toon-string"),
        config: expect.objectContaining({
          systemInstruction: expect.stringContaining("Lead Digital Intelligence Unit"),
        }),
      })
    );
  });

  it("generateInsight should accept numberOfDays parameter", async () => {
    const { generateInsight } = await import("./ai");

    generateContentMock.mockResolvedValue({
      text: `
        \`\`\`toon
        summary: 7-day Summary
        key_findings[3\t]: Finding A\tFinding B\tFinding C
        top_performing_page: /landing
        strategic_recommendation: Short-term advice.
        \`\`\`
      `,
    });

    const mockData: EnrichedReportData = {
      overview: { activeUsers: 50, sessions: 60, engagementRate: 0.7 },
      top_content: [],
      sources: [],
    };

    await generateInsight(mockData, "pro", 7);

    expect(generateContentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          systemInstruction: expect.stringContaining("Last **7** days"),
        }),
      })
    );
  });

  it("generateInsight should enable grounding for pro plan", async () => {
    const { generateInsight } = await import("./ai");

    generateContentMock.mockResolvedValue({
      text: `
        \`\`\`toon
        summary: Pro Summary
        key_findings[3\t]: Finding 1\tFinding 2\tFinding 3
        top_performing_page: /home
        strategic_recommendation: Pro advice.
        \`\`\`
      `,
    });

    const mockData: EnrichedReportData = {
      overview: { activeUsers: 100, sessions: 120, engagementRate: 0.5 },
      top_content: [],
      sources: [],
    };

    await generateInsight(mockData, "pro");

    expect(generateContentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          tools: [{ googleSearch: {} }],
          systemInstruction: expect.stringContaining("GROUNDING INSTRUCTION"),
        }),
      })
    );
  });

  it("generateInsight should NOT enable grounding for free plan", async () => {
    const { generateInsight } = await import("./ai");

    generateContentMock.mockResolvedValue({
      text: `
        \`\`\`toon
        summary: Free Summary
        key_findings[3\t]: Finding 1\tFinding 2\tFinding 3
        top_performing_page: /home
        strategic_recommendation: Free advice.
        \`\`\`
      `,
    });

    const mockData: EnrichedReportData = {
      overview: { activeUsers: 100, sessions: 120, engagementRate: 0.5 },
      top_content: [],
      sources: [],
    };

    await generateInsight(mockData, "free");

    expect(generateContentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          tools: undefined,
        }),
      })
    );

    // Verify system instruction does NOT contain grounding instruction
    const callArgs = generateContentMock.mock.calls[generateContentMock.mock.calls.length - 1][0];
    expect(callArgs.config.systemInstruction).not.toContain("GROUNDING INSTRUCTION");
  });
});
