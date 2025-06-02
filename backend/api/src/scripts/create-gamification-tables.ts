import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function createGamificationTables() {
  console.log('🎮 Creating CookCam Gamification Tables...');
  
  const tables = [
    {
      name: 'users',
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT UNIQUE NOT NULL,
          name TEXT,
          avatar_url TEXT,
          level INT NOT NULL DEFAULT 1,
          xp INT NOT NULL DEFAULT 0,
          total_xp INT NOT NULL DEFAULT 0,
          streak_current INT DEFAULT 0,
          streak_shields INT DEFAULT 0,
          is_creator BOOLEAN DEFAULT FALSE,
          creator_tier INT DEFAULT 0,
          follower_count INT DEFAULT 0,
          preferences JSONB DEFAULT '{}',
          last_active TIMESTAMPTZ DEFAULT now(),
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
      `
    },
    {
      name: 'user_progress',
      sql: `
        CREATE TABLE IF NOT EXISTS user_progress (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          action TEXT NOT NULL,
          xp_gained INT NOT NULL,
          total_xp INT NOT NULL,
          old_level INT NOT NULL,
          new_level INT NOT NULL,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `
    },
    {
      name: 'streaks',
      sql: `
        CREATE TABLE IF NOT EXISTS streaks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          streak_date DATE NOT NULL,
          completed BOOLEAN DEFAULT FALSE,
          shield_used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE(user_id, streak_date)
        );
      `
    },
    {
      name: 'achievements',
      sql: `
        CREATE TABLE IF NOT EXISTS achievements (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          key TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          icon_url TEXT,
          category TEXT NOT NULL,
          xp_reward INT DEFAULT 0,
          rarity TEXT DEFAULT 'common',
          requirements JSONB NOT NULL,
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `
    },
    {
      name: 'user_achievements',
      sql: `
        CREATE TABLE IF NOT EXISTS user_achievements (
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
          progress INT DEFAULT 0,
          completed BOOLEAN DEFAULT FALSE,
          completed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT now(),
          PRIMARY KEY(user_id, achievement_id)
        );
      `
    },
    {
      name: 'mystery_boxes',
      sql: `
        CREATE TABLE IF NOT EXISTS mystery_boxes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          rarity TEXT NOT NULL,
          reward_type TEXT NOT NULL,
          reward_value JSONB NOT NULL,
          opened_at TIMESTAMPTZ DEFAULT now()
        );
      `
    },
    {
      name: 'daily_checkins',
      sql: `
        CREATE TABLE IF NOT EXISTS daily_checkins (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          photo_url TEXT NOT NULL,
          suggested_recipe TEXT,
          checkin_date DATE NOT NULL,
          xp_earned INT DEFAULT 5,
          created_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE(user_id, checkin_date)
        );
      `
    },
    {
      name: 'recipes',
      sql: `
        CREATE TABLE IF NOT EXISTS recipes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL,
          description TEXT,
          cuisine TEXT,
          difficulty TEXT,
          prep_time INT,
          cook_time INT,
          servings INT,
          ingredients JSONB NOT NULL,
          instructions JSONB NOT NULL,
          macros JSONB,
          image_url TEXT,
          is_claimed BOOLEAN DEFAULT FALSE,
          creator_id UUID REFERENCES users(id),
          view_count INT DEFAULT 0,
          rating_avg DECIMAL(3,2) DEFAULT 0,
          rating_count INT DEFAULT 0,
          trending_score INT DEFAULT 0,
          tags TEXT[],
          ai_metadata JSONB,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        );
      `
    },
    {
      name: 'recipe_claims',
      sql: `
        CREATE TABLE IF NOT EXISTS recipe_claims (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
          creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
          xp_earned INT DEFAULT 100,
          claimed_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE(recipe_id)
        );
      `
    },
    {
      name: 'recipe_ratings',
      sql: `
        CREATE TABLE IF NOT EXISTS recipe_ratings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          overall_rating INT NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
          taste_rating INT CHECK (taste_rating >= 1 AND taste_rating <= 5),
          difficulty_rating INT CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
          accuracy_rating INT CHECK (accuracy_rating >= 1 AND accuracy_rating <= 5),
          review_text TEXT,
          is_helpful BOOLEAN DEFAULT FALSE,
          helpful_count INT DEFAULT 0,
          xp_earned INT DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE(recipe_id, user_id)
        );
      `
    },
    {
      name: 'favorites',
      sql: `
        CREATE TABLE IF NOT EXISTS favorites (
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
          collection_name TEXT DEFAULT 'General',
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT now(),
          PRIMARY KEY(user_id, recipe_id)
        );
      `
    },
    {
      name: 'creator_tiers',
      sql: `
        CREATE TABLE IF NOT EXISTS creator_tiers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          tier INT NOT NULL,
          tier_name TEXT NOT NULL,
          achieved_at TIMESTAMPTZ DEFAULT now()
        );
      `
    },
    {
      name: 'referral_codes',
      sql: `
        CREATE TABLE IF NOT EXISTS referral_codes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
          code TEXT UNIQUE NOT NULL,
          uses INT DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `
    },
    {
      name: 'commissions',
      sql: `
        CREATE TABLE IF NOT EXISTS commissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          amount_cents INT NOT NULL,
          period DATE NOT NULL,
          paid BOOLEAN DEFAULT FALSE,
          paid_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `
    },
    {
      name: 'leaderboards',
      sql: `
        CREATE TABLE IF NOT EXISTS leaderboards (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          type TEXT NOT NULL,
          period TEXT NOT NULL,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          rank INT NOT NULL,
          xp_total INT NOT NULL,
          movement INT DEFAULT 0,
          updated_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE(type, period, user_id)
        );
      `
    },
    {
      name: 'challenges',
      sql: `
        CREATE TABLE IF NOT EXISTS challenges (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL,
          description TEXT,
          type TEXT NOT NULL,
          requirements JSONB NOT NULL,
          xp_reward INT NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `
    },
    {
      name: 'user_challenges',
      sql: `
        CREATE TABLE IF NOT EXISTS user_challenges (
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
          progress INT DEFAULT 0,
          completed BOOLEAN DEFAULT FALSE,
          completed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT now(),
          PRIMARY KEY(user_id, challenge_id)
        );
      `
    },
    {
      name: 'scans',
      sql: `
        CREATE TABLE IF NOT EXISTS scans (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          image_url TEXT NOT NULL,
          ingredients_detected INT DEFAULT 0,
          xp_earned INT DEFAULT 10,
          mystery_box_triggered BOOLEAN DEFAULT FALSE,
          scan_metadata JSONB,
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `
    }
  ];

  // Create indexes for performance
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_users_level_xp ON users(level DESC, xp DESC);',
    'CREATE INDEX IF NOT EXISTS idx_users_creator ON users(is_creator, creator_tier) WHERE is_creator = true;',
    'CREATE INDEX IF NOT EXISTS idx_recipes_creator ON recipes(creator_id, created_at DESC) WHERE creator_id IS NOT NULL;',
    'CREATE INDEX IF NOT EXISTS idx_recipes_trending ON recipes(trending_score DESC);',
    'CREATE INDEX IF NOT EXISTS idx_leaderboards_lookup ON leaderboards(type, period, rank);',
    'CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id, created_at DESC);',
    'CREATE INDEX IF NOT EXISTS idx_streaks_user_date ON streaks(user_id, streak_date DESC);',
    'CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category, rarity);',
    'CREATE INDEX IF NOT EXISTS idx_recipe_ratings_recipe ON recipe_ratings(recipe_id, overall_rating DESC);'
  ];

  try {
    // Create tables
    for (const table of tables) {
      console.log(`📝 Creating table: ${table.name}`);
      
      const { error } = await supabase.rpc('exec_sql', {
        sql: table.sql
      });

      if (error) {
        console.error(`❌ Error creating ${table.name}:`, error);
      } else {
        console.log(`✅ Created table: ${table.name}`);
      }
    }

    // Create indexes
    console.log('\n📊 Creating performance indexes...');
    for (const indexSQL of indexes) {
      const { error } = await supabase.rpc('exec_sql', {
        sql: indexSQL
      });

      if (error) {
        console.error(`❌ Error creating index:`, error);
      } else {
        console.log(`✅ Created index`);
      }
    }

    // Insert default achievements
    console.log('\n🏆 Inserting default achievements...');
    const defaultAchievements = [
      {
        key: 'first_scan',
        name: 'First Scan',
        description: 'Complete your first ingredient scan',
        category: 'scanning',
        xp_reward: 50,
        rarity: 'common',
        requirements: { scans: 1 }
      },
      {
        key: 'recipe_master',
        name: 'Recipe Master',
        description: 'Generate 10 recipes',
        category: 'recipes',
        xp_reward: 200,
        rarity: 'rare',
        requirements: { recipes_generated: 10 }
      },
      {
        key: 'streak_warrior',
        name: 'Streak Warrior',
        description: 'Maintain a 7-day streak',
        category: 'engagement',
        xp_reward: 300,
        rarity: 'epic',
        requirements: { streak_days: 7 }
      },
      {
        key: 'social_butterfly',
        name: 'Social Butterfly',
        description: 'Follow 5 creators',
        category: 'social',
        xp_reward: 100,
        rarity: 'uncommon',
        requirements: { follows: 5 }
      }
    ];

    for (const achievement of defaultAchievements) {
      const { error } = await supabase
        .from('achievements')
        .insert(achievement);

      if (error && !error.message.includes('duplicate key')) {
        console.error(`❌ Error inserting achievement ${achievement.key}:`, error);
      } else {
        console.log(`✅ Inserted achievement: ${achievement.name}`);
      }
    }

    console.log('\n🎉 Gamification tables created successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • ${tables.length} tables created`);
    console.log(`   • ${indexes.length} indexes created`);
    console.log(`   • ${defaultAchievements.length} default achievements added`);
    console.log('\n🔧 Next steps:');
    console.log('   1. Test API endpoints');
    console.log('   2. Connect frontend to backend');
    console.log('   3. Enable RLS policies');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  createGamificationTables()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export { createGamificationTables }; 