# CookCam Codebase Cleanup Plan

## Overview
This document outlines all the files and documentation that can be safely cleaned up or reorganized.

## 1. Duplicate/Outdated Documentation Files to Remove

### Root Level Docs (Move to /docs)
- `/ANDROID_HEADER_OVERLAP_FIX.md` → Move to `/docs/fixes/`
- `/CREATOR_REFERRAL_SYSTEM_IMPLEMENTATION.md` → Move to `/docs/technical/features/`
- `/cursor_metrics.md` → DELETE (cursor-specific, not needed)
- `/DATABASE_ANALYSIS_SUMMARY.md` → Move to `/docs/technical/database/`
- `/DEPLOYMENT_STATUS_SUMMARY.md` → Move to `/docs/status/`
- `/EXPO_MIGRATION_COMPLETE.md` → Move to `/docs/migrations/`
- `/INGREDIENT_REVIEW_ANDROID_FIX.md` → Move to `/docs/fixes/`
- `/LEADERBOARD_SYSTEM_FIX.md` → Move to `/docs/fixes/`
- `/LEVEL_SYSTEM_REDESIGN.md` → Move to `/docs/technical/features/`
- `/MEAL_TYPE_IMPLEMENTATION_COMPLETE.md` → Move to `/docs/technical/features/`

### Backend Docs (Already documented in /docs)
- `/backend/CODE_CLEANUP_SUMMARY.md` → DELETE (task complete)
- `/backend/SUBSCRIPTION_ARCHITECTURE.md` → Keep (referenced by code)
- `/backend/api/guardrails-summary.md` → DELETE (AI tool specific)
- `/backend/api/LEADERBOARD_XP_ISSUE_SOLUTION.md` → Move to `/docs/fixes/`
- `/backend/api/seeding-restart-plan.md` → DELETE (task complete)
- `/backend/api/USDA_COMPLETE_SEEDING_GUIDE.md` → DELETE (duplicate of /docs version)
- `/backend/api/src/services/README-nutrition-integration.md` → Move to `/docs/technical/`

### Mobile Docs (Move to /docs/mobile)
- `/mobile/CookCam/COOKMODE_DECOMPOSITION_RESULTS.md` → Move to `/docs/technical/optimizations/`
- `/mobile/CookCam/CREATOR_SCREEN_DECOMPOSITION.md` → Move to `/docs/technical/optimizations/`
- `/mobile/CookCam/CREATOR_TIER_SYSTEM.md` → Move to `/docs/technical/features/`
- `/mobile/CookCam/ENHANCED_PREFERENCES_DECOMPOSITION.md` → Move to `/docs/technical/optimizations/`
- `/mobile/CookCam/IAP_SETUP_GUIDE.md` → DELETE (duplicate of /docs version)
- `/mobile/CookCam/INGREDIENT_REVIEW_DECOMPOSITION.md` → Move to `/docs/technical/optimizations/`
- `/mobile/CookCam/OPTIMIZATION_PHASE_5_RESULTS.md` → Move to `/docs/technical/optimizations/`
- `/mobile/CookCam/OPTIMIZATION_RESULTS.md` → Move to `/docs/technical/optimizations/`
- `/mobile/CookCam/STRIPE_CONNECT_CREATOR_KYC.md` → Move to `/docs/technical/features/`
- `/mobile/CookCam/SUBSCRIPTION_LIFECYCLE_MANAGEMENT.md` → Move to `/docs/technical/features/`
- `/mobile/CookCam/TOKEN_EXPIRATION_GUIDE.md` → Move to `/docs/technical/`

## 2. Duplicate Migration Files to Remove

### Subscription Setup Duplicates
- `/backend/supabase/migrations/03c_insert_subscription_data.sql` → DELETE (replaced by _fixed version)
- `/backend/supabase/migrations/03_check_table_structure.sql` → DELETE (diagnostic file)
- `/backend/supabase/migrations/03d_simple_insert.sql` → DELETE (temporary fix)

### Index Creation Duplicates
- `/backend/supabase/migrations/07_create_indexes.sql` → DELETE (replaced by _safe version)
- `/backend/supabase/migrations/07_create_indexes_simple.sql` → DELETE (temporary version)
- `/backend/supabase/migrations/07_check_tables.sql` → DELETE (diagnostic file)

### Leaderboard System Duplicates
- `/backend/supabase/migrations/create_leaderboard_system.sql` → DELETE
- `/backend/supabase/migrations/create_leaderboard_system_fixed.sql` → DELETE
- `/backend/supabase/migrations/create_leaderboard_system_type_safe.sql` → DELETE
(Keep only `create_leaderboard_system_final.sql`)

### Other Duplicates
- `/backend/supabase/migrations/fix_level_calculation.sql` → DELETE (replaced by _and_leaderboards version)
- `/backend/supabase/migrations/fix_rls_policies.sql` → DELETE (replaced by fix_missing_rls_policies.sql)
- `/backend/supabase/migrations/safe_rls_fix.sql` → DELETE (temporary fix)
- `/backend/supabase/migrations/consolidate_subscription_tables.sql` → DELETE (replaced by create_iap_tables.sql)
- `/backend/supabase/migrations/create_referral_attribution_table.sql` → DELETE (duplicate of 07_ version)

### Migration Docs to Move
- `/backend/supabase/migrations/database_cleanup_plan.md` → Move to `/docs/migrations/`
- `/backend/supabase/migrations/migration_implementation_report.md` → Move to `/docs/migrations/`
- `/backend/supabase/migrations/migration_testing_guide.md` → Move to `/docs/migrations/`

## 3. Proposed Documentation Structure

