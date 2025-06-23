# CookCam Database Schema Documentation

*Last Updated: January 9, 2025*

## Overview

This document outlines the complete database schema for the CookCam application, built on PostgreSQL using Supabase. The schema supports core features including ingredient scanning, recipe management, gamification, user progress tracking, social features, creator monetization, and analytics.

## Schema Statistics

- **Total Tables**: 52+
- **Core Entities**: Users, Ingredients, Recipes, Scans
- **Recipe Generation**: Two-Step AI Generation (Previews → Detailed), Cooking Sessions
- **Gamification**: Achievements, Challenges, Leaderboards, Streaks, Mystery Boxes
- **Creator Economy**: Revenue Tracking, Payouts, Affiliate Links, Premium Collections
- **Subscription & IAP**: Receipt Validation, Purchase Tracking, Subscription Events, Webhook Logs
- **Analytics**: Events, Metrics, Error Logs, Performance Monitoring
- **Preferences**: Kitchen Appliances, Meal Planning, Notifications
- **External Integration**: USDA Food Data Central
- **Security**: Row-Level Security (RLS) policies on all user data tables

---

## Core Tables

### 1. `users`
Primary user account information and progress tracking with enhanced preferences.

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
| default_serving_size | integer | YES | 2 | Default number of people cooking for |
| meal_prep_enabled | boolean | YES | false | User does meal prep |
| default_meal_prep_count | integer | YES | 4 | Default number of meal prep portions |
| kitchen_appliances | jsonb | YES | '["oven", "stove"]'::jsonb | Available kitchen appliances |
| dietary_preferences | jsonb | YES | '[]'::jsonb | Stored dietary preferences |
| cuisine_preferences | jsonb | YES | '[]'::jsonb | Preferred cuisine types |
| cooking_skill_level | text | YES | 'beginner' | User's cooking skill level |
| created_at | timestamp with time zone | YES | now() | Account creation date |

### 2. `user_cooking_sessions`
Individual cooking session preferences and equipment selection.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | YES | null | User ID |
| serving_size | integer | NO | null | People cooking for this session |
| meal_prep_portions | integer | YES | null | Meal prep portions (if applicable) |
| selected_appliances | jsonb | NO | null | Appliances available for this session |
| dietary_restrictions | jsonb | YES | '[]'::jsonb | Session-specific dietary needs |
| time_available | text | YES | 'medium' | Available cooking time |
| difficulty_preference | text | YES | 'any' | Preferred difficulty level |
| cuisine_preference | jsonb | YES | '[]'::jsonb | Session cuisine preferences |
| created_at | timestamp with time zone | YES | now() | Session timestamp |

### 3. `kitchen_appliances`
Master list of available kitchen appliances.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | null | Appliance name |
| category | text | NO | null | Appliance category |
| icon | text | YES | null | Icon identifier |
| description | text | YES | null | Appliance description |
| cooking_methods | jsonb | YES | '[]'::jsonb | Supported cooking methods |
| popular | boolean | YES | true | Common appliance flag |
| created_at | timestamp with time zone | YES | now() | Record creation |

### 4. `ingredients`
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

### 5. `recipes`
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

### 6. `scans`
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

### 7. `ingredient_scans`
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

### 8. `recipe_sessions`
AI recipe generation sessions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | YES | null | Session owner |
| input_data | jsonb | NO | null | User input (ingredients, preferences) |
| suggestions | jsonb | NO | null | AI-generated recipes |
| created_at | timestamp with time zone | YES | now() | Session timestamp |

