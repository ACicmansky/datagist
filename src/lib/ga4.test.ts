import { google } from "googleapis";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchReportData } from "./ga4";

// Mock googleapis
vi.mock("googleapis", () => {
  const setCredentialsMock = vi.fn();
  const OAuth2 = vi.fn(function () {
    return {
      setCredentials: setCredentialsMock,
    };
  });

  const runReportMock = vi.fn();
  const analyticsDataMock = {
    properties: {
      runReport: runReportMock,
    },
  };

  return {
    google: {
      auth: {
        OAuth2,
      },
      analyticsdata: vi.fn(() => analyticsDataMock),
    },
  };
});

describe("GA4 Fetcher", () => {
  const refreshToken = "test-refresh-token";
  const propertyId = "properties/123456";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
  });

  it("fetchReportData should call runReport 3 times with correct parameters", async () => {
    const analyticsData = google.analyticsdata({ version: "v1beta" });
    const runReportMock = analyticsData.properties.runReport as unknown as ReturnType<typeof vi.fn>;

    // Mock 3 responses
    runReportMock
      .mockResolvedValueOnce({
        data: {
          totals: [{ metricValues: [{ value: "100" }, { value: "120" }, { value: "0.5" }] }],
        },
      })
      .mockResolvedValueOnce({
        data: {
          rows: [
            { dimensionValues: [{ value: "/home" }], metricValues: [{ value: "50" }] },
            { dimensionValues: [{ value: "/blog" }], metricValues: [{ value: "30" }] },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          rows: [
            { dimensionValues: [{ value: "Organic Search" }], metricValues: [{ value: "80" }] },
            { dimensionValues: [{ value: "Direct" }], metricValues: [{ value: "20" }] },
          ],
        },
      });

    await fetchReportData(refreshToken, propertyId);

    expect(runReportMock).toHaveBeenCalledTimes(3);

    // Check 1st call (Overview)
    expect(runReportMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        requestBody: expect.objectContaining({
          metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "bounceRate" }],
        }),
      })
    );

    // Check 2nd call (Top Content)
    expect(runReportMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        requestBody: expect.objectContaining({
          dimensions: [{ name: "pagePath" }],
          limit: 5,
        }),
      })
    );

    // Check 3rd call (Top Sources)
    expect(runReportMock).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        requestBody: expect.objectContaining({
          dimensions: [{ name: "sessionDefaultChannelGroup" }],
          limit: 5,
        }),
      })
    );
  });

  it("fetchReportData should return enriched structured data", async () => {
    const analyticsData = google.analyticsdata({ version: "v1beta" });
    const runReportMock = analyticsData.properties.runReport as unknown as ReturnType<typeof vi.fn>;

    runReportMock
      .mockResolvedValueOnce({
        data: {
          totals: [{ metricValues: [{ value: "100" }, { value: "120" }, { value: "0.5" }] }],
        },
      })
      .mockResolvedValueOnce({
        data: {
          rows: [{ dimensionValues: [{ value: "/home" }], metricValues: [{ value: "50" }] }],
        },
      })
      .mockResolvedValueOnce({
        data: {
          rows: [
            { dimensionValues: [{ value: "Organic Search" }], metricValues: [{ value: "80" }] },
          ],
        },
      });

    const result = await fetchReportData(refreshToken, propertyId);

    expect(result).toEqual({
      overview: {
        activeUsers: 100,
        sessions: 120,
        bounceRate: 0.5,
      },
      top_content: [{ pagePath: "/home", activeUsers: 50 }],
      sources: [{ channelGroup: "Organic Search", activeUsers: 80 }],
    });
  });
});
