# Active Context

## Current Focus
**Phase 3: Frontend Dashboard & GA4 Integration**
We have successfully implemented Google OAuth authentication and the foundational Next.js structure. The next focus is building the user dashboard and integrating the Google Analytics Data API.

## Recent Decisions
- **Auth:** Use Google OAuth 2.0 via Supabase.
- **Middleware:** Refactored `middleware.ts` to `proxy.ts` to align with Next.js best practices and avoid conflicts.
- **Database:** Supabase (PostgreSQL).
- **Schema Refactoring:**
  - Added Stripe fields (`stripe_customer_id`, `stripe_subscription_id`) to `profiles`.
  - Added `google_refresh_token` to `profiles` for offline access.
  - Added `website_url` and `industry` to `properties` for AI grounding.
  - Refined `report_settings` with `complexity_level` and `include_recommendations`.
- **Scheduling:** Supabase Edge Functions.
- **AI Strategy:** Grounding is reserved for Pro/Max users.
- **Dev Approach:** Schema-first, Agentic coding.
- **Code Quality:** Biome for linting/formatting. Vitest for testing (Pragmatic TDD).

## Immediate Next Steps
1.  Create Dashboard UI (Layout, Sidebar, Overview).
2.  Implement "Connect Property" flow (GA4 API).
3.  Set up Supabase Edge Functions for report generation.

## Completed
- **Authentication:** Implemented Google OAuth with offline access (Refresh Token storage).
- **Middleware:** Implemented route protection using `proxy.ts`.
- **Next.js Setup:** Initialized project with Supabase SSR client helpers.
- **Biome Configuration:** Updated to match DataGist Code Style Guide (lineWidth: 100, semicolons: always, trailingCommas: es5).
- **Testing Setup:** Configured Vitest with `jsdom` and `@/*` alias support. Added `test` script to package.json.