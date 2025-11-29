"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { listGA4Properties } from "@/lib/google";
import type { CreatePropertyInput, ReportSettings } from "@/lib/validations/schemas";
import { PropertySchema, ReportSettingsSchema } from "@/lib/validations/schemas";
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
  } catch (error: any) {
    console.error("Failed to list GA4 properties:", error);
    if (error.response) {
      console.error("Error Response Data:", JSON.stringify(error.response.data, null, 2));
    }
    return { error: "Failed to fetch properties from Google Analytics." };
  }
}

export async function savePropertyConfiguration(
  propertyData: CreatePropertyInput,
  settingsData: ReportSettings
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Validate inputs
  const propertyValidation = PropertySchema.safeParse(propertyData);
  const settingsValidation = ReportSettingsSchema.safeParse(settingsData);

  if (!propertyValidation.success || !settingsValidation.success) {
    return { error: "Invalid input data." };
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
