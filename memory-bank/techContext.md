# Tech Context

## Core Stack
- **Framework:** Next.js 16+ (App Router)
- **Language:** TypeScript (Strict mode)
- **Database/Auth:** Supabase
- **Deployment:** Vercel
- **AI:** Google Gemini Pro (Latest Model)

## Integrations
- **Google Analytics:** Google Analytics Data API (v1beta).
- **Payments:** Stripe (Checkout & Webhooks).
- **Email:** Resend (preferred) or SendGrid.

## Development Tools
- **Linter/Formatter:** Biome v2.2.0 (100 char line width, semicolons: always, ES5 trailing commas)
- **Testing:** Vitest v4+ with jsdom, @testing-library/react
- **Package Manager:** npm
- **IDE:** Google Antigravity / Project IDX / VS Code.

## Code Standards
- Strict TypeScript (no `any`)
- Functional programming patterns
- Zod for runtime validation
- Pragmatic TDD for utils, validations, and server actions
- Server Components first, Client Components only for interactivity

## Constraints
- **Vercel Functions:** 10-second timeout limit on standard serverless functions (reason for using Supabase Edge Functions for long-running AI tasks).
- **GA4 API:** Quotas apply; we must cache data or respect rate limits. 