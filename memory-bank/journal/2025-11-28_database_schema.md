# 2025-11-28: Database Schema & Type Definitions

## Context
We have moved into Phase 1: Foundation & Architecture. The primary goal was to establish the database layer and ensuring type safety across the application.

## Actions
- **Created Initial Schema:**
  - `profiles`, `properties`, `report_settings`, `reports` tables.
  - Basic RLS policies.
- **Created Type Definitions:**
  - `types/db.ts`: TypeScript interfaces.
  - `types/schemas.ts`: Zod validation schemas.
- **Refactored Schema (User Feedback):**
  - **Profiles:** Added `subscription_tier`, `stripe_customer_id`, `stripe_subscription_id`, `google_refresh_token`.
  - **Properties:** Renamed `property_id` to `ga_property_id`. Added `website_url` and `industry`.
  - **Report Settings:** Refined `complexity_level` and `include_recommendations`.
  - **Reports:** Added `metrics_snapshot` (JSONB) and `user_id`.
  - **Types:** Updated TypeScript and Zod definitions to match.
- **Applied Migration:**
  - Reset the database and applied the refactored schema to Supabase project `datagist`.

## Next Steps
- Initialize Next.js project.
- Implement Google OAuth.
