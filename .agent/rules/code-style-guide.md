---
trigger: always_on
---

# DataGist Code Style Guide

## 1. Core Principles
- **Strict TypeScript:** No `any`. Use `unknown` or specific Zod schemas.
- **Server-First:** Prefer React Server Components (RSC) for data fetching. Use Client Components (`"use client"`) only for interactivity.
- **Biome:** We use Biome for linting and formatting. No Prettier/ESLint.
- **Functional:** Prefer functional programming patterns. Immutable data structures where possible.

## 2. Naming Conventions
- **Directories:** `kebab-case` (e.g., `components/ui`, `app/dashboard`).
- **Files:**
  - Components/Pages: `kebab-case` (e.g., `page.tsx`, `nav-bar.tsx`).
  - Utilities/Hooks: `camelCase` (e.g., `useAuth.ts`, `formatDate.ts`).
- **Variables/Functions:** `camelCase` (e.g., `fetchUserData`).
- **Components:** `PascalCase` (e.g., `UserProfile`).
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_COUNT`).
- **Types/Interfaces:** `PascalCase` (e.g., `UserProfile`).

## 3. TypeScript Rules
- **Explicit Returns:** All functions should have explicit return types, or rely on type inference only when obvious.
- **Interfaces vs Types:**
  - Use `interface` for Component Props and Public API definitions.
  - Use `type` for Unions, Intersections, and Zod inference (`z.infer`).
- **Null Handling:** Prefer optional chaining (`?.`) and nullish coalescing (`??`) over explicit `&&` checks for existence.
- **Async:** Always handle promises with `await` or return the promise. No floating promises.

## 4. Component Structure (React/Next.js)
```tsx
// 1. Imports
import { type FC } from "react";
import { redirect } from "next/navigation";
// Absolute imports (configured in tsconfig)
import { Button } from "@/components/ui/button";

// 2. Types
interface DashboardProps {
  userId: string;
}

// 3. Component Definition (Named Export preferred over default for debugging)
export const DashboardPage: FC<DashboardProps> = async ({ userId }) => {
  // Logic
  if (!userId) redirect("/login");

  return (
    <main className="p-4">
      <Button>Action</Button>
    </main>
  );
};
```

## 5. State Management & Data Fetching
- **Server Actions:** Use strictly for mutations (POST/PUT/DELETE).
- **Zod Validation:** All Server Actions must validate input using Zod schemas defined in `@/lib/validations/`.
- **Database:** Use the Supabase typed client.
  - *Bad:* `supabase.from('users').select('*')`
  - *Good:* `supabase.from('users').select('id, email, full_name')` (Select only what is needed).

## 6. Styling (Tailwind CSS)
- Use standard Tailwind utility classes.
- Use `clsx` or `tailwind-merge` for conditional class logic.
- Avoid `@apply` in CSS files; keep styles in the JSX.
- Order: Layout -> Box Model -> Typography -> Visuals -> Misc.

## 7. Biome Configuration
- Ensure `biome.json` is configured for:
  - Indent style: Space
  - Indent width: 2
  - Line width: 100
  - Trailing commas: ES5
  - Semicolons: always

## 8. Anti-Patterns
- ❌ **No:** `useEffect` for data fetching (Use Server Components).
- ❌ **No:** Inline styles (Use Tailwind).
- ❌ **No:** `console.log` in production code (Use a logger utility or remove before commit).
- ❌ **No:** Hardcoded secrets (Use `process.env`).

## 9. Testing Strategy (Pragmatic TDD)
- **Framework:** Vitest (Unit/Integration).
- **Process (Red-Green-Refactor):**
  1.  Create the `foo.test.ts` file *before* `foo.ts`.
  2.  Define the expected behavior (inputs -> outputs).
  3.  Run the test (it fails).
  4.  Write the implementation.
  5.  Run the test (it passes).
- **What to Test (Strict TDD):**
  - **Utilities:** Metric calculation logic, date formatters.
  - **Validation:** Zod schema parsing (ensure invalid data throws).
  - **Server Actions:** Mock the Supabase client and test the business logic flow.
  - **API Routes:** Test response structures.
- **What NOT to Test (MVP Phase):**
  - **UI Components:** Do not write unit tests for simple visuals (e.g., checking if a div exists). Rely on manual verification or E2E later.
- **Location:** Co-locate tests with code (e.g., `lib/utils/format.ts` -> `lib/utils/format.test.ts`).