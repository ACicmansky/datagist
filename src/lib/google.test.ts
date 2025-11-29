import { google } from "googleapis";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAuthClient, listGA4Properties } from "./google";

// Mock googleapis
vi.mock("googleapis", () => {
  const setCredentialsMock = vi.fn();

  // Mock OAuth2 as a function that returns the mock client
  // This allows us to spy on the constructor call
  // biome-ignore lint/complexity/useArrowFunction: Must be a regular function to be constructible
  const OAuth2 = vi.fn(function () {
    return {
      setCredentials: setCredentialsMock,
    };
  });

  const listMock = vi.fn();
  const analyticsAdminMock = {
    accountSummaries: {
      list: listMock,
    },
  };

  return {
    google: {
      auth: {
        OAuth2,
      },
      analyticsadmin: vi.fn(() => analyticsAdminMock),
    },
  };
});

describe("Google API Helper", () => {
  const refreshToken = "test-refresh-token";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
  });

  it("getAuthClient should initialize OAuth2 client with correct credentials", () => {
    const client = getAuthClient(refreshToken);

    expect(google.auth.OAuth2).toHaveBeenCalledWith("test-client-id", "test-client-secret");

    // Check if setCredentials was called on the instance
    expect(client.setCredentials).toHaveBeenCalledWith({
      refresh_token: refreshToken,
    });
  });

  it("listGA4Properties should return a list of properties", async () => {
    const mockResponse = {
      data: {
        accountSummaries: [
          {
            propertySummaries: [
              { displayName: "Prop 1", property: "properties/123" },
              { displayName: "Prop 2", property: "properties/456" },
            ],
          },
        ],
      },
    };

    // Get the mocked analytics instance to set the return value
    const analyticsAdmin = google.analyticsadmin({ version: "v1beta" });
    // We need to cast to any/unknown to access the mocked method because the type definition doesn't know about the mock
    const listMock = analyticsAdmin.accountSummaries.list as unknown as ReturnType<typeof vi.fn>;
    listMock.mockResolvedValue(mockResponse);

    const properties = await listGA4Properties(refreshToken);

    expect(properties).toEqual([
      { name: "Prop 1", id: "properties/123" },
      { name: "Prop 2", id: "properties/456" },
    ]);
  });

  it("listGA4Properties should handle empty response", async () => {
    const mockResponse = {
      data: {},
    };

    const analyticsAdmin = google.analyticsadmin({ version: "v1beta" });
    const listMock = analyticsAdmin.accountSummaries.list as unknown as ReturnType<typeof vi.fn>;
    listMock.mockResolvedValue(mockResponse);

    const properties = await listGA4Properties(refreshToken);

    expect(properties).toEqual([]);
  });
});
