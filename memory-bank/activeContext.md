# Active Context

## Current Focus
**Phase 1: Foundation & Architecture**
We are currently initializing the project structure, setting up the database schema, and configuring the authentication flow.

## Recent Decisions
- **Auth:** Use Google OAuth 2.0 via Supabase.
- **Database:** Supabase (PostgreSQL).
- **Scheduling:** Supabase Edge Functions.
- **AI Strategy:** Grounding is reserved for Pro/Max users.
- **Dev Approach:** Schema-first, Agentic coding.

## Immediate Next Steps
1.  Initialize Next.js project with Supabase client.
2.  Create Supabase Tables (`profiles`, `properties`, `report_settings`, `reports`).
3.  Generate Zod schemas and TypeScript interfaces to match the DB tables.
4.  Implement Google OAuth Login logic.