import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getTierByPriceId, stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("Stripe-Signature") as string;

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Stripe Webhook Secret is missing");
    return new NextResponse("Stripe Webhook Secret is missing", { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Webhook Signature Verification Failed: ${errorMessage}`);
    return new NextResponse(`Webhook Error: ${errorMessage}`, { status: 400 });
  }

  console.log(`Received Stripe Webhook Event: ${event.type}`);

  const session = event.data.object as Stripe.Checkout.Session;

  if (event.type === "checkout.session.completed") {
    const subscriptionId = session.subscription;
    const userId = session.metadata?.supabase_user_id;

    if (!userId) {
      console.error("User ID is missing from session metadata");
      return new NextResponse("User id is missing from metadata", { status: 400 });
    }

    console.log(`Processing subscription for User: ${userId}, Subscription: ${subscriptionId}`);

    // Update profile
    const { error } = await createAdminClient()
      .from("profiles")
      .update({
        stripe_subscription_id: subscriptionId as string,
        stripe_customer_id: session.customer as string,
      })
      .eq("id", userId);

    if (error) {
      console.error("Error updating profile in Supabase:", error);
      return new NextResponse("Database update failed", { status: 500 });
    }

    console.log(`Successfully updated profile for user ${userId}.`);
  }

  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;

    console.log(`Processing subscription update for Customer: ${customerId}`);

    // Find user by stripe_customer_id
    const { data: profile, error: fetchError } = await createAdminClient()
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (fetchError || !profile) {
      console.error("User not found for customer:", customerId);
      return new NextResponse("User not found", { status: 404 });
    }

    const status = subscription.status;
    let tier: "free" | "pro" | "max" = "free";

    if (status === "active" || status === "trialing") {
      const priceId = subscription.items.data[0].price.id;
      tier = getTierByPriceId(priceId);
    } else if (status === "past_due" || status === "unpaid") {
      // Downgrade to free on payment failure
      tier = "free";
    } else {
      // canceled, incomplete, incomplete_expired, paused
      tier = "free";
    }

    const { error: updateError } = await createAdminClient()
      .from("profiles")
      .update({
        subscription_tier: tier,
      })
      .eq("id", profile.id);

    if (updateError) {
      console.error("Error updating profile tier:", updateError);
      return new NextResponse("Database update failed", { status: 500 });
    }

    console.log(`Updated user ${profile.id} tier to ${tier} (Status: ${status})`);
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;

    console.log(`Processing subscription deletion for Customer: ${customerId}`);

    const { data: profile, error: fetchError } = await createAdminClient()
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (fetchError || !profile) {
      console.error("User not found for customer:", customerId);
      return new NextResponse("User not found", { status: 404 });
    }

    const { error: updateError } = await createAdminClient()
      .from("profiles")
      .update({
        subscription_tier: "free",
      })
      .eq("id", profile.id);

    if (updateError) {
      console.error("Error updating profile tier:", updateError);
      return new NextResponse("Database update failed", { status: 500 });
    }

    console.log(`Downgraded user ${profile.id} to free (Subscription deleted)`);
  }

  return new NextResponse(null, { status: 200 });
}
