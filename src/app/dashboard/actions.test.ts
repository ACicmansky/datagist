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

vi.mock("@/lib/services/report-generator", () => ({
  processReportForProperty: vi.fn(),
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
    it("should call processReportForProperty", async () => {
      const { generateManualReport } = await import("./actions");
      const { processReportForProperty } = await import("@/lib/services/report-generator");

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user1", email: "test@example.com" } },
      });

      // Mock property fetch (ownership check)
      const mockSelectProperty = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: "prop1" }, error: null }),
          }),
        }),
      });

      mockSupabase.from.mockImplementation((_table: string) => {
        if (_table === "properties")
          return { select: mockSelectProperty, upsert: vi.fn(), insert: vi.fn() };
        return { select: vi.fn(), upsert: vi.fn(), insert: vi.fn() };
      });

      vi.mocked(processReportForProperty).mockResolvedValue({ success: true });

      const result = await generateManualReport("prop1");

      expect(result).toEqual({ success: true });
      expect(processReportForProperty).toHaveBeenCalledWith("prop1", "user1");
    });
  });
});
