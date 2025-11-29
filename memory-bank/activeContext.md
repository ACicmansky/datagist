# Active Context

## Current Focus
**Phase 4: Report Generation & Edge Functions**
We have completed the Property Onboarding (Phase 3) and Authentication UI (Phase 2 finish). The next major focus is setting up the Supabase Edge Functions to automate the report generation process using the Google Analytics Data API and Gemini.

## Recent Decisions
- **Validation:** Centralized all Zod schemas in `src/lib/validations/schemas.ts` to share types between client and server.
- **Auth UI:** Implemented a custom Google Sign-In button using Server Actions for a cleaner UX.
- **Onboarding:** Created a wizard-style onboarding flow to guide users through property selection immediately after signup.
- **Error Handling:** Added robust error logging for Google API calls to aid debugging (e.g., catching missing env vars).

## Immediate Next Steps
1.  Set up Supabase Edge Functions environment.
2.  Implement the "Report Generator" Edge Function.
3.  Integrate Gemini API for report summarization.

## Completed
- **Authentication:**
  - Google OAuth with offline access (Refresh Token storage).
  - Login Page and Google Sign-In Button.
  - Landing Page with "Get Started" flow.
- **Property Onboarding:**
  - `OnboardingWizard` component for selecting GA4 properties.
  - Server Actions to save property and report settings.
  - Google API Helper (`listGA4Properties`) with unit tests.
- **Infrastructure:**
  - `proxy.ts` middleware for route protection and redirects.
  - `src/lib/validations/schemas.ts` for shared Zod schemas.
  - Biome and Vitest configuration.