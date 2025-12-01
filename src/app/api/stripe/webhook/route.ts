import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";

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

    // Use Service Role Key to bypass RLS
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase URL or Service Role Key");
      return new NextResponse("Missing Supabase URL or Service Role Key", { status: 500 });
    }
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Update profile
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        subscription_tier: "pro",
        stripe_subscription_id: subscriptionId as string,
        stripe_customer_id: session.customer as string,
      })
      .eq("id", userId);

    if (error) {
      console.error("Error updating profile in Supabase:", error);
      return new NextResponse("Database update failed", { status: 500 });
    }

    console.log(`Successfully updated profile for user ${userId} to PRO.`);
  }

  return new NextResponse(null, { status: 200 });
}
