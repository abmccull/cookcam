# Project Requirements Document (Phase 1 MVP)

## 1. Project Overview

CookCam is a mobile app that lets you point your phone’s camera at a handful of ingredients, then instantly generates three custom recipe suggestions. Users confirm or tweak the detected items, apply simple filters (diet, cuisine, time), and pick a recipe to cook step-by-step. Along the way, they earn XP points, build streaks, unlock badges, save favorites, and share results with a built-in referral code. Creators can join via Stripe Connect, earn a tiered revenue share on subscriptions, and track installs and active subscriptions in their dashboard.

We’re building CookCam to solve two core problems: (1) reducing meal-planning friction and food waste by turning whatever’s in your pantry into a tasty dish, and (2) motivating home cooks through gamification and community-driven referrals. Success for the MVP means smooth ingredient scans (<3 sec), strong engagement (daily streak retention > 40%), a minimum of 1,000 paid subscriptions at $3.99/mo, and healthy creator referrals (at least 100 creators onboarded, each averaging 10 installs).

## 2. In-Scope vs. Out-of-Scope

### In-Scope (Phase 1 MVP)

*   **Onboarding & Authentication**\
    • Email-based OAuth sign-up/sign-in via Supabase.\
    • Optional push notification opt-in for streak reminders, XP milestones, recipe ideas.
*   **Home & Camera**\
    • Full-screen live camera with capture button and recent photo chip.
*   **Ingredient Review**\
    • Detected ingredient chips with ✅/❌, “Add” FAB for manual entry, pantry-staple hints.
*   **Filters Drawer**\
    • Bottom sheet with pills for diet, cuisine, skill, time, calories; “Generate recipes” CTA.
*   **Recipe Cards**\
    • Horizontal stack of three cards: image, title, cook-time badge, macro snapshot.
*   **Recipe Detail & Cook Mode**\
    • Tabs: Steps, Macros, Tips.\
    • Full-screen step-by-step mode with progress dots, haptic feedback, voice-over labels.
*   **Gamification Engine**\
    • XP (+10 scan, +5 filters, +30 finish, +10 share), 5 level tiers, daily streaks, freeze tokens, SVG badges.
*   **Favorites**\
    • Masonry grid, sort dropdown, long-press removal.
*   **Leaderboard**\
    • Daily, weekly, monthly, yearly, all-time XP rankings (no prizes).
*   **Sharing & Referral**\
    • Share sheet for TikTok/IG/X/Link with auto-appended `cookcam.app/r/<code>` & FTC tag.
*   **Profile & Creator Dashboard**\
    • User: avatar, level bar, streak, badge carousel.\
    • Creator: Stripe Connect onboarding, unique 6-char code, MTD & lifetime earnings, install & subscription counts.
*   **Payments & Subscriptions**\
    • $3.99/mo subscription via Stripe.\
    • Tiered revenue share: 10% up to 100 installs; 15% for 100–1000; 20% beyond.
*   **Backend & APIs**\
    • React Native → Supabase Edge Functions → Postgres + pgvector → USDA FDC seed → Stripe payouts. • Endpoints: `/scan`, `/recipes/{id}`, `/favorite`, `/xpSync`, `/payouts`.
*   **Design & Accessibility**\
    • Brand palette (Spice Orange, Fresh Basil, Eggplant Midnight, Pepper Gray), Poppins/Inter fonts, Lucide-react icons, Lottie animations, WCAG AA contrast, dynamic type, voice-over, haptics.
*   **IDE Integrations**\
    • Development using Windsurf and Cursor for AI-powered code suggestions and live assistant.

### Out-of-Scope (Phase 1)

*   Multi-language support (only English UI/labels/voice-over).
*   Static recipe search screen or curated recipe uploads.
*   Admin/moderator roles or support ticketing.
*   Advanced creator analytics beyond install & subscription counts.
*   Social sign-in providers beyond email.
*   Material prizes or real-world rewards for leaderboards.
*   Offline-first or full offline functionality.

## 3. User Flow

**Paragraph 1:**\
A new user opens CookCam and sees a three-card onboarding carousel explaining the value prop: “Point → Cook → Earn.” They sign up with email, opt-in for push notifications, and choose to join the creator program (optional). They land on the Home tab, where the camera view fills the screen and a subtle shutter bounce invites them to snap. Tapping capture sends the image to the backend and transitions to the Ingredient Review screen.

**Paragraph 2:**\
On the Ingredient Review screen, users confirm or remove detected items and can add any missing ingredients manually. Swiping up opens the Filters Drawer, where they choose diet, cuisine, skill level, time, and calories. Hitting “Generate recipes” returns three scrollable cards. They pick one to see full details (Steps/Macros/Tips), then hit “Cook” to enter full-screen mode. As they complete each step, they earn XP and maintain streaks. At the end, confetti plays, XP fills, and they can save it to Favorites or share it—auto-tagging their referral code. Users explore Favorites, Leaderboard, and Profile with a bottom-tab navigator.

