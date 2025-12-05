"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createCheckoutSession, createCustomerPortalSession, stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { CreateReportSettingsInput, CreateReportSettingsSchema } from "@/lib/validations/schemas";
import { createClient } from "@/utils/supabase/server";

export async function deleteUserAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // 1. Fetch Profile to get Stripe Customer ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  // 2. Delete Stripe Customer (if exists)
  if (profile?.stripe_customer_id) {
    try {
      await stripe.customers.del(profile.stripe_customer_id);
    } catch (error) {
      console.error("Error deleting Stripe customer:", error);
      // Continue execution - we still want to delete the Supabase user
      // even if Stripe fails (or maybe they were already deleted)
    }
  }

  // 3. Delete Supabase User
  // We need the Service Role key to delete a user from auth.users
  // The standard client cannot delete itself usually, or we use the admin API.
  const supabaseAdmin = createAdminClient();
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error("Error deleting Supabase user:", deleteError);
    throw new Error("Failed to delete account");
  }

  // 4. Sign out (just in case)
  await supabase.auth.signOut();

  return { success: true };
}

export async function startSubscription(priceId: string) {
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
    if (!priceId) {
      throw new Error("Price ID is required.");
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
