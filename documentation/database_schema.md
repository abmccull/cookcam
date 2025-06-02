# CookCam Database Schema Documentation

*Last Updated: May 31, 2025*

## Overview

This document outlines the complete database schema for the CookCam application, built on PostgreSQL using Supabase. The schema supports core features including ingredient scanning, recipe management, gamification, user progress tracking, and social features.

## Schema Statistics

- **Total Tables**: 24
- **Core Entities**: Users, Ingredients, Recipes, Scans
- **Gamification**: Achievements, Challenges, Leaderboards, Streaks
- **External Integration**: USDA Food Data Central

---

## Core Tables

### 1. `users`
Primary user account information and progress tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| email | text | NO | null | User email address |
| name | text | YES | null | Display name |
| avatar_url | text | YES | null | Profile picture URL |
| level | integer | NO | 1 | Current user level |
| xp | integer | NO | 0 | Current XP points |
| total_xp | integer | NO | 0 | Lifetime XP earned |
| streak_current | integer | YES | 0 | Current daily streak |
| streak_shields | integer | YES | 0 | Available streak shields |
| is_creator | boolean | YES | false | Creator account flag |
| creator_tier | integer | YES | 0 | Creator tier level |
| created_at | timestamp with time zone | YES | now() | Account creation date |

### 2. `ingredients`
Comprehensive ingredient database with nutritional information.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | integer | NO | nextval('ingredients_id_seq'::regclass) | Primary key |
| name | text | NO | null | Ingredient name |
| fdc_id | integer | YES | null | USDA Food Data Central ID |
| category | text | YES | null | Food category |
| calories_per_100g | double precision | YES | null | Calories per 100g |
| protein_g_per_100g | double precision | YES | null | Protein content |
| carbs_g_per_100g | double precision | YES | null | Carbohydrate content |
| fat_g_per_100g | double precision | YES | null | Fat content |
| fiber_g_per_100g | double precision | YES | null | Fiber content |
| sodium_mg_per_100g | double precision | YES | null | Sodium content |
| sugar_g_per_100g | double precision | YES | null | Sugar content |
| calcium_mg_per_100g | double precision | YES | null | Calcium content |
| iron_mg_per_100g | double precision | YES | null | Iron content |
| vitamin_c_mg_per_100g | double precision | YES | null | Vitamin C content |
| searchable_text | text | YES | null | Full-text search field |
| tags | ARRAY | YES | null | Searchable tags |
| dietary_flags | ARRAY | YES | null | Dietary restrictions |
| usda_data_type | text | YES | null | USDA data type |
| usda_sync_date | timestamp with time zone | YES | null | Last USDA sync |
| created_at | timestamp with time zone | YES | now() | Record creation |
| updated_at | timestamp with time zone | YES | now() | Last update |

### 3. `recipes`
Recipe storage with AI-generated and user-created content.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| title | text | NO | null | Recipe title |
| description | text | YES | null | Recipe description |
| prep_time | integer | YES | null | Preparation time (minutes) |
| cook_time | integer | YES | null | Cooking time (minutes) |
| difficulty | text | YES | null | Difficulty level |
| servings | integer | YES | null | Number of servings |
| ingredients | jsonb | NO | null | Ingredients list |
| instructions | ARRAY | YES | null | Step-by-step instructions |
| nutrition | jsonb | YES | null | Nutritional information |
| tags | ARRAY | YES | null | Recipe tags |
| cuisine | text | YES | null | Cuisine type |
| created_by | uuid | YES | null | Creator user ID |
| is_generated | boolean | YES | false | AI-generated flag |
| is_published | boolean | YES | true | Published status |
| view_count | integer | YES | 0 | View counter |
| rating_avg | numeric | YES | 0 | Average rating |
| rating_count | integer | YES | 0 | Number of ratings |
| trending_score | numeric | YES | 0 | Trending algorithm score |
| is_featured | boolean | YES | false | Featured recipe flag |
| ai_metadata | jsonb | YES | null | AI generation metadata |
| created_at | timestamp with time zone | YES | now() | Creation timestamp |

---

## Scanning & Analysis Tables

### 4. `scans`
User image scans and basic metadata.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | YES | null | User who performed scan |
| image_url | text | NO | null | Scanned image URL |
| ingredients_detected | integer | YES | 0 | Number of ingredients found |
| xp_earned | integer | YES | 10 | XP awarded for scan |
| mystery_box_triggered | boolean | YES | false | Mystery box trigger flag |
| scan_metadata | jsonb | YES | null | Additional scan data |
| created_at | timestamp with time zone | YES | now() | Scan timestamp |

### 5. `ingredient_scans`
Detailed ingredient detection results.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | YES | null | User who performed scan |
| detected_ingredients | jsonb | NO | null | AI detection results |
| image_url | text | YES | null | Original image URL |
| confidence_score | double precision | YES | null | AI confidence level |
| scan_metadata | jsonb | YES | null | Detection metadata |
| created_at | timestamp with time zone | YES | now() | Detection timestamp |

