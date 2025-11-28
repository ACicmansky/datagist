# Phase 2: Authentication Implementation

**Date:** 2025-11-29  
**Phase:** Authentication & OAuth Setup  
**Status:** ✅ Completed

## Summary
Successfully implemented Google OAuth authentication flow using Supabase Auth with offline access (refresh token retrieval) for Google Analytics API integration.

## What Was Accomplished

### 1. Supabase Client Helpers
- Created `src/utils/supabase/server.ts` for Server Components and Actions
- Created `src/utils/supabase/client.ts` for Client Components
- Both use `@supabase/ssr` for proper cookie management

### 2. Google OAuth Login (`loginWithGoogle`)
- Implemented server action in `src/app/auth/actions.ts`
- **Critical Configuration:**
  - Scope: `https://www.googleapis.com/auth/analytics.readonly`
  - Query params: `access_type: 'offline'`, `prompt: 'consent'`
  - These ensure refresh token is always provided
- Redirects to `/auth/callback` after user authorization

### 3. OAuth Callback Handler
- Created API route in `src/app/auth/callback/route.ts`
- Exchanges authorization code for session
- **Extracts `provider_refresh_token`** from session
- Stores refresh token in `profiles.google_refresh_token`
- Redirects to `/dashboard` on success

### 4. Route Protection
- Initially created `src/middleware.ts`
- **Refactored to `src/proxy.ts`** (Next.js convention)
- Protects `/dashboard` route
- Redirects unauthenticated users to `/login`
- Handles session refresh automatically

### 5. Testing
- Created `src/app/auth/actions.test.ts`
- Tests for successful OAuth redirect
- Tests for error handling
- All tests passing (2/2)

## Key Decisions

1. **Refresh Token Storage:** Stored as plain text in `profiles.google_refresh_token` for MVP. 
   - ⚠️ **Production TODO:** Encrypt tokens before storage.

2. **Middleware → Proxy:** Renamed to align with Next.js best practices and avoid deprecation warnings.

3. **OAuth Scopes:** Explicitly requested Google Analytics readonly scope upfront to ensure proper permissions.

4. **Testing Strategy:** Focused on testing server actions. UI testing deferred per pragmatic TDD approach.

## Technical Details

### Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`

### Database Changes
- No schema changes needed (refresh token column already exists)

### Dependencies
- `@supabase/ssr@^0.8.0`
- `@supabase/supabase-js@^2.86.0`

## Verification

### Automated
- ✅ Build successful (`npm run build`)
- ✅ Tests passing (`npm test`)
- ✅ Proxy recognized by Next.js

### Manual (Pending)
- [ ] End-to-end login flow
- [ ] Verify refresh token stored in database
- [ ] Test protected route access

## Challenges & Solutions

### Challenge 1: Build Failure
- **Issue:** `@next/swc-win32-x64-msvc` error on first build
- **Solution:** Clean reinstall (`rm -rf node_modules package-lock.json && npm install`)

### Challenge 2: Middleware Deprecation
- **Issue:** Next.js warning about middleware convention
- **Solution:** Renamed to `proxy.ts` and cleared `.next` cache

## Next Steps (Phase 3)
1. Create login UI page
2. Build dashboard layout
3. Implement "Connect GA4 Property" flow
4. Test complete authentication journey

## Learnings
- Always use `access_type: 'offline'` and `prompt: 'consent'` for refresh tokens
- Next.js prefers `proxy.ts` over `middleware.ts` in newer versions
- Supabase `@supabase/ssr` handles cookie refresh automatically
- Testing server actions requires mocking both Supabase client and Next.js routing

## References
- [Supabase SSR Docs](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Google OAuth Scopes](https://developers.google.com/identity/protocols/oauth2/scopes)
- [Next.js Proxy Docs](https://nextjs.org/docs/messages/middleware-to-proxy)
