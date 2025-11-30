import { google } from "googleapis";
import { getAuthClient } from "./google";

export interface EnrichedReportData {
  overview: {
    activeUsers: number;
    sessions: number;
    engagementRate: number;
  };
  top_content: {
    pagePath: string;
    activeUsers: number;
  }[];
  sources: {
    channelGroup: string;
    activeUsers: number;
  }[];
}

export const fetchReportData = async (
  refreshToken: string,
  gaPropertyId: string
): Promise<EnrichedReportData> => {
  const auth = getAuthClient(refreshToken);
  const analyticsData = google.analyticsdata({ version: "v1beta", auth });

  // Step 1: Get Totals (The Overview)
  const overviewResponse = await analyticsData.properties.runReport({
    property: gaPropertyId,
    requestBody: {
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "engagementRate" }],
      dimensions: [], // CRITICAL: dimensions must be an empty array
    },
  });

  // Step 2: Get Top Pages
  const topContentResponse = await analyticsData.properties.runReport({
    property: gaPropertyId,
    requestBody: {
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "activeUsers" }],
      limit: "5",
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
    },
  });

  // Step 3: Get Top Sources
  const sourcesResponse = await analyticsData.properties.runReport({
    property: gaPropertyId,
    requestBody: {
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "activeUsers" }],
      limit: "5",
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
    },
  });

  const parseMetric = (value: string | null | undefined) => (value ? Number.parseFloat(value) : 0);

  // Parse Step 1: The API will return exactly one row. Extract the values from that single row.
  const overviewRow = overviewResponse.data.rows?.[0]?.metricValues;

  return {
    overview: {
      activeUsers: parseMetric(overviewRow?.[0]?.value),
      sessions: parseMetric(overviewRow?.[1]?.value),
      engagementRate: parseMetric(overviewRow?.[2]?.value),
    },
    top_content: (topContentResponse.data.rows || []).map((row) => ({
      pagePath: row.dimensionValues?.[0]?.value || "Unknown",
      activeUsers: parseMetric(row.metricValues?.[0]?.value),
    })),
    sources: (sourcesResponse.data.rows || []).map((row) => ({
      channelGroup: row.dimensionValues?.[0]?.value || "Unknown",
      activeUsers: parseMetric(row.metricValues?.[0]?.value),
    })),
  };
};
