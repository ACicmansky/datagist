import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loginWithGoogle } from "./actions";

// Mock dependencies
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

const mockSignInWithOAuth = vi.fn();
const mockSupabase = {
  auth: {
    signInWithOAuth: mockSignInWithOAuth,
  },
};

vi.mock("@/utils/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

describe("loginWithGoogle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should redirect to the provider URL on success", async () => {
    const mockUrl = "https://accounts.google.com/o/oauth2/auth?...";
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: mockUrl },
      error: null,
    });

    await loginWithGoogle();

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: expect.stringContaining("/auth/callback"),
        scopes: "https://www.googleapis.com/auth/analytics.readonly",
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    expect(redirect).toHaveBeenCalledWith(mockUrl);
  });

  it("should redirect to error page on failure", async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: null },
      error: { message: "OAuth error" },
    });

    await loginWithGoogle();

    expect(redirect).toHaveBeenCalledWith("/error?message=Could not authenticate with Google");
  });
});