### 9. `cooking_sessions`
Two-step recipe generation session tracking (Step 1: Previews → Step 2: Detailed).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| session_id | text | NO | null | Unique session identifier |
| user_id | uuid | YES | null | Session owner |
| original_ingredients | jsonb | NO | null | Scanned ingredients list |
| user_preferences | jsonb | NO | null | Cooking preferences for session |
| previews_generated | integer | YES | 0 | Number of previews created |
| completed | boolean | YES | false | Session completion status |
| selected_preview_id | text | YES | null | Preview selected for detailed generation |
| detailed_recipe_id | uuid | YES | null | Final detailed recipe ID |
| created_at | timestamp with time zone | YES | now() | Session start timestamp |
| completed_at | timestamp with time zone | YES | null | Session completion timestamp |

### 10. `recipe_previews`
Recipe preview data from Step 1 of two-step generation.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| preview_id | text | NO | null | Preview identifier (unique per session) |
| session_id | text | NO | null | Associated cooking session |
| user_id | uuid | YES | null | Preview owner |
| title | text | NO | null | Recipe title |
| description | text | YES | null | Brief recipe description |
| estimated_time | integer | YES | 30 | Estimated cooking time (minutes) |
| difficulty | text | YES | 'easy' | Difficulty level |
| cuisine_type | text | YES | 'International' | Cuisine category |
| main_ingredients | jsonb | YES | '[]'::jsonb | Key ingredients used |
| appeal_factors | jsonb | YES | '[]'::jsonb | Why this recipe appeals |
| selected_for_details | boolean | YES | false | Preview selected for Step 2 |
| created_at | timestamp with time zone | YES | now() | Preview creation timestamp |

---

## Gamification Tables

### 11. `achievements`
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

### 12. `user_achievements`
User progress on achievements.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| user_id | uuid | YES | null | User ID |
| achievement_id | uuid | YES | null | Achievement ID |
| progress | integer | YES | 0 | Current progress |
| completed | boolean | YES | false | Completion status |
| completed_at | timestamp with time zone | YES | null | Completion timestamp |
| created_at | timestamp with time zone | YES | now() | Progress start |

### 13. `challenges`
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

### 14. `user_challenges`
User participation in challenges.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| user_id | uuid | YES | null | User ID |
| challenge_id | uuid | YES | null | Challenge ID |
| progress | integer | YES | 0 | Current progress |
| completed | boolean | YES | false | Completion status |
| completed_at | timestamp with time zone | YES | null | Completion timestamp |
| created_at | timestamp with time zone | YES | now() | Participation start |

### 15. `leaderboards`
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

### 16. `streaks`
Daily activity streak tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | YES | null | User ID |
| streak_date | date | NO | null | Streak date |
| completed | boolean | YES | false | Day completed |
| shield_used | boolean | YES | false | Shield protection used |
| created_at | timestamp with time zone | YES | now() | Record creation |

### 17. `mystery_boxes`
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

## Subscription & In-App Purchase Tables

### 30. `user_subscriptions`
Links users to subscription tiers with provider information.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | YES | null | User ID |
| tier_id | integer | YES | null | Subscription tier ID |
| status | text | YES | null | Subscription status |
| current_period_start | timestamp with time zone | YES | null | Period start date |
| current_period_end | timestamp with time zone | YES | null | Period end date |
| cancel_at_period_end | boolean | YES | null | Cancel flag |
| canceled_at | timestamp with time zone | YES | null | Cancellation date |
| provider | text | YES | null | Platform provider (ios/android) |
| provider_subscription_id | text | YES | null | Platform subscription ID |
| provider_customer_id | text | YES | null | Platform customer ID |
| created_at | timestamp with time zone | YES | now() | Creation timestamp |
| updated_at | timestamp with time zone | YES | null | Last update |

### 31. `subscription_tiers`
Available subscription tiers and their features.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | integer | NO | null | Primary key |
| name | text | YES | null | Tier name |
| slug | text | YES | null | Tier identifier |
| price_monthly | numeric | YES | null | Monthly price |
| price_yearly | numeric | YES | null | Yearly price |
| features | jsonb | YES | null | Feature list |
| is_active | boolean | YES | null | Active status |
| revenue_share_percentage | numeric | YES | null | Creator revenue share |
| limits | jsonb | YES | null | Usage limits |
| created_at | timestamp with time zone | YES | null | Creation timestamp |
| updated_at | timestamp with time zone | YES | null | Last update |