### 6. `recipe_sessions`
AI recipe generation sessions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | YES | null | Session owner |
| input_data | jsonb | NO | null | User input (ingredients, preferences) |
| suggestions | jsonb | NO | null | AI-generated recipes |
| created_at | timestamp with time zone | YES | now() | Session timestamp |

---

## Gamification Tables

### 7. `achievements`
Available achievements and badges.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| key | text | NO | null | Unique achievement identifier |
| name | text | NO | null | Display name |
| description | text | YES | null | Achievement description |
| icon_url | text | YES | null | Achievement icon |
| category | text | NO | null | Achievement category |
| xp_reward | integer | YES | 0 | XP reward value |
| rarity | text | YES | 'common'::text | Rarity level |
| requirements | jsonb | NO | null | Unlock requirements |
| created_at | timestamp with time zone | YES | now() | Creation timestamp |

### 8. `user_achievements`
User progress on achievements.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| user_id | uuid | YES | null | User ID |
| achievement_id | uuid | YES | null | Achievement ID |
| progress | integer | YES | 0 | Current progress |
| completed | boolean | YES | false | Completion status |
| completed_at | timestamp with time zone | YES | null | Completion timestamp |
| created_at | timestamp with time zone | YES | now() | Progress start |

### 9. `challenges`
Time-limited challenges and events.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| title | text | NO | null | Challenge title |
| description | text | YES | null | Challenge description |
| type | text | NO | null | Challenge type |
| requirements | jsonb | NO | null | Completion requirements |
| xp_reward | integer | NO | null | XP reward |
| start_date | date | NO | null | Challenge start |
| end_date | date | NO | null | Challenge end |
| created_at | timestamp with time zone | YES | now() | Creation timestamp |

### 10. `user_challenges`
User participation in challenges.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| user_id | uuid | YES | null | User ID |
| challenge_id | uuid | YES | null | Challenge ID |
| progress | integer | YES | 0 | Current progress |
| completed | boolean | YES | false | Completion status |
| completed_at | timestamp with time zone | YES | null | Completion timestamp |
| created_at | timestamp with time zone | YES | now() | Participation start |

### 11. `leaderboards`
Competitive rankings and leaderboards.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| type | text | NO | null | Leaderboard type (global/friends) |
| period | text | NO | null | Time period (daily/weekly/monthly) |
| user_id | uuid | YES | null | User ID |
| rank | integer | NO | null | Current rank |
| xp_total | integer | NO | null | XP for period |
| movement | integer | YES | 0 | Rank change |
| updated_at | timestamp with time zone | YES | now() | Last update |

### 12. `streaks`
Daily activity streak tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | YES | null | User ID |
| streak_date | date | NO | null | Streak date |
| completed | boolean | YES | false | Day completed |
| shield_used | boolean | YES | false | Shield protection used |
| created_at | timestamp with time zone | YES | now() | Record creation |

### 13. `mystery_boxes`
Reward system mystery boxes.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | YES | null | User ID |
| rarity | text | NO | null | Box rarity |
| reward_type | text | NO | null | Reward type |
| reward_value | jsonb | NO | null | Reward details |
| opened_at | timestamp with time zone | YES | now() | Opening timestamp |

---

## User Interaction Tables

### 14. `user_progress`
Detailed XP and level progression tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | YES | null | User ID |
| action | text | NO | null | Action that earned XP |
| xp_gained | integer | NO | null | XP gained from action |
| total_xp | integer | NO | null | Total XP after action |
| old_level | integer | NO | null | Level before action |
| new_level | integer | NO | null | Level after action |
| metadata | jsonb | YES | '{}'::jsonb | Additional action data |
| created_at | timestamp with time zone | YES | now() | Action timestamp |

### 15. `daily_checkins`
Daily photo check-ins and suggested recipes.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | YES | null | User ID |
| photo_url | text | NO | null | Check-in photo |
| suggested_recipe | text | YES | null | AI recipe suggestion |
| checkin_date | date | NO | null | Check-in date |
| xp_earned | integer | YES | 5 | XP earned |
| created_at | timestamp with time zone | YES | now() | Check-in timestamp |

### 16. `favorites`
User recipe collections and favorites.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | YES | null | User ID |
| recipe_id | uuid | YES | null | Recipe ID |
| collection_name | text | YES | 'General'::text | Collection name |
| notes | text | YES | null | User notes |
| created_at | timestamp with time zone | YES | now() | Favorite timestamp |

### 17. `saved_recipes`
Simple recipe bookmarking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | YES | null | User ID |
| recipe_id | uuid | YES | null | Recipe ID |
| created_at | timestamp with time zone | YES | now() | Save timestamp |

