# Database Migration Testing Guide

## Overview
This guide ensures all database changes are properly tested before deployment to production.

## Migration Order
Apply migrations in this specific order:

1. `fix_missing_rls_policies.sql` - Adds RLS policies
2. `fix_security_definer_views.sql` - Fixes security issues with views
3. `fix_function_search_paths.sql` - Fixes function security
4. `consolidate_subscription_tables.sql` - Prepares subscription consolidation
5. `drop_unused_tables.sql` - Removes unused tables (LAST - after code updates)

## Pre-Migration Checklist

- [ ] Create full database backup
- [ ] Test migrations on a development branch first
- [ ] Review all migration files for syntax errors
- [ ] Ensure no active users during migration window

## Testing Procedures

### 1. Test RLS Policies
```javascript
// Test creator can view their own affiliate data
const { data: affiliateLinks } = await supabase
  .from('creator_affiliate_links')
  .select('*');

// Test creator can view their conversions
const { data: conversions } = await supabase
  .from('affiliate_conversions')
  .select('*');

// Test user can view their purchases
const { data: purchases } = await supabase
  .from('collection_purchases')
  .select('*');

// Test public can view active collections
const { data: collections } = await supabase
  .from('premium_collections')
  .select('*')
  .eq('is_active', true);
```

### 2. Test XP System Functions
```javascript
// Test XP addition still works
const { data: xpResult } = await supabase
  .rpc('add_user_xp', {
    p_user_id: userId,
    p_xp_amount: 10,
    p_action: 'test_action'
  });

// Test leaderboard views
const { data: leaderboard } = await supabase
  .from('daily_xp_summary')
  .select('*')
  .limit(10);
```

### 3. Test Creator Features
```javascript
// Test affiliate link generation
const response = await fetch('/api/creator/affiliate-links', {
  method: 'POST',
  body: JSON.stringify({
    campaignName: 'Test Campaign'
  })
});

// Test revenue calculation
const revenue = await fetch('/api/creator/revenue');
```

### 4. Test Subscription System
```javascript
// Test subscription lookup (should use user_subscriptions)
const { data: subscription } = await supabase
  .from('user_subscriptions')
  .select('*')
  .eq('user_id', userId)
  .single();

// Test subscription events still work
const { data: events } = await supabase
  .from('subscription_events')
  .select('*')
  .eq('user_id', userId);
```

### 5. Test Recipe Generation
```javascript
// Test ingredient scanning
const scanResponse = await fetch('/api/scan', {
  method: 'POST',
  body: JSON.stringify({ image: base64Image })
});

// Test recipe generation
const recipeResponse = await fetch('/api/recipes/generate', {
  method: 'POST',
  body: JSON.stringify({ ingredients: [...] })
});
```

## Post-Migration Verification

### Check for RLS Violations
```sql
-- Run in Supabase SQL Editor
SELECT 
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Verify Indexes Exist
```sql
SELECT 
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename;
```

### Check Function Security
```sql
SELECT 
  proname,
  prosecdef,
  proconfig
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('add_user_xp', 'get_performance_metrics');
```

## Rollback Plan

If issues occur, rollback in reverse order:

1. Restore from backup
2. Or manually reverse changes:

```sql
-- Revert RLS policies
DROP POLICY IF EXISTS "policy_name" ON table_name;

-- Revert view changes  
DROP VIEW IF EXISTS view_name;
CREATE VIEW view_name WITH (security_definer) AS ...;

-- Revert dropped tables (restore from backup)
```

## Backend Code Updates Required

After migrations, update these files:

1. **Remove references to dropped tables:**
   - `user_challenges`
   - `streaks`
   - `daily_checkins`
   - `favorites`
   - `user_follows`

2. **Update subscription references:**
   - Change `from('subscriptions')` to `from('user_subscriptions')`
   - Update any direct SQL queries

3. **Update type definitions:**
   - Remove interfaces for dropped tables
   - Update subscription types if needed

## Security Checklist

- [ ] All tables with RLS enabled have policies
- [ ] No SECURITY DEFINER views remain
- [ ] All functions have search_path set
- [ ] Service role is properly restricted
- [ ] Anonymous access is limited appropriately
- [ ] Enable leaked password protection in Supabase dashboard

## Monitoring

After deployment, monitor for:

- RLS policy violations in logs
- Failed API requests
- Performance degradation
- User complaints

## Success Criteria

- [ ] All API endpoints return successful responses
- [ ] No RLS violations in error logs
- [ ] Creator features work correctly
- [ ] Subscription management functions
- [ ] XP/gamification system operational
- [ ] Recipe generation works
- [ ] No performance degradation