### 32. `subscriptions`
Platform-specific subscription records.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | YES | null | User ID |
| platform | text | YES | null | Platform (ios/android) |
| product_id | text | YES | null | Platform product ID |
| purchase_token | text | YES | null | Android purchase token |
| transaction_id | text | YES | null | iOS transaction ID |
| original_transaction_id | text | YES | null | iOS original transaction ID |
| status | text | YES | null | Subscription status |
| expires_at | timestamp with time zone | YES | null | Expiration date |
| auto_renewing | boolean | YES | null | Auto-renewal status |
| trial_end | timestamp with time zone | YES | null | Trial end date |
| created_at | timestamp with time zone | YES | null | Creation timestamp |
| updated_at | timestamp with time zone | YES | null | Last update |

### 33. `receipt_validation_logs`
**[NEW]** Tracks all receipt validation attempts for debugging and audit.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | NO | null | User ID |
| platform | text | NO | null | Platform (ios/android) |
| product_id | text | NO | null | Product ID |
| validation_attempt_id | uuid | YES | gen_random_uuid() | Unique attempt ID |
| receipt_data | text | YES | null | Receipt or purchase token |
| request_payload | jsonb | NO | null | Validation request data |
| validation_success | boolean | NO | null | Validation result |
| validation_response | jsonb | YES | null | Platform response |
| error_code | text | YES | null | Error code if failed |
| error_message | text | YES | null | Error message |
| apple_status_code | integer | YES | null | Apple App Store status |
| google_response_code | integer | YES | null | Google Play response code |
| response_time_ms | integer | YES | null | API response time |
| created_at | timestamp with time zone | YES | now() | Log timestamp |

### 34. `purchase_attempts`
**[NEW]** Tracks all purchase attempts including failures for analysis.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | NO | null | User ID |
| platform | text | NO | null | Platform (ios/android) |
| product_id | text | NO | null | Product ID |
| transaction_id | text | YES | null | iOS transaction ID |
| purchase_token | text | YES | null | Android purchase token |
| order_id | text | YES | null | Google Play order ID |
| status | text | NO | null | Purchase status |
| failure_reason | text | YES | null | Failure description |
| receipt_validated | boolean | YES | false | Validation status |
| validation_log_id | uuid | YES | null | Related validation log |
| price_amount_micros | bigint | YES | null | Price in micros |
| currency_code | text | YES | null | Currency code |
| purchase_initiated_at | timestamp with time zone | YES | now() | Purchase start |
| purchase_completed_at | timestamp with time zone | YES | null | Purchase completion |
| validated_at | timestamp with time zone | YES | null | Validation timestamp |
| created_at | timestamp with time zone | YES | now() | Record creation |
| updated_at | timestamp with time zone | YES | now() | Last update |

### 35. `subscription_events`
**[NEW]** Tracks subscription lifecycle events for analytics and debugging.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | NO | null | User ID |
| subscription_id | uuid | YES | null | Subscription ID |
| event_type | text | NO | null | Event type (purchased, renewed, etc.) |
| event_source | text | NO | null | Event source (app_store, google_play, etc.) |
| platform | text | NO | null | Platform (ios/android) |
| notification_type | text | YES | null | Webhook notification type |
| notification_data | jsonb | YES | null | Full webhook payload |
| amount_change_micros | bigint | YES | 0 | Financial impact |
| currency_code | text | YES | null | Currency code |
| effective_date | timestamp with time zone | YES | null | Event effective date |
| expiry_date | timestamp with time zone | YES | null | New expiry date |
| created_at | timestamp with time zone | YES | now() | Event timestamp |

