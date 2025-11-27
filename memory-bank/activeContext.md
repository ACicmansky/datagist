# Active Context

## Current Focus
**Phase 1: Foundation & Architecture**
We have established the database schema and type definitions. The next focus is initializing the Next.js application and implementing authentication.

## Recent Decisions
- **Auth:** Use Google OAuth 2.0 via Supabase.
- **Database:** Supabase (PostgreSQL).
- **Schema Refactoring:**
  - Added Stripe fields (`stripe_customer_id`, `stripe_subscription_id`) to `profiles`.
  - Added `google_refresh_token` to `profiles` for offline access.
  - Added `website_url` and `industry` to `properties` for AI grounding.
  - Refined `report_settings` with `complexity_level` and `include_recommendations`.
- **Scheduling:** Supabase Edge Functions.
- **AI Strategy:** Grounding is reserved for Pro/Max users.
- **Dev Approach:** Schema-first, Agentic coding.

## Immediate Next Steps
1.  Initialize Next.js project with Supabase client.
2.  Implement Google OAuth Login logic.
3.  Set up Supabase Edge Functions for report generation.