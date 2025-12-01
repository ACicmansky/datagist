import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("Stripe-Signature") as string;

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return new NextResponse("Stripe Webhook Secret is missing", { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new NextResponse(`Webhook Error: ${errorMessage}`, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (event.type === "checkout.session.completed") {
    const subscriptionId = session.subscription;
    const userId = session.metadata?.supabase_user_id;

    if (!userId) {
      return new NextResponse("User id is missing from metadata", { status: 400 });
    }

    const supabase = await createClient();

    // Update profile
    const { error } = await supabase
      .from("profiles")
      .update({
        subscription_tier: "pro", // Assuming only pro plan for now
        stripe_subscription_id: subscriptionId as string,
        stripe_customer_id: session.customer as string,
      })
      .eq("id", userId);

    if (error) {
      console.error("Error updating profile:", error);
      return new NextResponse("Database update failed", { status: 500 });
    }
  }

  return new NextResponse(null, { status: 200 });
}
