# Tech Context

## Core Stack
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Database/Auth:** Supabase
- **Deployment:** Vercel
- **AI:** Google Gemini Pro (Latest Model)

## Integrations
- **Google Analytics:** Google Analytics Data API (v1beta).
- **Payments:** Stripe (Checkout & Webhooks).
- **Email:** Resend (preferred) or SendGrid.

## Development Environment
- **IDE:** Google Antigravity / Project IDX / VS Code.
- **Agent:** Gemini 3.

## Constraints
- **Vercel Functions:** 10-second timeout limit on standard serverless functions (reason for using Supabase Edge Functions for long-running AI tasks).
- **GA4 API:** Quotas apply; we must cache data or respect rate limits. 