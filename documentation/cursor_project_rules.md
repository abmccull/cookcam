## Project Overview

*   **Type:** Mobile Application
*   **Description:** CookCam is a mobile app that allows users to snap a photo of ingredients and generate custom recipe suggestions.
*   **Primary Goal:** Reduce meal-planning friction and motivate home cooks through gamification and community-driven referrals.

## Project Structure

### Framework-Specific Routing

*   **Directory Rules:**

    *   React Native (0.71): Use `App.tsx` as entry point; place screen components under `src/screens/[ScreenName].tsx`.
    *   React Navigation 6: Define navigators in `src/navigation` using `createNativeStackNavigator` and `createBottomTabNavigator`.

### Core Directories

*   **Versioned Structure:**

    *   `src/screens`: React Native TSX screen components (CameraScreen, IngredientReviewScreen, etc.).
    *   `src/components`: Reusable UI components (Buttons, Cards, Drawers).
    *   `src/navigation`: Navigation stacks and tab navigators for React Navigation 6.
    *   `src/assets`: Images, SVG icons, Lottie JSON files.
    *   `src/hooks`: Custom React hooks for state and side effects.
    *   `src/services`: API clients for Supabase, OpenAI, Stripe.
    *   `src/utils`: Utility functions (formatting, logging, error handlers).
    *   `src/styles`: Theming, color palettes, typography definitions.
    *   `src/store`: State management modules (Zustand or Redux Toolkit).

### Key Files

*   **Stack-Versioned Patterns:**

    *   `App.tsx`: React Native 0.71 root entry, registers `RootNavigator`.
    *   `src/navigation/RootNavigator.tsx`: Defines root stack and bottom-tabs.
    *   `src/screens/CameraScreen.tsx`: Camera capture + POST to Supabase Edge `/scan`.
    *   `src/screens/IngredientReviewScreen.tsx`: User edits & confirms scanned ingredients.
    *   `src/screens/RecipeListScreen.tsx`: Displays filtered recipe cards with drawer filters.
    *   `src/screens/RecipeDetailScreen.tsx`: Full recipe JSON view + share sheet integration.
    *   `src/screens/CookModeScreen.tsx`: Step-by-step UI with haptic feedback & voice-overs.
    *   `babel.config.js`: React Native config with TypeScript support.
    *   `tsconfig.json`: Strict TypeScript settings (`noImplicitAny`, `strictNullChecks`).

## Tech Stack Rules

*   **Version Enforcement:**

    *   react-native@0.71: Enable Hermes engine; functional components and hooks only.
    *   @react-navigation/native@6: Use `createNativeStackNavigator`; avoid legacy v4 APIs.
    *   supabase-js@2: Use typed client instances; enforce RLS and JWT auth in `src/services/supabase.ts`.
    *   openai@4: Integrate GPT-4o mini with streaming (`stream: true`); implement retry/backoff logic.
    *   stripe@8: Secure webhooks with `stripe.webhooks.constructEvent`; employ idempotency keys.
    *   pgvector@0.4: Index `ingredients.macros_jsonb` using `ivfflat` for vector searches.
    *   expo-camera@15: Use managed camera with explicit permission handling.

## PRD Compliance

*   **Non-Negotiable:**

    *   "Only English language support for the MVP": Disable i18n modules; hardcode all UI text in English.
    *   "All recipes dynamically generated through GPT-4 mini": No static recipe database; all recipe data via OpenAI Edge Function.

## App Flow Integration

*   **Stack-Aligned Flow:**

    *   Launch → `App.tsx` initializes `RootNavigator`.
    *   Home Tab → `CameraScreen` uses `expo-camera`; on capture, POST image to Supabase Edge `/scan`.
    *   Success → navigate to `IngredientReviewScreen` with scanned ingredients.
    *   Confirm → navigate to `RecipeListScreen`; open `FilterDrawer` for dietary/cuisine/time filters.
    *   Select Card → `RecipeDetailScreen`; share via React Native `Share` API with URL `cookcam.app/r/<code>`.
    *   Start Cooking → `CookModeScreen` implements step-by-step workflow, haptics, voice-overs.
    *   Bottom Tabs → `FavoritesScreen`, `LeaderboardScreen`, `ProfileScreen`.

## Best Practices

*   react-native
    *   Use functional components and React Hooks exclusively.
    *   Enable strict TypeScript (`tsconfig.json`); avoid `any`.
    *   Memoize components with `React.memo`, callbacks with `useCallback`.
    *   Profile app performance with Hermes + Flipper.

*   @react-navigation/native
    *   Centralize navigators in `src/navigation`.
    *   Strongly type route params using TypeScript generics.
    *   Implement deep linking for referral URLs.

*   supabase-js
    *   Define RLS policies for `users`, `scans`, `commissions`.
    *   Manage DB schema via Supabase CLI migrations; commit SQL files.
    *   Wrap client calls with typed interfaces and error handling.

*   openai
    *   Use streaming completions (`stream: true`) for progressive UI.
    *   Add exponential backoff for 429 rate-limit responses.
    *   Sanitize and validate user-generated prompts.

*   stripe
    *   Verify webhook signatures on server.
    *   Use idempotency keys for subscription and payout endpoints.
    *   Do not persist full card data; comply with PCI DSS.

*   postgres + pgvector
    *   Create `ivfflat` index on `ingredients.macros_jsonb` for nearest-neighbor search.
    *   Normalize relational data; use JSONB for dynamic macro fields.
    *   Schedule automatic backups via Supabase backup feature.

*   cursor
    *   Track AI code suggestion usage in `cursor_metrics.md`.
    *   Limit context window and cache suggestions.

## Rules

*   Derive folder and file patterns directly from `techStackDoc` versions.
*   Use `src/screens` & `src/navigation` exclusively for React Native navigation.
*   Never mix web routing conventions (no `pages/` or `app/` directories).
*   Enforce TypeScript in all `src/` files; disallow `.js` in source.
*   Secure sensitive data (JWT, API keys) using encrypted storage.
*   Apply Supabase RLS for per-row access control on all tables.

## Rules Metrics

Before starting the project development, create a metrics file in the root of the project called `cursor_metrics.md`.

### Instructions:

*   Each time a cursor rule is used as context, update `cursor_metrics.md`.
*   Use the following format for `cursor_metrics.md`:

# Rules Metrics

## Usage
The number of times rules is used as context

*   react_native_screens.mdx: 0
*   react_navigation.mdx: 0
*   supabase_edge_functions.mdx: 0
*   openai_streaming.mdx: 0
*   stripe_webhooks.mdx: 0