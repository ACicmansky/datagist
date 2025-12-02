"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
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
  const supabaseAdmin = await createAdminClient();
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error("Error deleting Supabase user:", deleteError);
    throw new Error("Failed to delete account");
  }

  // 4. Sign out (just in case)
  await supabase.auth.signOut();

  return { success: true };
}

async function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