### 36. `receipt_storage`
**[NEW]** Secure storage of platform receipts for audit and legal compliance.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | NO | null | User ID |
| purchase_attempt_id | uuid | YES | null | Related purchase attempt |
| platform | text | NO | null | Platform (ios/android) |
| receipt_hash | text | NO | null | Receipt hash for deduplication |
| receipt_data_encrypted | text | YES | null | Encrypted receipt data |
| validation_response_encrypted | text | YES | null | Encrypted validation response |
| receipt_size_bytes | integer | YES | null | Receipt size |
| storage_format | text | YES | 'base64' | Storage format |
| expires_at | timestamp with time zone | YES | (now() + interval '7 years') | Legal retention expiry |
| archived | boolean | YES | false | Archive status |
| created_at | timestamp with time zone | YES | now() | Storage timestamp |

### 37. `iap_webhook_logs`
**[NEW]** Logs incoming webhooks from Apple App Store and Google Play.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| platform | text | NO | null | Platform (ios/google_play) |
| webhook_type | text | NO | null | Webhook type |
| notification_id | text | YES | null | Platform notification ID |
| headers | jsonb | YES | null | HTTP headers |
| payload | jsonb | NO | null | Full webhook payload |
| signature | text | YES | null | Webhook signature |
| processed | boolean | YES | false | Processing status |
| processing_error | text | YES | null | Processing error |
| retry_count | integer | YES | 0 | Retry attempts |
| user_id | uuid | YES | null | Related user ID |
| subscription_id | uuid | YES | null | Related subscription ID |
| received_at | timestamp with time zone | YES | now() | Receipt timestamp |
| processed_at | timestamp with time zone | YES | null | Processing timestamp |

### 38. `subscription_history`
Tracks subscription tier changes and actions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | YES | null | User ID |
| subscription_id | uuid | YES | null | Subscription ID |
| action | text | YES | null | Action performed |
| from_tier_id | integer | YES | null | Previous tier |
| to_tier_id | integer | YES | null | New tier |
| metadata | jsonb | YES | null | Action metadata |
| created_at | timestamp with time zone | YES | null | Action timestamp |

---

## User Interaction Tables

### 18. `user_progress`
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

### 19. `daily_checkins`
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

### 20. `favorites`
User recipe collections and favorites.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | YES | null | User ID |
| recipe_id | uuid | YES | null | Recipe ID |
| collection_name | text | YES | 'General'::text | Collection name |
| notes | text | YES | null | User notes |
| created_at | timestamp with time zone | YES | now() | Favorite timestamp |

### 21. `saved_recipes`
Simple recipe bookmarking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | YES | null | User ID |
| recipe_id | uuid | YES | null | Recipe ID |
| created_at | timestamp with time zone | YES | now() | Save timestamp |

### 22. `recipe_ratings`
User ratings for recipes.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | YES | null | User ID |
| recipe_id | uuid | YES | null | Recipe ID |
| rating | integer | NO | null | Rating (1-5) |
| created_at | timestamp with time zone | YES | now() | Rating timestamp |

### 23. `user_follows`
Social following relationships.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| follower_id | uuid | YES | null | Following user ID |
| following_id | uuid | YES | null | Followed user ID |
| created_at | timestamp with time zone | YES | now() | Follow timestamp |

---

## Recipe System Tables

### 24. `recipe_ingredients`
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

### 25. `recipe_nutrition`
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

### 26. `usda_foods`
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

### 27. `usda_nutrients`
USDA nutrient definitions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | integer | NO | nextval('usda_nutrients_id_seq'::regclass) | Primary key |
| nutrient_id | integer | NO | null | USDA nutrient ID |
| name | text | NO | null | Nutrient name |
| unit_name | text | NO | null | Measurement unit |

### 28. `usda_food_nutrients`
USDA nutrient values for foods.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | integer | NO | nextval('usda_food_nutrients_id_seq'::regclass) | Primary key |
| fdc_id | integer | YES | null | Food ID |
| nutrient_id | integer | YES | null | Nutrient ID |
| amount | double precision | YES | null | Nutrient amount |