```
/docs/
├── README.md (Hub - already exists)
├── compliance/           # Legal & Privacy (exists)
├── fixes/               # NEW - Consolidated fix documentation
├── migrations/          # NEW - Migration history
├── mobile/              # NEW - Mobile-specific docs
├── planning/            # Future roadmap (exists)
├── setup/               # Development setup (exists)
├── status/              # Project status (exists)
├── technical/           # Architecture (exists)
│   ├── database/        # NEW - Database specific
│   ├── features/        # NEW - Feature implementations
│   └── optimizations/   # NEW - Performance optimizations
└── user-experience/     # UX docs (exists)
```

## 4. Files to Keep (Important References)

### Critical Documentation
- `/backend/SUBSCRIPTION_ARCHITECTURE.md` - Referenced by code
- `/mobile/CookCam/src/services/README.md` - Service documentation
- `/README.md` - Root project readme
- `/website/README.md` - Website documentation
- `/mobile/CookCam/.expo/README.md` - Expo specific

### Active Migration Files (In Order)
1. `01_create_basic_tables.sql`
2. `02_create_functions.sql`
3. `03_setup_subscription_tiers.sql`
4. `03a_create_subscription_table.sql`
5. `03b_add_subscription_columns.sql`
6. `03c_insert_subscription_data_fixed.sql`
7. `06_setup_rls_policies.sql`
8. `07_create_indexes_safe.sql`
9. `07_create_referral_attribution_table.sql`
10. `20241201_enhanced_preferences.sql`
11. `add_comprehensive_nutrition_columns.sql`
12. `add_user_xp_function.sql`
13. `complete_database_setup.sql`
14. `create_iap_tables.sql`
15. `create_leaderboard_system_final.sql`
16. `create_stripe_connect_tables.sql`
17. `create_user_profile_trigger.sql`
18. `drop_unused_tables.sql`
19. `fix_function_search_paths.sql`
20. `fix_level_calculation_and_leaderboards.sql`
21. `fix_missing_rls_policies.sql`
22. `fix_security_definer_views.sql`
23. `fix_xp_rls_policy.sql`

## 5. Summary Statistics

- **Total .md files found**: 74 (excluding node_modules)
- **Documentation files to delete**: 23
- **Documentation files to move**: 28
- **Documentation files to keep in place**: 23
- **SQL migrations to delete**: 10
- **SQL migrations to keep**: 23
- **Backend scripts to delete**: 19
- **Backend scripts to keep**: 10
- **Frontend components needing attention**: 1 (StreakCalendar)

## 6. Unused Code Files to Clean Up

### Backend Scripts (One-time use, can be removed)
- `/backend/api/src/scripts/add-fdc-id-constraint.sql` → DELETE (migration complete)
- `/backend/api/src/scripts/add-nutrition-columns.sql` → DELETE (migration complete)
- `/backend/api/src/scripts/create-gamification-tables.ts` → KEEP (reference)
- `/backend/api/src/scripts/create-leaderboard-system.sql` → DELETE (migration complete)
- `/backend/api/src/scripts/create-missing-tables.sql` → DELETE (tables created)
- `/backend/api/src/scripts/create-social-schema.sql` → DELETE (social features removed)
- `/backend/api/src/scripts/create-subscription-schema.sql` → DELETE (migration complete)
- `/backend/api/src/scripts/create-test-recipe.ts` → DELETE (testing script)
- `/backend/api/src/scripts/disable-rls-for-seeding.sql` → KEEP (utility)
- `/backend/api/src/scripts/enable-rls-after-seeding.sql` → KEEP (utility)
- `/backend/api/src/scripts/environment-check.ts` → KEEP (utility)
- `/backend/api/src/scripts/fix-ingredient-scans-rls.sql` → DELETE (migration complete)
- `/backend/api/src/scripts/fix-xp-function-overloading.ts` → DELETE (fix applied)
- `/backend/api/src/scripts/monitor-usda-seeding.ts` → DELETE (one-time use)
- `/backend/api/src/scripts/quick-db-status.ts` → KEEP (utility)
- `/backend/api/src/scripts/remove-fdc-foreign-key.sql` → DELETE (migration complete)
- `/backend/api/src/scripts/seed-production-data.ts` → KEEP (may need for reset)
- `/backend/api/src/scripts/seed-recipes.sql` → DELETE (use .ts version)
- `/backend/api/src/scripts/seed-recipes.ts` → KEEP (seeding utility)
- `/backend/api/src/scripts/seeding-monitor.ts` → DELETE (one-time use)
- `/backend/api/src/scripts/setup-usda.ts` → KEEP (setup utility)
- `/backend/api/src/scripts/simple-seed.sql` → DELETE (testing)
- `/backend/api/src/scripts/test-*.ts` → DELETE ALL (testing scripts)
- `/backend/api/src/scripts/usda-bulk-seeder.ts` → DELETE (use complete-usda-seeder.ts)

### Frontend Components (Check usage)
- `/mobile/CookCam/src/components/StreakCalendar.tsx` → USED in ProfileScreen
- Currently references dropped `daily_checkins` table
- **ACTION**: Either remove from ProfileScreen or update to use different data source

## 7. Execution Order

1. Create new subdirectories in /docs
2. Move documentation files to appropriate locations
3. Delete redundant migration files
4. Delete completed task documentation
5. Delete unused backend scripts
6. Update any references in code if needed
7. Verify no broken links in documentation
8. Check if StreakCalendar component is still used

## Notes

- All "DELETE" items are either duplicates, completed one-time tasks, or tool-specific files
- All important documentation is being preserved and better organized
- Migration files are being deduplicated while keeping the final working versions
- The new structure follows the existing /docs organization pattern