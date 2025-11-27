# Project Brief: DataGist

## Overview
DataGist is a SaaS application that automates web analytics reporting. It connects to a user's Google Analytics 4 (GA4) account, analyzes the data using Google Gemini AI, and sends periodic email summaries with actionable recommendations.

## Core Problem
Website owners often neglect their analytics because dashboards are complex and time-consuming. They miss trends and lack the expertise to interpret raw data into strategy.

## Solution
"Push-based" insights. Instead of users going to the dashboard, DataGist brings the dashboard's meaning to their inbox in natural language.

## Target Audience
- Website owners and marketers using Google Analytics.
- Solo-preneurs, SMBs, and agencies managing client sites.

## MVP Scope
1. **Auth:** Google Sign-in (Supabase Auth) with GA4 Scope permissions.
2. **Onboarding:** Connect a GA4 Property.
3. **Configuration:** Select Plan (Free/Pro/Max) and Report Frequency (e.g., Weekly/Monthly).
4. **Data Engine:** Scheduled jobs (Supabase Edge Functions) fetch GA data.
5. **AI Engine:** Gemini analyzes data. Grounding (Web Search) enabled for paid plans only.
6. **Delivery:** HTML Email sent via transactional provider (e.g., Resend).

## Success Metrics
- Successful OAuth connections.
- Recurring report delivery reliability.
- User upgrade rate (Free to Pro).