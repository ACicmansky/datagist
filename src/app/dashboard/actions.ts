"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { listGA4Properties } from "@/lib/google";
import { createClient } from "@/utils/supabase/server";

const PropertySchema = z.object({
  property_id: z.string().min(1, "Property ID is required"),
  property_name: z.string().min(1, "Property Name is required"),
  industry: z.string().optional(),
  website_url: z.string().url().optional().or(z.literal("")),
});

const SettingsSchema = z.object({
  frequency: z.enum(["weekly", "monthly"]),
  complexity_level: z.enum(["simple", "detailed"]),
  include_recommendations: z.boolean(),
});

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
  } catch (error) {
    console.error("Failed to list GA4 properties:", error);
    return { error: "Failed to fetch properties from Google Analytics." };
  }
}

export async function savePropertyConfiguration(
  propertyData: z.infer<typeof PropertySchema>,
  settingsData: z.infer<typeof SettingsSchema>
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
  const settingsValidation = SettingsSchema.safeParse(settingsData);

  if (!propertyValidation.success || !settingsValidation.success) {
    return { error: "Invalid input data." };
  }

  const { property_id, property_name, industry, website_url } = propertyValidation.data;
  const { frequency, complexity_level, include_recommendations } = settingsValidation.data;

  // 1. Save Property
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .upsert(
      {
        user_id: user.id,
        property_id,
        property_name,
        industry,
        website_url: website_url || null,
      },
      { onConflict: "user_id, property_id" } // Assuming user can have multiple properties, but unique by ID
    )
    .select()
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
      user_id: user.id,
      property_id: property.id, // Internal DB ID
      frequency,
      complexity_level,
      include_recommendations,
      is_active: true,
    },
    { onConflict: "property_id" }
  );

  if (settingsError) {
    console.error("Error saving settings:", settingsError);
    return { error: "Failed to save settings." };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