### 18. `recipe_ratings`
User ratings for recipes.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | YES | null | User ID |
| recipe_id | uuid | YES | null | Recipe ID |
| rating | integer | NO | null | Rating (1-5) |
| created_at | timestamp with time zone | YES | now() | Rating timestamp |

### 19. `user_follows`
Social following relationships.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| follower_id | uuid | YES | null | Following user ID |
| following_id | uuid | YES | null | Followed user ID |
| created_at | timestamp with time zone | YES | now() | Follow timestamp |

---

## Recipe System Tables

### 20. `recipe_ingredients`
Structured ingredient relationships for recipes.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | integer | NO | nextval('recipe_ingredients_id_seq'::regclass) | Primary key |
| recipe_id | uuid | YES | null | Recipe ID |
| ingredient_id | integer | YES | null | Ingredient ID |
| quantity | double precision | YES | null | Amount needed |
| unit | text | YES | null | Measurement unit |
| preparation | text | YES | null | Preparation method |
| order_index | integer | YES | 0 | Display order |

### 21. `recipe_nutrition`
Calculated nutritional information for recipes.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| recipe_id | uuid | NO | null | Recipe ID (Primary key) |
| total_calories | double precision | YES | null | Total recipe calories |
| calories_per_serving | double precision | YES | null | Per-serving calories |
| protein_g | double precision | YES | null | Protein content |
| carbs_g | double precision | YES | null | Carbohydrate content |
| fat_g | double precision | YES | null | Fat content |
| fiber_g | double precision | YES | null | Fiber content |
| sodium_mg | double precision | YES | null | Sodium content |
| calculated_at | timestamp with time zone | YES | now() | Calculation timestamp |

---

## USDA Integration Tables

### 22. `usda_foods`
USDA Food Data Central foods database.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| fdc_id | integer | NO | null | USDA FDC ID (Primary key) |
| description | text | NO | null | Food description |
| data_type | text | NO | null | USDA data type |
| publication_date | date | YES | null | Publication date |
| brand_owner | text | YES | null | Brand owner |
| category | text | YES | null | Food category |
| created_at | timestamp with time zone | YES | now() | Import timestamp |
| updated_at | timestamp with time zone | YES | now() | Last update |

### 23. `usda_nutrients`
USDA nutrient definitions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | integer | NO | nextval('usda_nutrients_id_seq'::regclass) | Primary key |
| nutrient_id | integer | NO | null | USDA nutrient ID |
| name | text | NO | null | Nutrient name |
| unit_name | text | NO | null | Measurement unit |

### 24. `usda_food_nutrients`
USDA nutrient values for foods.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | integer | NO | nextval('usda_food_nutrients_id_seq'::regclass) | Primary key |
| fdc_id | integer | YES | null | Food ID |
| nutrient_id | integer | YES | null | Nutrient ID |
| amount | double precision | YES | null | Nutrient amount |

### 25. `usda_api_requests`
USDA API request logging and caching.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | integer | NO | nextval('usda_api_requests_id_seq'::regclass) | Primary key |
| endpoint | text | NO | null | API endpoint called |
| query_params | jsonb | YES | null | Request parameters |
| response_data | jsonb | YES | null | API response |
| status_code | integer | YES | null | HTTP status code |
| created_at | timestamp with time zone | YES | now() | Request timestamp |

---

## Key Relationships

### Primary Relationships
- `users.id` → `scans.user_id`
- `users.id` → `user_progress.user_id`
- `users.id` → `user_achievements.user_id`
- `recipes.id` → `recipe_ingredients.recipe_id`
- `ingredients.id` → `recipe_ingredients.ingredient_id`
- `ingredients.fdc_id` → `usda_foods.fdc_id`

### Gamification Relationships
- `achievements.id` → `user_achievements.achievement_id`
- `challenges.id` → `user_challenges.challenge_id`
- `users.id` → `leaderboards.user_id`

### Social Relationships
- `users.id` → `user_follows.follower_id`
- `users.id` → `user_follows.following_id`
- `recipes.id` → `recipe_ratings.recipe_id`
- `users.id` → `recipe_ratings.user_id`

---

## Important Notes

### Data Types
- **UUID**: Used for all user-facing primary keys
- **JSONB**: Used for flexible data storage (nutrition, metadata, etc.)
- **Arrays**: Used for tags, instructions, and dietary flags
- **Timestamps**: All include timezone information

### Performance Considerations
- Indexes should be added on frequently queried foreign keys
- Full-text search capabilities on `ingredients.searchable_text`
- Leaderboard queries may need optimization for large user bases

### Future Enhancements
- Consider partitioning large tables like `user_progress` by date
- Add more detailed nutritional tracking
- Expand social features with comments and recipe sharing
- Implement recipe versioning system

---

*This schema supports the core CookCam functionality including ingredient scanning, AI recipe generation, gamification systems, and social features. Regular updates to this documentation are recommended as the schema evolves.* 