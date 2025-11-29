import { google } from "googleapis";
import { getAuthClient } from "./google";

export interface GA4ReportData {
  totals: {
    activeUsers: number;
    sessions: number;
    screenPageViews: number;
    engagementRate: number;
  };
  rows: {
    channelGroup: string;
    activeUsers: number;
    sessions: number;
    screenPageViews: number;
    engagementRate: number;
  }[];
}

export const fetchReportData = async (
  refreshToken: string,
  gaPropertyId: string
): Promise<GA4ReportData> => {
  const auth = getAuthClient(refreshToken);
  const analyticsData = google.analyticsdata({ version: "v1beta", auth });

  const response = await analyticsData.properties.runReport({
    property: gaPropertyId,
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

  const totals = response.data.totals?.[0]?.metricValues;
  const rows = response.data.rows;

  const parseMetric = (value: string | null | undefined) => (value ? Number.parseFloat(value) : 0);

  return {
    totals: {
      activeUsers: parseMetric(totals?.[0]?.value),
      sessions: parseMetric(totals?.[1]?.value),
      screenPageViews: parseMetric(totals?.[2]?.value),
      engagementRate: parseMetric(totals?.[3]?.value),
    },
    rows: (rows || []).map((row) => ({
      channelGroup: row.dimensionValues?.[0]?.value || "Unknown",
      activeUsers: parseMetric(row.metricValues?.[0]?.value),
      sessions: parseMetric(row.metricValues?.[1]?.value),
      screenPageViews: parseMetric(row.metricValues?.[2]?.value),
      engagementRate: parseMetric(row.metricValues?.[3]?.value),
    })),
  };
};
