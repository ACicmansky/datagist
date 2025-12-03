# System Patterns

## Architecture
- **Frontend:** Next.js (App Router). Client components for forms, Server Components for data fetching. `proxy.ts` for route protection.
- **Backend:** Next.js Server Actions for mutations. Supabase Edge Functions for background cron jobs (Report generation).
- **Database:** PostgreSQL (Supabase).
- **AI Service:** Google Gemini API (via Vertex AI or AI Studio).

## Data Flow (The Reporting Pipeline)
1. **Trigger:** Supabase Edge Function runs (triggered by cron).
2. **Query:** Fetch users with `next_send_at` <= NOW().
3. **Fetch Data:** Use stored OAuth Refresh Token to fetch GA4 metrics via Google Analytics Data API.
4. **Processing (AI):**
   - **Free:** Send JSON metrics to Gemini -> Get Summary.
   - **Pro:** Send JSON metrics to Gemini + Enable Grounding -> Get Summary & Strategic Advice.
5. **Update DB:** Save report to `reports` table and update `next_send_at`.
6. **Delivery:** Send email via Email Service Provider (e.g. Resend).

## Security & Auth
- **User Auth:** Supabase Auth (Google Provider).
- **GA4 Access:** We must request `offline_access` scope to get a Refresh Token.
- **Token Storage:** Refresh tokens must be stored securely (encrypted in DB) associated with the user profile/property.
- **Admin Access:** Use `createAdminClient` (`lib/supabase/admin.ts`) for backend tasks (Cron, Webhooks) that require bypassing RLS. Uses `SUPABASE_SERVICE_ROLE_KEY`.

## Development Patterns
- **Schema-First:** DB Schema -> Types/Zod -> Code.
- **Type Safety:** Strict TypeScript usage.
- **Validation:** Zod for all form inputs and API responses. Centralized in `src/lib/validations/schemas.ts`.