import { google } from "googleapis";

export const getAuthClient = (refreshToken: string) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return oauth2Client;
};

export const listGA4Properties = async (refreshToken: string) => {
  const auth = getAuthClient(refreshToken);
  const analyticsAdmin = google.analyticsadmin({ version: "v1beta", auth });

  // Use accountSummaries to get a hierarchical view which is often easier to parse for properties
  // or we can list properties directly if we know the account.
  // The prompt suggests: "List account summaries and return a mapped array of { name: string, id: string }"

  const response = await analyticsAdmin.accountSummaries.list();

  const properties: { name: string; id: string }[] = [];

  if (response.data.accountSummaries) {
    for (const account of response.data.accountSummaries) {
      if (account.propertySummaries) {
        for (const property of account.propertySummaries) {
          if (property.property && property.displayName) {
            properties.push({
              name: property.displayName,
              id: property.property, // This is usually 'properties/123456'
            });
          }
        }
      }
    }
  }

  return properties;
};
