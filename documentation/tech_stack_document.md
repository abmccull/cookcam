# Tech Stack Document for CookCam

This document explains the technology choices behind CookCam’s Phase 1 MVP in simple, everyday language. It covers why each part was chosen and how they work together to deliver a smooth, reliable, and engaging cooking app experience.

---

## 1. Frontend Technologies

These are the tools that run on your phone and shape what you see and touch.

- **React Native**
  - Lets us build one app that works on both iPhone and Android.
  - Gives us access to native camera, haptic feedback, and smooth animations.
- **Supabase Auth (Email & OAuth)**
  - Handles user sign-up and login via email or social providers.
  - Keeps things simple and secure without building our own system.
- **Lucide-react Icons**
  - A set of flexible, friendly icons that match our brand style.
  - They scale cleanly on all screen sizes.
- **Lottie Animations**
  - Plays lightweight, high-quality animations (e.g. confetti on level-up).
  - Keeps the app feeling playful without slowing it down.
- **Styling & Design System**
  - **Colors:** Spice Orange, Fresh Basil, Eggplant Midnight, Pepper Gray, Sea-Salt White.
  - **Typography:** Poppins (headlines) and Inter (body text) for readability.
  - **Motion & Micro-UX:** small bounces and spring effects that make interactions feel alive.
  - Ensures consistency, accessibility, and a friendly, modern look.

How it enhances your experience:
- One codebase means faster updates and consistent behavior across iOS/Android.
- Branded colors, fonts, and animations make the app feel warm, playful, and easy to use.
- Built-in accessibility features (dynamic type, voice-over labels) are woven into every screen.

---

## 2. Backend Technologies

These are the systems that run on servers in the cloud, handling data, logic, and integrations.

- **Supabase Edge Functions**
  - Our server-side logic lives here (image processing, XP syncing, referral handling).
  - Scales automatically and runs close to users for faster responses.
- **PostgreSQL Database + pgvector**
  - Stores all core data: users, ingredients, scans, recipes, favorites, referrals, commissions.
  - pgvector lets us efficiently compare and search data, powering smarter recipe matching.
- **Supabase Storage**
  - Holds all user photos (ingredient snaps) in a secure bucket.
- **JWT Authentication**
  - Secures every request so only the right user can see or change their data.
- **OpenAI GPT-4o mini**
  - Powers the ingredient scan and recipe generation based on USDA data.
- **USDA FDC REST API**
  - Seeds initial nutritional data for recognized ingredients.
- **Stripe API**
  - Manages creator onboarding (Stripe Connect), referral codes, and revenue sharing.

How they work together:
1. User snaps a photo → sent to `/scan` edge function.  
2. Edge function calls OpenAI + USDA data → returns ingredients + recipe ideas.  
3. User flows (favorites, XP, referrals) talk to other Supabase functions and the main database.  
4. Stripe webhooks record commissions, and a nightly job issues payouts when thresholds are met.

---

## 3. Infrastructure and Deployment

These choices keep CookCam reliable, easy to update, and ready for growth.

- **Hosting Platform: Supabase**
  - Database, functions, storage, and authentication all in one place.
  - Automatic scaling means we don’t worry about traffic spikes.
- **Version Control: Git & GitHub**
  - All code lives in a shared repository for collaboration and history tracking.
- **CI/CD Pipeline: GitHub Actions**
  - Runs automated checks (linting, builds) on every code change.
  - Builds new mobile app versions for testing and release.
- **Monitoring & Alerts**
  - Error logs and performance metrics via Supabase and integrated alerts.
  - Early warnings let us fix issues before they reach users.

Benefits:
- Fast, reliable cloud hosting without the overhead of managing servers.
- Automated workflows ensure code quality and make releasing updates predictable.
- Clear version history and collaboration tools keep the team in sync.

---

## 4. Third-Party Integrations

These services add key capabilities without reinventing the wheel.

- **OpenAI** (GPT-4o mini)
  - Creates personalized recipes from your ingredient photos.
- **USDA FDC**
  - Provides trusted nutritional data to seed our ingredient database.
- **Stripe Connect**
  - Onboards creators, issues referral codes, and handles revenue share payouts.
- **Social Share Targets**
  - TikTok, Instagram, X, plus link sharing for easy recipe sharing and referrals.

Benefits:
- Instant access to advanced AI recipe generation.
- Reliable nutritional info from a trusted source.
- Smooth creator payments and transparent commission tracking.
- Built-in social reach to grow CookCam’s community.

---

## 5. Security and Performance Considerations

We’ve built CookCam with strong safeguards and fast, smooth interactions.

Security Measures:
- **Row-Level Security (Supabase)** ensures you only see your own data (and creators see their own commissions).
- **JWT Tokens** protect every API call and keep sessions secure.
- **Stripe Webhooks** are verified so commission data can’t be spoofed.
- **Supabase Storage Rules** lock down access to images.

Performance Optimizations:
- **Edge Functions** run close to users, cutting down on wait time.
- **Local Caching** of XP and streaks gives instant feedback before syncing.
- **pgvector** accelerates similarity searches for recipes.
- **Optimized Images** and minimal payloads keep data use low.
- **Lottie Animations** are lightweight and hardware-accelerated.

These steps ensure CookCam feels snappy and keeps your data safe at all times.

---

## 6. Conclusion and Overall Tech Stack Summary

CookCam’s tech stack was chosen to match our goals: a fun, reliable, and scalable cooking assistant that delights both cooks and creators. Here’s a quick recap:

- **Frontend:** React Native, Lucide-react, Lottie, Supabase Auth, branded colors/fonts – one codebase for iOS/Android with consistent, accessible design.  
- **Backend:** Supabase Edge Functions, PostgreSQL + pgvector, Supabase Storage, JWT Auth, OpenAI GPT-4o mini, USDA FDC API, Stripe API – smart, real-time recipe generation, secure data handling, creator payouts.  
- **Infrastructure:** Supabase hosting, GitHub + Actions CI/CD, monitoring – automatic scaling, quality gates, rapid updates.  
- **Integrations:** OpenAI, USDA, Stripe, social platforms – best-in-class AI, data, payments, and sharing.  
- **Security & Performance:** strong access controls, fast edge compute, local caching, efficient queries – smooth, safe user experience.

Together, these technologies power CookCam’s core loops (scan, filter, cook, share, earn XP/streaks) and enable us to deliver a playful, data-driven cooking app that grows with its community.

Thank you for exploring our tech stack! Reach out with any questions or feedback.
