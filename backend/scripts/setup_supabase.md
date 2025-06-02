# Supabase Setup Guide for CookCam

## Prerequisites
1. Complete the OAuth process by visiting: https://backend.composio.dev/api/v3/s/UgqlX-j3
2. Have access to the Supabase dashboard
3. Ensure Node.js is installed (for Edge Functions)

## Setup Steps

### 1. Create Supabase Project
Once OAuth is complete, we'll create a new project for CookCam with these specifications:
- **Project Name**: CookCam
- **Database Password**: [Generate a strong password]
- **Region**: Choose closest to your target users (e.g., us-east-1)
- **Instance Size**: Free tier to start, upgrade as needed

### 2. Database Setup
Run the migration files in order:

1. **Core Schema** (`001_core_schema.sql`):
   - Creates all tables with gamification fields
   - Enables extensions (uuid-ossp, pgvector)
   - Sets up indexes for performance

2. **RLS Policies** (`002_rls_policies.sql`):
   - Implements Row Level Security
   - Ensures users can only access their own data
   - Makes public content accessible

3. **Seed Data** (`003_seed_data.sql`):
   - Populates achievements
   - Adds sample ingredients
   - Creates initial challenges

### 3. Storage Buckets
Create the following buckets in Supabase Storage:

```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
('scan-images', 'scan-images', true),
('recipe-images', 'recipe-images', true),
('checkin-photos', 'checkin-photos', false),
('user-avatars', 'user-avatars', true),
('achievement-icons', 'achievement-icons', true);
```

### 4. Edge Functions Setup
We'll create Edge Functions for our API endpoints:

#### `/scan` Function
```typescript
// supabase/functions/scan/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Implementation for scanning ingredients
})
```

#### `/recipes` Function
```typescript
// supabase/functions/recipes/index.ts
// Recipe generation and management
```

#### `/xp-sync` Function
```typescript
// supabase/functions/xp-sync/index.ts
// Batch XP updates and level calculations
```

### 5. Environment Variables
Set these in your Supabase project settings:

```
OPENAI_API_KEY=your_openai_key
USDA_API_KEY=your_usda_key
STRIPE_SECRET_KEY=your_stripe_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

### 6. Authentication Setup
1. Enable Email/Password authentication
2. Configure email templates for:
   - Welcome email with XP bonus
   - Password reset
   - Magic link login

### 7. Database Functions
Create helper functions for complex operations:

```sql
-- Function to calculate user level from XP
CREATE OR REPLACE FUNCTION calculate_level(total_xp INT)
RETURNS INT AS $$
BEGIN
  -- Level calculation logic
  RETURN FLOOR(SQRT(total_xp / 50)) + 1;
END;
$$ LANGUAGE plpgsql;

-- Function to check and update streaks
CREATE OR REPLACE FUNCTION update_user_streak(user_id UUID)
RETURNS void AS $$
-- Streak logic
$$ LANGUAGE plpgsql;
```

### 8. Scheduled Jobs (using pg_cron)
```sql
-- Daily streak check at midnight
SELECT cron.schedule('check-streaks', '0 0 * * *', $$
  SELECT update_user_streak(id) FROM users WHERE last_active > now() - interval '2 days';
$$);

-- Update leaderboards every 5 minutes
SELECT cron.schedule('update-leaderboards', '*/5 * * * *', $$
  -- Leaderboard update logic
$$);
```

### 9. Real-time Subscriptions
Enable real-time for these tables:
- `recipes` (for live view counts)
- `leaderboards` (for rank changes)
- `user_follows` (for social activity)

### 10. Testing
1. Create test users
2. Run through core flows:
   - Sign up with referral code
   - Scan ingredients
   - Generate recipes
   - Earn XP and level up
   - Claim recipe as creator
   - Rate recipes
   - Check leaderboards

## Next Steps
1. Connect the React Native app to Supabase
2. Implement Edge Functions
3. Set up monitoring and analytics
4. Configure push notifications
5. Test all gamification features

## Security Checklist
- [ ] RLS policies tested and working
- [ ] API rate limiting configured
- [ ] Secrets stored securely
- [ ] CORS settings appropriate
- [ ] Backup strategy in place 