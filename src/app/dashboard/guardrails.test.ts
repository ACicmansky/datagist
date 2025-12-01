import { beforeEach, describe, expect, it, vi } from "vitest";
import { savePropertyConfiguration } from "./actions";

// Mock Supabase
const mockSupabase = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
  upsert: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/services/report-generator", () => ({
  processReportForProperty: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  createCheckoutSession: vi.fn(),
}));

describe("savePropertyConfiguration Guardrails", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup getUser
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-123" } } });

    // Default setup: Free tier, 0 properties
    mockSupabase.select.mockImplementation((query) => {
      if (query === "subscription_tier")
        return { single: vi.fn().mockResolvedValue({ data: { subscription_tier: "free" } }) };
      if (query === "id") return { single: vi.fn().mockResolvedValue({ data: null }) }; // Existing property check
      return { single: vi.fn().mockResolvedValue({ data: null }) };
    });
    // Mock count query specifically
    mockSupabase.from.mockImplementation((table) => {
      if (table === "properties") {
        return {
          select: vi.fn().mockImplementation((cols, opts) => {
            if (opts?.count === "exact") {
              return { eq: vi.fn().mockResolvedValue({ count: 0 }) };
            }
            return {
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: null }),
            };
          }),
          upsert: vi.fn().mockImplementation(() => ({
            select: vi.fn().mockImplementation(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: "prop-123" } }),
            })),
          })),
          delete: vi.fn().mockReturnThis(),
        };
      }
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { subscription_tier: "free" } }),
        };
      }
      return mockSupabase;
    });
  });

  it("should allow free user to create first property", async () => {
    // Explicitly mock for this test to avoid beforeEach complexity
    mockSupabase.from.mockImplementation((table) => {
      if (table === "properties") {
        return {
          select: vi.fn().mockImplementation((cols, opts) => {
            if (opts?.count === "exact") {
              return { eq: vi.fn().mockResolvedValue({ count: 0 }) };
            }
            return {
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: null }),
            };
          }),
          upsert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: "prop-123" } }),
            }),
          }),
          delete: vi.fn().mockReturnThis(),
        };
      }
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { subscription_tier: "free" } }),
        };
      }
      if (table === "report_settings") {
        return { upsert: vi.fn().mockReturnThis() };
      }
      return mockSupabase;
    });

    const result = await savePropertyConfiguration(
      {
        ga_property_id: "123",
        property_name: "Test Prop",
        industry: "Tech",
        website_url: "https://example.com",
      },
      {
        frequency_days: 30,
        complexity_level: "simple",
        include_recommendations: false,
      }
    );

    expect(result).toEqual({ success: true });
  });

  it("should prevent free user from creating second property", async () => {
    // Mock that user already has 1 property
    mockSupabase.from.mockImplementation((table) => {
      if (table === "properties") {
        return {
          select: vi.fn().mockImplementation((cols, opts) => {
            if (opts?.count === "exact") {
              return { eq: vi.fn().mockResolvedValue({ count: 1 }) };
            }
            // Existing property check returns null (meaning this is a NEW property)
            return {
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: null }),
            };
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { subscription_tier: "free" } }),
        };
      }
      return mockSupabase;
    });

    const result = await savePropertyConfiguration(
      {
        ga_property_id: "456", // Different ID
        property_name: "Prop 2",
        industry: "Tech",
        website_url: "https://example.com",
      },
      {
        frequency_days: 30,
        complexity_level: "simple",
        include_recommendations: false,
      }
    );

    expect(result).toHaveProperty("error");
    expect(result.error).toContain("Upgrade to Pro");
  });

  it("should prevent free user from setting weekly frequency", async () => {
    const result = await savePropertyConfiguration(
      {
        ga_property_id: "123",
        property_name: "Test Prop",
        industry: "Tech",
        website_url: "https://example.com",
      },
      {
        frequency_days: 7, // Invalid for free
        complexity_level: "simple",
        include_recommendations: false,
      }
    );

    expect(result).toHaveProperty("error");
    expect(result.error).toContain("Weekly reports are for Pro users only");
  });

  it("should allow pro user to create second property", async () => {
    // Mock Pro user
    mockSupabase.from.mockImplementation((table) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { subscription_tier: "pro" } }),
        };
      }
      if (table === "properties") {
        return {
          select: vi.fn().mockImplementation((cols, opts) => {
            if (opts?.count === "exact") {
              return { eq: vi.fn().mockResolvedValue({ count: 1 }) };
            }
            return {
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: null }),
            };
          }),
          upsert: vi.fn().mockImplementation(() => ({
            select: vi.fn().mockImplementation(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: "prop-456" } }),
            })),
          })),
        };
      }
      // Report settings upsert
      if (table === "report_settings") {
        return { upsert: vi.fn().mockReturnThis() };
      }
      return mockSupabase;
    });

    const result = await savePropertyConfiguration(
      {
        ga_property_id: "456",
        property_name: "Prop 2",
        industry: "Tech",
        website_url: "https://example.com",
      },
      {
        frequency_days: 30,
        complexity_level: "simple",
        include_recommendations: false,
      }
    );

    expect(result).toEqual({ success: true });
  });
});
