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

  // 0. Guardrails: Check Limits
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();

  const { count } = await supabase
    .from("properties")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const tier = profile?.subscription_tier || "free";
  const currentCount = count || 0;

  // Limit 1: Property Count
  if (tier === "free" && currentCount >= 1) {
    // Check if we are updating an existing property (allow updates)
    const { data: existingProperty } = await supabase
      .from("properties")
      .select("id")
      .eq("user_id", user.id)
      .eq("ga_property_id", ga_property_id)
      .single();

    if (!existingProperty) {
      return {
        error: "Free plan is limited to 1 property. Upgrade to Pro to track multiple sites.",
      };
    }
  }

  // Limit 2: Frequency
  if (tier === "free" && frequency_days < 30) {
    return { error: "Weekly reports are for Pro users only. Free plan is monthly (30 days)." };
  }

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

import { processReportForProperty } from "@/lib/services/report-generator";

export async function generateManualReport(propertyId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Verify Ownership (Security Check)
  // We must ensure the user owns this property before triggering the admin-level service
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id")
    .eq("id", propertyId)
    .eq("user_id", user.id)
    .single();

  if (propertyError || !property) {
    return { error: "Property not found or access denied." };
  }

  try {
    // 2. Call the Service
    await processReportForProperty(propertyId, user.id);

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: unknown) {
    console.error("Error generating report:", error);
    return { error: error instanceof Error ? error.message : "Failed to generate report." };
  }
}

import { createCheckoutSession, createCustomerPortalSession } from "@/lib/stripe";

export async function startSubscription() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .single();

  if (!profile?.email) {
    return { error: "User email not found." };
  }

  try {
    // TODO: Get Price ID from env or constant
    const priceId = process.env.STRIPE_PRO_PRICE_ID;
    if (!priceId) {
      throw new Error("Stripe Price ID is not configured.");
    }

    const returnUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    const session = await createCheckoutSession(
      user.id,
      profile.email,
      priceId,
      `${returnUrl}/dashboard`
    );

    if (!session.url) {
      throw new Error("Failed to create checkout session.");
    }

    redirect(session.url);
  } catch (error: unknown) {
    console.error("Stripe Error:", error);
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error; // Re-throw redirect
    }
    return { error: "Failed to start subscription." };
  }
}

export async function manageSubscription() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return { error: "No billing account found." };
  }

  try {
    const returnUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const session = await createCustomerPortalSession(
      profile.stripe_customer_id,
      `${returnUrl}/dashboard/settings`
    );

    if (!session.url) {
      throw new Error("Failed to create portal session.");
    }

    redirect(session.url);
  } catch (error: unknown) {
    console.error("Stripe Portal Error:", error);
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    return { error: "Failed to open billing portal." };
  }
}

export async function updateReportSettings(
  propertyId: string,
  newSettings: Partial<CreateReportSettingsInput>
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Verify Ownership
  const { data: property } = await supabase
    .from("properties")
    .select("id")
    .eq("id", propertyId)
    .eq("user_id", user.id)
    .single();

  if (!property) {
    return { error: "Property not found or access denied." };
  }

  // 2. Validate Input
  const validation = CreateReportSettingsSchema.partial().safeParse(newSettings);

  if (!validation.success) {
    return { error: `Invalid settings: ${validation.error.message}` };
  }

  // 3. Update Settings
  const { error } = await supabase
    .from("report_settings")
    .update({
      ...validation.data,
    })
    .eq("property_id", propertyId);

  if (error) {
    console.error("Error updating settings:", error);
    return { error: "Failed to update settings." };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteProperty(propertyId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Verify Ownership
  const { data: property } = await supabase
    .from("properties")
    .select("id")
    .eq("id", propertyId)
    .eq("user_id", user.id)
    .single();

  if (!property) {
    return { error: "Property not found or access denied." };
  }

  // 2. Delete Property
  const { error } = await supabase.from("properties").delete().eq("id", propertyId);

  if (error) {
    console.error("Error deleting property:", error);
    return { error: "Failed to delete property." };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
