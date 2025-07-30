# Database Cleanup and Security Fix Plan

## Overview
This plan addresses:
1. Unused tables that should be removed
2. Missing RLS policies for 11 tables
3. Security definer views that need fixing
4. Function search path security issues
5. Consolidation of duplicate subscription tables

## Phase 1: Identify Tables for Removal

### Tables to KEEP (actively used):
- `user_achievements` - Used in gamification routes
- `mystery_boxes` - Used in mystery box feature
- `affiliate_conversions` - Used in creator service
- `affiliate_link_clicks` - Used in creator service
- `collection_purchases` - Used for premium collections
- `premium_collections` - Used for creator content
- `recipe_tips` - Used for creator tips on recipes

### Tables to REMOVE (no backend usage found):
- `user_challenges` - No usage in codebase
- `streaks` - No backend implementation
- `daily_checkins` - No backend implementation
- `favorites` - Replaced by `saved_recipes`
- `user_follows` - No social features implemented

### Tables to REVIEW:
- `subscriptions` vs `user_subscriptions` - Both are used, need consolidation
  - `subscriptions` - Used in older subscription.ts
  - `user_subscriptions` - Used in newer subscriptionService.ts

## Phase 2: RLS Policies Needed

### Creator/Affiliate Tables:
1. **affiliate_conversions**
   - SELECT: Creators can see their own conversions
   - INSERT: Service role only
   - UPDATE: Service role only

2. **affiliate_link_clicks**
   - SELECT: Creators can see clicks on their links
   - INSERT: Public (anonymous tracking)
   - UPDATE: Service role only

3. **creator_affiliate_links**
   - SELECT: Creators can see their own links, public can verify links
   - INSERT: Creators can create their own
   - UPDATE: Creators can update their own

### Premium Content Tables:
4. **collection_purchases**
   - SELECT: Users see their purchases, creators see their sales
   - INSERT: Service role only (via API)
   - UPDATE: Service role only

5. **premium_collections**
   - SELECT: Public can view active collections
   - INSERT: Creators can create
   - UPDATE: Creators can update their own

6. **recipe_tips**
   - SELECT: Public can view
   - INSERT: Authenticated users
   - UPDATE: Users can update their own

### User Preference Tables:
7. **user_collection_recipes**
   - SELECT: Collection owners and purchasers
   - INSERT: Collection owners only
   - UPDATE: Collection owners only

8. **user_notification_preferences**
   - SELECT: Users see their own
   - INSERT: Users create their own
   - UPDATE: Users update their own

9. **user_recipe_collections**
   - SELECT: Users see their own, public see published
   - INSERT: Users create their own
   - UPDATE: Users update their own

### System Tables:
10. **feature_access**
    - SELECT: Public read
    - INSERT/UPDATE: Admin only

11. **iap_webhook_logs**
    - ALL: Service role only

12. **subscription_history**
    - SELECT: Users see their own
    - INSERT: Service role only

## Phase 3: Security Fixes

### Fix Security Definer Views:
- Remove SECURITY DEFINER from:
  - `daily_xp_summary`
  - `weekly_xp_summary` 
  - `monthly_xp_summary`

### Fix Function Search Paths:
Add `SET search_path = public, pg_temp` to all functions

## Phase 4: Implementation Order

1. **Create backup** of production database
2. **Apply RLS policies** for actively used tables
3. **Fix security definer views**
4. **Fix function search paths**
5. **Test in development**
6. **Consolidate subscription tables** (separate migration)
7. **Drop unused tables** (last step)

## Migration Files to Create:

1. `fix_missing_rls_policies.sql` - Add all missing RLS policies
2. `fix_security_definer_views.sql` - Remove SECURITY DEFINER from views
3. `fix_function_search_paths.sql` - Add search_path to all functions
4. `consolidate_subscription_tables.sql` - Migrate data and drop old table
5. `drop_unused_tables.sql` - Remove unused tables

## Testing Checklist:
- [ ] All API endpoints still work
- [ ] Creator features function properly
- [ ] Subscription management works
- [ ] XP/gamification system works
- [ ] Recipe generation works
- [ ] No RLS violations in logs