### 29. `usda_api_requests`
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

### Recipe Generation Relationships
- `users.id` → `cooking_sessions.user_id`
- `users.id` → `recipe_previews.user_id`
- `cooking_sessions.session_id` → `recipe_previews.session_id`
- `cooking_sessions.detailed_recipe_id` → `recipes.id`
- `recipe_previews.preview_id` → `cooking_sessions.selected_preview_id`

### Gamification Relationships
- `achievements.id` → `user_achievements.achievement_id`
- `challenges.id` → `user_challenges.challenge_id`
- `users.id` → `leaderboards.user_id`

### Social Relationships
- `users.id` → `user_follows.follower_id`
- `users.id` → `user_follows.following_id`
- `recipes.id` → `recipe_ratings.recipe_id`
- `users.id` → `recipe_ratings.user_id`

### Subscription & IAP Relationships
- `users.id` → `user_subscriptions.user_id`
- `subscription_tiers.id` → `user_subscriptions.tier_id`
- `users.id` → `subscriptions.user_id`
- `users.id` → `receipt_validation_logs.user_id`
- `users.id` → `purchase_attempts.user_id`
- `purchase_attempts.id` → `receipt_storage.purchase_attempt_id`
- `receipt_validation_logs.id` → `purchase_attempts.validation_log_id`
- `user_subscriptions.id` → `subscription_events.subscription_id`
- `user_subscriptions.id` → `subscription_history.subscription_id`

---

## Important Notes

### Data Types
- **UUID**: Used for all user-facing primary keys
- **JSONB**: Used for flexible data storage (nutrition, metadata, etc.)
- **Arrays**: Used for tags, instructions, and dietary flags
- **Timestamps**: All include timezone information

### Security & Access Control
- **Row-Level Security (RLS)**: Enabled on all user data tables
- **User Data Isolation**: Users can only access their own data (scans, recipes, sessions, etc.)
- **Public Recipe Access**: Published recipes are viewable by all authenticated users
- **Kitchen Appliances**: Readable by all authenticated users, admin-only modifications
- **Creator Permissions**: Recipe creation allowed for AI-generated recipes (`created_by IS NULL`)

### Performance Considerations
- Indexes added on frequently queried foreign keys and user_id columns
- Full-text search capabilities on `ingredients.searchable_text`
- Leaderboard queries may need optimization for large user bases
- Composite unique constraints on session-based data (`session_id`, `preview_id`)
- Optimized queries for two-step recipe generation workflow

### Recent Implementations (January 2025)
- ✅ Two-step recipe generation system (`cooking_sessions`, `recipe_previews`)
- ✅ Enhanced user preferences and appliance selection  
- ✅ Comprehensive RLS policies for data security
- ✅ Performance indexes for recipe generation workflow
- ✅ Session-based cooking experience tracking
- ✅ **IAP Receipt Validation System** (`receipt_validation_logs`, `purchase_attempts`, `subscription_events`, `receipt_storage`, `iap_webhook_logs`)
- ✅ **Comprehensive subscription tracking** with audit trails and webhook processing
- ✅ **Platform-specific receipt storage** with encryption and legal compliance (7-year retention)

### Future Enhancements
- Consider partitioning large tables like `user_progress` by date
- Add more detailed nutritional tracking with USDA integration
- Expand social features with comments and recipe sharing  
- Implement recipe versioning system
- Add advanced analytics tables for recipe performance tracking
- Consider caching layer for frequently accessed recipe data

---

*This schema supports the core CookCam functionality including ingredient scanning, two-step AI recipe generation, gamification systems, social features, and comprehensive security. The recent addition of the two-step recipe generation system provides fast preview generation followed by detailed recipe creation, significantly improving user experience and system performance.* 