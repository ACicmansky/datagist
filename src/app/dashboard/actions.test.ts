import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreatePropertyInput, CreateReportSettingsInput } from "@/lib/validations/schemas";
import { getPropertiesAction, savePropertyConfiguration } from "./actions";

// Mock dependencies
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/google", () => ({
  listGA4Properties: vi.fn(),
}));

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn((_table: string) => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
    upsert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
  })),
};

vi.mock("@/lib/email", () => ({
  sendReportEmail: vi.fn(),
}));

vi.mock("@/lib/ai", () => ({
  generateInsight: vi.fn(),
}));

vi.mock("@/lib/ga4", () => ({
  fetchReportData: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

describe("Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPropertiesAction", () => {
    it("should redirect if no user", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      try {
        await getPropertiesAction();
      } catch {
        // redirect throws
      }

      expect(redirect).toHaveBeenCalledWith("/login");
    });

    it("should return error if no refresh token", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user1" } } });

      // Mock profile query response
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });
      const mockUpsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn(),
        }),
      });
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn(),
        }),
      });
      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        upsert: mockUpsert,
        insert: mockInsert,
      });

      const result = await getPropertiesAction();
      expect(result).toEqual({ error: "No Google account connected. Please reconnect." });
    });
  });

  describe("savePropertyConfiguration", () => {
    it("should validate input", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user1" } } });

      const result = await savePropertyConfiguration(
        { property_id: "", property_name: "" } as unknown as CreatePropertyInput,
        {
          frequency: "weekly",
          complexity_level: "simple",
          include_recommendations: true,
        } as unknown as CreateReportSettingsInput
      );

      expect(result).toEqual({ error: expect.stringContaining("Invalid input data") });
    });
  });

  describe("generateManualReport", () => {
    it("should generate report and send email", async () => {
      const { generateManualReport } = await import("./actions");
      const { fetchReportData } = await import("@/lib/ga4");
      const { generateInsight } = await import("@/lib/ai");
      const { sendReportEmail } = await import("@/lib/email");

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user1", email: "test@example.com" } },
      });

      // Mock property fetch
      const mockSelectProperty = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi
              .fn()
              .mockResolvedValue({ data: { id: "prop1", ga_property_id: "ga1" }, error: null }),
          }),
        }),
      });

      // Mock profile fetch
      const mockSelectProfile = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { google_refresh_token: "refresh1", subscription_tier: "pro" },
            error: null,
          }),
        }),
      });

      // Mock insert
      const mockInsertFn = vi.fn().mockResolvedValue({ error: null });

      mockSupabase.from.mockImplementation((_table: string) => {
        if (_table === "properties")
          return { select: mockSelectProperty, upsert: vi.fn(), insert: vi.fn() };
        if (_table === "profiles")
          return { select: mockSelectProfile, upsert: vi.fn(), insert: vi.fn() };
        if (_table === "reports") return { insert: mockInsertFn, select: vi.fn(), upsert: vi.fn() };
        return { select: vi.fn(), upsert: vi.fn(), insert: vi.fn() };
      });

      vi.mocked(fetchReportData as any).mockResolvedValue({ overview: {} });
      (generateInsight as any).mockResolvedValue({
        summary: "Summary",
        key_findings: ["Finding 1"],
        top_performing_page: "/home",
        strategic_recommendation: "Rec",
      });

      const result = await generateManualReport("prop1");

      expect(result).toEqual({ success: true });
      expect(fetchReportData).toHaveBeenCalledWith("refresh1", "ga1");
      expect(generateInsight).toHaveBeenCalledWith({ overview: {} }, "pro");
      // renderReportHtml will be called internally, and sendReportEmail will receive the HTML
      // Since we didn't mock renderReportHtml explicitly in the test file (it's imported dynamically in the action),
      // we rely on the integration or mock it if we want to be strict.
      // However, sendReportEmail should receive *some* string.
      expect(sendReportEmail).toHaveBeenCalledWith(
        "test@example.com",
        expect.stringContaining("<h1>Monthly Report</h1>")
      );
      expect(mockInsertFn).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "generated",
          ai_summary_html: expect.stringContaining("<h1>Monthly Report</h1>"),
        })
      );
    });
  });
});
