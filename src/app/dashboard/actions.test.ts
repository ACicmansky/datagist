import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
  from: vi.fn(() => ({
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
  })),
};

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
      // biome-ignore lint/suspicious/noExplicitAny: Mocking complex chain
      mockSupabase.from.mockReturnValue({ select: mockSelect } as any);

      const result = await getPropertiesAction();
      expect(result).toEqual({ error: "No Google account connected. Please reconnect." });
    });
  });

  describe("savePropertyConfiguration", () => {
    it("should validate input", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user1" } } });

      const result = await savePropertyConfiguration(
        { property_id: "", property_name: "" }, // Invalid
        { frequency: "weekly", complexity_level: "simple", include_recommendations: true }
      );

      expect(result).toEqual({ error: "Invalid input data." });
    });
  });
});
