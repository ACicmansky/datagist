import { google } from "googleapis";
import { getAuthClient } from "./google";

export interface EnrichedReportData {
  overview: {
    activeUsers: number;
    sessions: number;
    bounceRate: number;
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

  const [overviewResponse, topContentResponse, sourcesResponse] = await Promise.all([
    // 1. Overview Metrics
    analyticsData.properties.runReport({
      property: gaPropertyId,
      requestBody: {
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "bounceRate" }],
      },
    }),
    // 2. Top Content
    analyticsData.properties.runReport({
      property: gaPropertyId,
      requestBody: {
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "activeUsers" }],
        limit: "5",
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      },
    }),
    // 3. Top Sources
    analyticsData.properties.runReport({
      property: gaPropertyId,
      requestBody: {
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "activeUsers" }],
        limit: "5",
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      },
    }),
  ]);

  const parseMetric = (value: string | null | undefined) => (value ? Number.parseFloat(value) : 0);

  const overviewTotals = overviewResponse.data.totals?.[0]?.metricValues;

  return {
    overview: {
      activeUsers: parseMetric(overviewTotals?.[0]?.value),
      sessions: parseMetric(overviewTotals?.[1]?.value),
      bounceRate: parseMetric(overviewTotals?.[2]?.value),
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
