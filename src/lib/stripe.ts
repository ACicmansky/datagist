import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-11-17.clover" as any, // Cast to any to avoid strict type checking issues if types are mismatched
  typescript: true,
});

export async function createCheckoutSession(
  userId: string,
  email: string,
  priceId: string,
  returnUrl: string
) {
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    customer_email: email,
    metadata: {
      supabase_user_id: userId,
    },
    success_url: `${returnUrl}?success=true`,
    cancel_url: `${returnUrl}?canceled=true`,
  });

  return session;
}

export async function createCustomerPortalSession(customerId: string, returnUrl: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

export function getTierByPriceId(priceId: string): "free" | "pro" | "max" {
  if (priceId === process.env.STRIPE_PRICE_ID_PRO) {
    return "pro";
  }
  if (priceId === process.env.STRIPE_PRICE_ID_MAX) {
    return "max";
  }
  return "free";
}
