import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";

// Mock dependencies
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
};

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => mockSupabase),
}));

// Mock NextRequest and NextResponse
const mockNextResponse = {
  cookies: {
    set: vi.fn(),
  },
} as any;

vi.mock("next/server", () => ({
  NextResponse: {
    next: vi.fn(() => mockNextResponse),
    redirect: vi.fn((url) => ({ status: 307, headers: { Location: url.toString() } })),
  },
}));

describe("Proxy Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should redirect to /login if visiting /dashboard without user", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const request = {
      nextUrl: { pathname: "/dashboard" },
      url: "http://localhost:3000/dashboard",
      cookies: { getAll: vi.fn(() => []) },
    } as any;

    const response = await proxy(request);
    // @ts-ignore
    expect(response.headers.Location).toBe("http://localhost:3000/login");
  });

  it("should redirect to /dashboard if visiting /login with user", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user1" } } });

    const request = {
      nextUrl: { pathname: "/login" },
      url: "http://localhost:3000/login",
      cookies: { getAll: vi.fn(() => []) },
    } as any;

    const response = await proxy(request);
    // @ts-ignore
    expect(response.headers.Location).toBe("http://localhost:3000/dashboard");
  });

  it("should allow access to public pages", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

    const request = {
      nextUrl: { pathname: "/" },
      url: "http://localhost:3000/",
      cookies: { getAll: vi.fn(() => []) },
    } as any;

    const response = await proxy(request);
    expect(NextResponse.next).toHaveBeenCalled();
    expect(response).toBe(mockNextResponse);
  });
});
