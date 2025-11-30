import { createClient } from "@supabase/supabase-js";
import { generateInsight } from "@/lib/ai";
import { sendReportEmail } from "@/lib/email";
import { fetchReportData } from "@/lib/ga4";
import { renderEmailTemplate } from "@/lib/renderers/email-renderer";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables for admin client");
}

// Create a Supabase client with the Service Role Key to bypass RLS.
// This is necessary because this function runs in a background cron job where no user session exists.
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function processReportForProperty(propertyId: string, userId: string) {
  console.log(`Processing report for property: ${propertyId}, user: ${userId}`);

  // 1. Fetch Property & Profile (for Refresh Token)
  // We use the admin client to bypass RLS
  const { data: property, error: propertyError } = await supabaseAdmin
    .from("properties")
    .select("id, ga_property_id, property_name")
    .eq("id", propertyId)
    .eq("user_id", userId)
    .single();

  if (propertyError || !property) {
    console.error(`Property not found: ${propertyId}`, propertyError);
    throw new Error("Property not found");
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("google_refresh_token, subscription_tier, email")
    .eq("id", userId)
    .single();

  if (!profile?.google_refresh_token) {
    console.error(`No refresh token for user: ${userId}`);
    // Update connection status to error
    await supabaseAdmin
      .from("properties")
      .update({ connection_status: "error" })
      .eq("id", propertyId);
    throw new Error("No Google account connected");
  }

  try {
    // 2. Fetch GA4 Data (Enriched)
    const metrics = await fetchReportData(profile.google_refresh_token, property.ga_property_id);

    // 3. Generate AI Insight (Structured Object)
    const planLevel = profile.subscription_tier || "free";
    const analysis = await generateInsight(metrics, planLevel);

    // 4. Render HTML for Email
    const insightHtml = renderEmailTemplate(analysis);

    // 5. Save to Database
    const { error: insertError } = await supabaseAdmin.from("reports").insert({
      property_id: property.id,
      user_id: userId,
      ai_summary_html: insightHtml,
      ai_result: analysis,
      metrics_snapshot: {
        metrics,
      },
      status: "generated",
    });

    if (insertError) {
      console.error("Error saving report:", insertError);
      throw new Error("Failed to save report");
    }

    // 6. Send Email
    if (profile.email) {
      await sendReportEmail(profile.email, insightHtml);

      // Update status to 'sent' (optional, but good practice)
    }

    // 7. Update connection status to 'connected' if it was previously error
    await supabaseAdmin
      .from("properties")
      .update({ connection_status: "connected" })
      .eq("id", propertyId);

    return { success: true };
  } catch (error: unknown) {
    console.error("Error generating report:", error);

    // Check for specific Auth errors (invalid_grant)
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Safe check for axios-like error response structure
    let isInvalidGrantInResponse = false;
    if (typeof error === "object" && error !== null && "response" in error) {
      const errObj = error as { response?: { data?: { error?: string } } };
      if (errObj.response?.data?.error === "invalid_grant") {
        isInvalidGrantInResponse = true;
      }
    }

    const isAuthError =
      errorMessage.includes("invalid_grant") ||
      errorMessage.includes("unauthorized_client") ||
      isInvalidGrantInResponse;

    if (isAuthError) {
      console.error(`Auth error detected for property ${propertyId}. Updating status.`);
      await supabaseAdmin
        .from("properties")
        .update({ connection_status: "error" })
        .eq("id", propertyId);
    }

    throw error; // Re-throw so the caller knows it failed
  }
}
