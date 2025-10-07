# Leaderboard XP Issue - Root Cause & Solution

## 🔍 Root Cause Analysis

**Issue**: Daily and weekly leaderboards show empty despite user gaining XP

**Root Cause**: Row-Level Security (RLS) policies are preventing the `add_user_xp` SQL function from properly inserting XP transaction records into the `user_progress` table.

### Evidence:
1. ✅ User's total XP is increasing (3046 → 3050) 
2. ❌ All `user_progress` entries show `xp_gained: 0`
3. ❌ Only session tracking events exist, no actual XP-awarding actions
4. ❌ Leaderboard system depends on `user_progress.xp_gained > 0` entries
5. ❌ RLS error: "new row violates row-level security policy for table user_progress"

## 🛠️ Immediate Solution

### Option 1: Fix RLS Policy (Recommended)
Execute this SQL in Supabase SQL Editor:

```sql
-- Allow the add_user_xp function to insert progress records
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Create policy for XP function
CREATE POLICY "Allow XP function to insert progress" ON user_progress
FOR INSERT WITH CHECK (true);

-- Or if you want more specific control:
CREATE POLICY "Allow authenticated XP inserts" ON user_progress
FOR INSERT TO authenticated WITH CHECK (true);
```

### Option 2: Modify Function to Use Security Definer
Execute this SQL to modify the function:

```sql
-- Recreate the add_user_xp function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION add_user_xp(
  p_user_id UUID,
  p_xp_amount INTEGER,
  p_action TEXT,
  p_metadata JSONB DEFAULT '{}'::JSONB
) RETURNS JSONB
SECURITY DEFINER  -- This allows function to bypass RLS
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_total_xp INTEGER;
  v_new_total_xp INTEGER;
  v_old_level INTEGER;
  v_new_level INTEGER;
  v_level_up BOOLEAN := FALSE;
  v_result JSONB;
BEGIN
  -- Get current user stats
  SELECT total_xp, level INTO v_old_total_xp, v_old_level
  FROM users WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;
  
  -- Calculate new XP and level
  v_new_total_xp := v_old_total_xp + p_xp_amount;
  v_new_level := FLOOR(v_new_total_xp / 100) + 1;  -- 100 XP per level
  v_level_up := v_new_level > v_old_level;
  
  -- Update user's total XP and level
  UPDATE users 
  SET total_xp = v_new_total_xp, level = v_new_level
  WHERE id = p_user_id;
  
  -- Insert progress record
  INSERT INTO user_progress (
    user_id, action, xp_gained, total_xp, old_level, new_level, metadata
  ) VALUES (
    p_user_id, p_action, p_xp_amount, v_new_total_xp, v_old_level, v_new_level, p_metadata
  );
  
  -- Return result
  v_result := jsonb_build_object(
    'user_id', p_user_id,
    'xp_gained', p_xp_amount,
    'old_total_xp', v_old_total_xp,
    'new_total_xp', v_new_total_xp,
    'old_level', v_old_level,
    'new_level', v_new_level,
    'level_up', v_level_up,
    'action', p_action
  );
  
  RETURN v_result;
END;
$$;
```

## 🧪 Testing the Fix

After applying either solution, test with:

```bash
# Test XP award
curl -X POST "http://localhost:3000/api/v1/gamification/test-award-xp" \
  -H "Content-Type: application/json" \
  -d '{"xp_amount": 5, "action": "test_daily_xp"}'

# Check if XP was recorded
curl "http://localhost:3000/api/v1/gamification/debug-xp" | jq '.recent_progress[0]'

# Test daily leaderboard
curl "http://localhost:3000/api/v1/gamification/leaderboard?period=daily&limit=5"
```

## 🎯 Expected Results

After the fix:
- ✅ `user_progress` entries will have `xp_gained > 0`
- ✅ Daily leaderboard will show users with today's XP
- ✅ Weekly leaderboard will show users with this week's XP  
- ✅ Period-specific leaderboards will work correctly

## 🔧 Production Fix Required

The main issue is that your app's XP-awarding actions aren't properly calling the XP functions due to RLS restrictions. Once the RLS policy is fixed, all XP-earning actions (scanning, completing recipes, etc.) will start properly recording in `user_progress` and the leaderboards will populate correctly.

**Next Steps:**
1. Apply the RLS policy fix in Supabase
2. Remove the temporary debug endpoints
3. Test XP-earning actions in your app
4. Verify leaderboards populate with real user activity 