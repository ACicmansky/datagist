# 2025-12-03: Stripe Webhook Hardening

## Summary
Hardened the Stripe Webhook handler (`app/api/stripe/webhook/route.ts`) to correctly manage subscription lifecycle events, ensuring users are assigned the correct tier ('free', 'pro', 'max') and downgraded appropriately upon cancellation or payment failure.

## Key Changes

### 1. Helper Logic (`lib/stripe.ts`)
- Added `getTierByPriceId(priceId: string)` helper function.
- Maps Stripe Price IDs (from env vars) to internal subscription tiers.
- Default safety fallback to 'free'.

### 2. Webhook Handler (`app/api/stripe/webhook/route.ts`)
- **`checkout.session.completed`**:
    - Links `stripe_customer_id` and `stripe_subscription_id` to the user profile.
    - Does *not* set the tier immediately (relies on `updated` event to avoid race conditions).
- **`customer.subscription.updated`**:
    - Listens for status changes.
    - **Active/Trialing**: Updates `subscription_tier` based on Price ID.
    - **Past Due/Unpaid**: Downgrades `subscription_tier` to 'free'.
- **`customer.subscription.deleted`**:
    - Downgrades `subscription_tier` to 'free'.

### 3. Fixes
- User manually corrected `STRIPE_PRO_PRICE_ID` to `STRIPE_PRICE_ID_PRO` in `app/dashboard/actions.ts`.

## Verification
- **Build**: `npm run build` passed successfully.
- **Logic**: Verified against Stripe documentation for subscription lifecycle events.

## Next Steps
- Verify webhook events in a live staging environment or with Stripe CLI during end-to-end testing.
