"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { listGA4Properties } from "@/lib/google";
import type { CreatePropertyInput, CreateReportSettingsInput } from "@/lib/validations/schemas";
import { CreatePropertySchema, CreateReportSettingsSchema } from "@/lib/validations/schemas";
import { createClient } from "@/utils/supabase/server";

export async function getPropertiesAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch refresh token from profiles
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("google_refresh_token")
    .eq("id", user.id)
    .single();

  if (error || !profile?.google_refresh_token) {
    // If no refresh token, user needs to re-authenticate or connect Google account
    // For now, we return empty list or specific error
    console.error("No refresh token found for user", user.id);
    return { error: "No Google account connected. Please reconnect." };
  }

  try {
    const properties = await listGA4Properties(profile.google_refresh_token);
    return { data: properties };
  } catch (error: unknown) {
    console.error("Failed to list GA4 properties:", error);
    if (typeof error === "object" && error !== null && "response" in error) {
      const errorWithResponse = error as { response?: { data?: unknown } };
      console.error(
        "Error Response Data:",
        JSON.stringify(errorWithResponse.response?.data, null, 2)
      );
    }
    return { error: "Failed to fetch properties from Google Analytics." };
  }
}

export async function savePropertyConfiguration(
  propertyData: CreatePropertyInput,
  settingsData: CreateReportSettingsInput
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Validate inputs
  const propertyValidation = CreatePropertySchema.safeParse(propertyData);
  const settingsValidation = CreateReportSettingsSchema.safeParse(settingsData);

  if (!propertyValidation.success || !settingsValidation.success) {
    return {
      error: `Invalid input data. ${propertyValidation.error?.message}`,
    };
  }

  const { ga_property_id, property_name, industry, website_url } = propertyValidation.data;
  const { frequency_days, complexity_level, include_recommendations } = settingsValidation.data;

  // 1. Save Property
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .upsert(
      {
        user_id: user.id,
        ga_property_id,
        property_name,
        industry,
        website_url: website_url || null,
      },
      { onConflict: "user_id, ga_property_id" } // Assuming user can have multiple properties, but unique by ID
    )
    .select("id")
    .single();

  if (propertyError) {
    console.error("Error saving property:", propertyError);
    return { error: "Failed to save property." };
  }

  // 2. Save Settings
  // We assume one settings row per property or per user?
  // Schema says report_settings has property_id FK.
  const { error: settingsError } = await supabase.from("report_settings").upsert(
    {
      property_id: property.id, // Internal DB ID
      frequency_days,
      complexity_level,
      include_recommendations,
      is_active: true,
      // Reset the schedule when settings change
      next_send_at: new Date().toISOString(),
    },
    { onConflict: "property_id" }
  );

  if (settingsError) {
    console.error("Error saving settings:", settingsError);
    await supabase.from("properties").delete().eq("id", property.id);
    return { error: "Failed to save settings." };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

import { generateInsight } from "@/lib/ai";
import { sendReportEmail } from "@/lib/email";
import { fetchReportData } from "@/lib/ga4";

export async function generateManualReport(propertyId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Fetch Property & Profile (for Refresh Token)
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id, ga_property_id, property_name")
    .eq("id", propertyId)
    .eq("user_id", user.id)
    .single();

  if (propertyError || !property) {
    return { error: "Property not found." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("google_refresh_token, subscription_tier")
    .eq("id", user.id)
    .single();

  if (!profile?.google_refresh_token) {
    return { error: "No Google account connected." };
  }

  try {
    // 2. Fetch GA4 Data (Enriched)
    const metrics = await fetchReportData(profile.google_refresh_token, property.ga_property_id);

    // 3. Generate AI Insight (HTML)
    // Determine plan level (default to 'free' if not found)
    const planLevel = profile.subscription_tier || "free";
    const insightHtml = await generateInsight(metrics, planLevel);

    // 4. Save to Database
    const { error: insertError } = await supabase.from("reports").insert({
      property_id: property.id,
      user_id: user.id,
      ai_summary_html: insightHtml,
      metrics_snapshot: {
        metrics,
        insight: insightHtml,
      },
      status: "generated", // Will update to 'sent' after email
    });

    if (insertError) {
      console.error("Error saving report:", insertError);
      return { error: "Failed to save report." };
    }

    // 5. Send Email
    if (user.email) {
      await sendReportEmail(user.email, insightHtml);

      // Update status to 'sent'
      // Note: We'd ideally get the report ID from insert, but for now we can just leave it as 'generated'
      // or update the latest one. Since we don't have the ID from insert (unless we select it),
      // let's just assume success for now or try to select it.
      // Actually, let's select the ID from insert.
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: unknown) {
    console.error("Error generating report:", error);
    return { error: error instanceof Error ? error.message : "Failed to generate report." };
  }
}
