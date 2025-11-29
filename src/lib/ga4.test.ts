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

  it("fetchReportData should call runReport with correct parameters", async () => {
    const analyticsData = google.analyticsdata({ version: "v1beta" });
    const runReportMock = analyticsData.properties.runReport as unknown as ReturnType<typeof vi.fn>;

    runReportMock.mockResolvedValue({
      data: {
        rows: [
          {
            dimensionValues: [{ value: "Organic Search" }],
            metricValues: [
              { value: "100" }, // activeUsers
              { value: "120" }, // sessions
              { value: "500" }, // screenPageViews
              { value: "0.5" }, // engagementRate
            ],
          },
        ],
        totals: [
          {
            metricValues: [
              { value: "1000" },
              { value: "1200" },
              { value: "5000" },
              { value: "0.6" },
            ],
          },
        ],
      },
    });

    await fetchReportData(refreshToken, propertyId);

    expect(runReportMock).toHaveBeenCalledWith({
      property: propertyId,
      requestBody: {
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
          { name: "engagementRate" },
        ],
      },
    });
  });

  it("fetchReportData should return structured data", async () => {
    const analyticsData = google.analyticsdata({ version: "v1beta" });
    const runReportMock = analyticsData.properties.runReport as unknown as ReturnType<typeof vi.fn>;

    runReportMock.mockResolvedValue({
      data: {
        rows: [
          {
            dimensionValues: [{ value: "Organic Search" }],
            metricValues: [{ value: "100" }, { value: "120" }, { value: "500" }, { value: "0.5" }],
          },
          {
            dimensionValues: [{ value: "Direct" }],
            metricValues: [{ value: "50" }, { value: "60" }, { value: "200" }, { value: "0.4" }],
          },
        ],
        totals: [
          {
            metricValues: [
              { value: "150" }, // Total activeUsers
              { value: "180" }, // Total sessions
              { value: "700" }, // Total screenPageViews
              { value: "0.45" }, // Avg engagementRate
            ],
          },
        ],
      },
    });

    const result = await fetchReportData(refreshToken, propertyId);

    expect(result).toEqual({
      totals: {
        activeUsers: 150,
        sessions: 180,
        screenPageViews: 700,
        engagementRate: 0.45,
      },
      rows: [
        {
          channelGroup: "Organic Search",
          activeUsers: 100,
          sessions: 120,
          screenPageViews: 500,
          engagementRate: 0.5,
        },
        {
          channelGroup: "Direct",
          activeUsers: 50,
          sessions: 60,
          screenPageViews: 200,
          engagementRate: 0.4,
        },
      ],
    });
  });
});
