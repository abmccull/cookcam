# .windsurfrules

## Project Overview
- **Type:** Mobile App (CookCam MVP)
- **Description:** A React Native application enabling ingredient photo scanning, AI-driven recipe generation, gamified cooking experiences, social sharing, and a creator referral program.
- **Primary Goal:** Enable users to scan ingredients, generate personalized recipes, complete cooking workflows, and share outcomes with referral tracking.

## Project Structure
### Framework-Specific Routing
- **React Native 0.71 + React Navigation 6:** Screens defined in `src/screens`, navigation stacks in `src/navigation`.
  - `src/navigation/AppNavigator.tsx`: Root navigator combining Auth and Main flows via `createStackNavigator` and `createBottomTabNavigator`.
  - Example 1: Ingredient Scan Flow → `src/screens/ScanCamera.tsx`, `src/screens/IngredientResults.tsx`.
  - Example 2: Auth Flow → `src/screens/Login.tsx`, `src/screens/Signup.tsx` (wrapped by `src/navigation/AuthNavigator.tsx`).

### Core Directories
- **Versioned Structure:**
  - `src/screens`: React Native 0.71 functional components for each view.
  - `src/navigation`: React Navigation 6 navigator definitions and route config.
  - `src/components`: Shared UI components (buttons, headers) styled per brand guide.
  - `src/assets`: Fonts (Poppins, Inter), images, Lottie JSON files.
  - `supabase/functions`: Supabase Edge Functions (Node.js 18) entry files.
  - `supabase/storage`: Defines buckets (`scan_images`) via Supabase CLI.

### Key Files
- **Stack-Versioned Patterns:**
  - `App.tsx`: Root app entry–wraps `NavigationContainer` and `SupabaseAuthProvider`.
  - `src/navigation/AppNavigator.tsx`: React Navigation 6 setup–no legacy RNRF.
  - `supabase/functions/processScan.ts`: Supabase Edge Function for `/scan`, uses OpenAI GPT-4o mini and pgvector queries.
  - `supabase/functions/recordCommission.ts`: Handles commission logic (Stripe Connect integration).
  - `supabase/functions/runPayouts.ts`: Cron-invoked monthly payouts.

## Tech Stack Rules
- **Version Enforcement:**
  - react-native@0.71: Must use Hermes engine, enable JSI for Lottie and Lucide-react interoperability.
  - @react-navigation/native@6: Enforce TypeScript route params, no deprecated `react-navigation`.
  - node@18: Supabase Edge Functions runtime, no unsupported Node APIs.
  - supabase-cli@latest: Functions in `supabase/functions` with `index.ts` or function-named .ts files.

## PRD Compliance
- **Non-Negotiable:**
  - "Performance: `/scan` response < 3s, cold start < 2s": Optimize Supabase Edge Functions, use connection pooling and caching.
  - "WCAG AA compliance": All screens use accessible props (accessible labels, dynamic font sizes, color contrast per guide).

## App Flow Integration
- **Stack-Aligned Flow:**
  - Scan Flow → `src/navigation/ScanNavigator.tsx` routes: `ScanCamera` → `IngredientResults` → `RecipeDetail`; state persisted in `src/store/scanSlice.ts`.
  - Auth Flow → `src/navigation/AuthNavigator.tsx` uses Supabase Auth hooks; post-login redirects to `MainNavigator`.
  - Main Tab Flow → `src/navigation/MainNavigator.tsx`: Tabs for Home, Favorites, Leaderboard, Profile; each screen in `src/screens`.
  - Edge Function Integration → client calls `/rest/v1/rpc/processScan` (Supabase Edge Function) from `src/api/scan.ts`.

---

### Input Context (Priority Order):
1. techStackDoc: React Native 0.71, React Navigation 6, Supabase Edge Functions (Node.js 18)
2. prd: Performance & accessibility mandates
3. appFlow: Scan, Auth, Main Tab flows
4. answers: App Router equivalent patterns for React Native navigation