## 4. Core Features

*   **Authentication & Onboarding**\
    • Supabase email/OAuth sign-in, push notification opt-in.
*   **Camera & Scan**\
    • Live preview, capture, gallery chip, 40 ms shutter bounce.
*   **Ingredient Review**\
    • Pill chips with remove/confirm, “Add” FAB, pantry hints.
*   **Filters Drawer**\
    • Diet, cuisine, time, skill, calories; “Generate recipes” action.
*   **Recipe Generation**\
    • OpenAI GPT-4o mini seeded with USDA FDC to produce recipes.
*   **Recipe Detail & Cook Mode**\
    • Tabs for steps, macros, tips; full-screen cook instructions, progress dots, voice-over.
*   **Gamification**\
    • XP engine, levels, streaks, badges, leaderboard timeframes.
*   **Favorites Management**\
    • Masonry grid, sort, long-press removal.
*   **Share & Referral**\
    • Social share sheet, auto-append referral code & FTC tag, track installs/subscriptions.
*   **Creator Dashboard**\
    • Stripe Connect flow, code generator, earnings table, install/subscription counter.
*   **Payment & Subscription Handling**\
    • Stripe integration, $3.99/mo subscription, revenue share logic, payout jobs.
*   **APIs & Data**\
    • `/scan`, `/recipes/{id}`, `/favorite`, `/xpSync`, `/payouts`; Supabase Edge Functions.
*   **Design System**\
    • Brand palette, typography, iconography, motion patterns, dark mode, accessibility.

## 5. Tech Stack & Tools

*   **Frontend**\
    • React Native (JavaScript/TypeScript)\
    • Lucide-react icons, Lottie animations
*   **Backend & APIs**\
    • Supabase Edge Functions (Node.js)\
    • PostgreSQL + pgvector\
    • Supabase Auth & Storage\
    • JWT authentication
*   **AI & Data**\
    • OpenAI GPT-4o mini for ingredient detection & recipe generation\
    • USDA FDC REST API for seed data
*   **Payments**\
    • Stripe API (Connect, subscriptions, webhooks)
*   **IDE & AI Tools**\
    • Windsurf (AI-integrated IDE)\
    • Cursor (real-time AI code suggestions)

## 6. Non-Functional Requirements

*   **Performance**\
    • `/scan` response < 3 s end-to-end\
    • App cold start < 2 s, screen transitions < 300 ms
*   **Security & Compliance**\
    • HTTPS/TLS for all traffic\
    • JWT auth, row-level policies (Supabase RLS)\
    • Encryption at rest for sensitive data\
    • GDPR & CCPA considerations for user data\
    • FTC compliance on referral disclosures
*   **Accessibility & Usability**\
    • WCAG AA color contrast (≥ 4.5:1)\
    • Dynamic text scaling up to 200%\
    • Voice-over labels for cooking steps\
    • Haptic feedback on key interactions
*   **Reliability & Scaling**\
    • Rate limit handling for OpenAI and USDA APIs\
    • Cron job for payouts runs every night reliably\
    • Database indices on user_id, recipe_id, ref_code

## 7. Constraints & Assumptions

*   **AI Model Availability**\
    • GPT-4o mini endpoint must be accessible with sufficient throughput.
*   **API Dependencies**\
    • USDA FDC REST may suffer occasional downtime—cache seed data locally.
*   **User Environment**\
    • Modern iOS/Android device with camera, internet, haptic support.
*   **Stripe Account**\
    • Creators must complete Stripe KYC before receiving referral codes.
*   **Subscription Model**\
    • Only one $3.99/mo tier in Phase 1.
*   **Referral Tracking**\
    • Referral code survives only first install; no multi-touch attribution.

## 8. Known Issues & Potential Pitfalls

*   **Ingredient Mis-Detection**\
    • AI may mislabel items. Mitigation: always show “Confirm / Edit” screen and manual entry FAB.
*   **API Rate Limits**\
    • OpenAI or USDA APIs could throttle. Mitigation: implement exponential back-off and offline cache of popular ingredients.
*   **Offline Scenarios**\
    • Scanning requires network. Mitigation: gray-out scan button when offline and prompt user.
*   **Stripe Webhook Failures**\
    • Missed commission records. Mitigation: retry logic and daily reconciliation job.
*   **Time-Zone for Streaks**\
    • Calendar day boundaries vary. Mitigation: use UTC cutoff and show user explicit “last cooked” timestamp.

This document serves as the single source of truth for all future technical designs—frontend guidelines, backend structure, file organization, security rules, and implementation plans. If it’s not explicitly covered here, it’s outside the Phase 1 MVP scope.
