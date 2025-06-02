-- Seed data for CookCam

-- Insert achievement definitions
INSERT INTO achievements (key, name, description, category, xp_reward, rarity, requirements) VALUES
-- Cuisine Explorer achievements
('italian_explorer', 'Italian Explorer', 'Complete 5 Italian recipes', 'cuisine', 50, 'common', '{"cuisine": "Italian", "count": 5}'),
('italian_master', 'Italian Master', 'Complete 25 Italian recipes', 'cuisine', 200, 'rare', '{"cuisine": "Italian", "count": 25}'),
('asian_explorer', 'Asian Explorer', 'Complete 5 Asian recipes', 'cuisine', 50, 'common', '{"cuisine": "Asian", "count": 5}'),
('asian_master', 'Asian Master', 'Complete 25 Asian recipes', 'cuisine', 200, 'rare', '{"cuisine": "Asian", "count": 25}'),
('mexican_explorer', 'Mexican Explorer', 'Complete 5 Mexican recipes', 'cuisine', 50, 'common', '{"cuisine": "Mexican", "count": 5}'),
('french_explorer', 'French Explorer', 'Complete 5 French recipes', 'cuisine', 50, 'common', '{"cuisine": "French", "count": 5}'),
('world_cuisine_master', 'World Cuisine Master', 'Complete recipes from 10 different cuisines', 'cuisine', 500, 'ultra-rare', '{"unique_cuisines": 10}'),

-- Collection achievements
('first_favorite', 'First Save', 'Save your first recipe', 'collection', 10, 'common', '{"favorites_count": 1}'),
('recipe_collector_5', 'Recipe Collector', 'Save 5 recipes', 'collection', 25, 'common', '{"favorites_count": 5}'),
('recipe_collector_25', 'Recipe Hoarder', 'Save 25 recipes', 'collection', 100, 'rare', '{"favorites_count": 25}'),
('recipe_collector_50', 'Recipe Master', 'Save 50 recipes', 'collection', 200, 'rare', '{"favorites_count": 50}'),
('recipe_collector_100', 'Recipe Legend', 'Save 100 recipes', 'collection', 500, 'ultra-rare', '{"favorites_count": 100}'),

-- Streak achievements
('week_warrior', 'Week Warrior', 'Maintain a 7-day streak', 'streak', 100, 'common', '{"streak_days": 7}'),
('fortnight_fighter', 'Fortnight Fighter', 'Maintain a 14-day streak', 'streak', 200, 'rare', '{"streak_days": 14}'),
('month_champion', 'Month Champion', 'Maintain a 30-day streak', 'streak', 500, 'rare', '{"streak_days": 30}'),
('streak_centurion', 'Streak Centurion', 'Maintain a 100-day streak', 'streak', 2000, 'ultra-rare', '{"streak_days": 100}'),

-- Mystery Box achievements
('lucky_first', 'First Luck', 'Open your first mystery box', 'mystery', 10, 'common', '{"boxes_opened": 1}'),
('box_hunter_10', 'Box Hunter', 'Open 10 mystery boxes', 'mystery', 50, 'common', '{"boxes_opened": 10}'),
('rare_finder', 'Rare Finder', 'Find a rare mystery box', 'mystery', 100, 'rare', '{"rarity": "rare"}'),
('ultra_lucky', 'Ultra Lucky', 'Find an ultra-rare mystery box', 'mystery', 500, 'ultra-rare', '{"rarity": "ultra-rare"}'),

-- Creator achievements
('rising_star', 'Rising Star', 'Claim your first recipe', 'creator', 100, 'common', '{"recipes_claimed": 1}'),
('prolific_creator', 'Prolific Creator', 'Claim 10 recipes', 'creator', 250, 'rare', '{"recipes_claimed": 10}'),
('viral_chef', 'Viral Chef', 'Have a recipe reach 100 views', 'creator', 200, 'rare', '{"recipe_views": 100}'),
('community_favorite', 'Community Favorite', 'Have a recipe rated 5 stars by 10 users', 'creator', 500, 'ultra-rare', '{"five_star_ratings": 10}'),

-- Social achievements
('first_follow', 'First Connection', 'Follow your first creator', 'social', 10, 'common', '{"following_count": 1}'),
('social_butterfly', 'Social Butterfly', 'Follow 10 creators', 'social', 50, 'common', '{"following_count": 10}'),
('influencer', 'Influencer', 'Gain 100 followers', 'social', 500, 'rare', '{"followers_count": 100}'),
('celebrity_chef', 'Celebrity Chef', 'Gain 1000 followers', 'social', 2000, 'ultra-rare', '{"followers_count": 1000}'),

-- Engagement achievements
('daily_devoted', 'Daily Devoted', 'Check in every day for a week', 'engagement', 100, 'common', '{"checkin_days": 7}'),
('helpful_reviewer', 'Helpful Reviewer', 'Write 5 helpful reviews', 'engagement', 50, 'common', '{"helpful_reviews": 5}'),
('challenge_accepted', 'Challenge Accepted', 'Complete your first weekly challenge', 'engagement', 100, 'common', '{"challenges_completed": 1}'),
('challenge_master', 'Challenge Master', 'Complete 10 weekly challenges', 'engagement', 500, 'rare', '{"challenges_completed": 10}');

-- Insert some sample ingredients (subset for testing)
INSERT INTO ingredients (name, fdc_id, category, macros) VALUES
('Chicken Breast', 171477, 'protein', '{"calories": 165, "protein": 31, "carbs": 0, "fat": 3.6}'),
('Salmon', 173735, 'protein', '{"calories": 208, "protein": 20, "carbs": 0, "fat": 13}'),
('Ground Beef', 174032, 'protein', '{"calories": 250, "protein": 26, "carbs": 0, "fat": 15}'),
('Eggs', 171287, 'protein', '{"calories": 155, "protein": 13, "carbs": 1.1, "fat": 11}'),
('Tofu', 172479, 'protein', '{"calories": 76, "protein": 8, "carbs": 1.9, "fat": 4.8}'),
('Rice', 169756, 'grain', '{"calories": 130, "protein": 2.7, "carbs": 28, "fat": 0.3}'),
('Pasta', 168940, 'grain', '{"calories": 371, "protein": 13, "carbs": 75, "fat": 1.5}'),
('Bread', 172684, 'grain', '{"calories": 265, "protein": 9, "carbs": 49, "fat": 3.2}'),
('Potato', 170026, 'vegetable', '{"calories": 77, "protein": 2, "carbs": 17, "fat": 0.1}'),
('Tomato', 170457, 'vegetable', '{"calories": 18, "protein": 0.9, "carbs": 3.9, "fat": 0.2}'),
('Onion', 170000, 'vegetable', '{"calories": 40, "protein": 1.1, "carbs": 9.3, "fat": 0.1}'),
('Garlic', 169230, 'vegetable', '{"calories": 149, "protein": 6.4, "carbs": 33, "fat": 0.5}'),
('Carrot', 170393, 'vegetable', '{"calories": 41, "protein": 0.9, "carbs": 9.6, "fat": 0.2}'),
('Spinach', 168462, 'vegetable', '{"calories": 23, "protein": 2.9, "carbs": 3.6, "fat": 0.4}'),
('Broccoli', 170379, 'vegetable', '{"calories": 34, "protein": 2.8, "carbs": 6.6, "fat": 0.4}'),
('Cheese', 171265, 'dairy', '{"calories": 402, "protein": 25, "carbs": 1.3, "fat": 33}'),
('Milk', 171265, 'dairy', '{"calories": 61, "protein": 3.2, "carbs": 4.8, "fat": 3.3}'),
('Yogurt', 170894, 'dairy', '{"calories": 59, "protein": 10, "carbs": 3.6, "fat": 0.4}'),
('Olive Oil', 171413, 'oil', '{"calories": 884, "protein": 0, "carbs": 0, "fat": 100}'),
('Butter', 173410, 'oil', '{"calories": 717, "protein": 0.9, "carbs": 0.1, "fat": 81}');

-- Create default challenges (these would be generated weekly in production)
INSERT INTO challenges (title, description, type, requirements, xp_reward, start_date, end_date) VALUES
('Italian Week', 'Cook 3 Italian recipes this week', 'cuisine', '{"cuisine": "Italian", "count": 3}', 150, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days'),
('Vegetarian Explorer', 'Try 2 vegetarian recipes', 'ingredient', '{"dietary": "vegetarian", "count": 2}', 100, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days'),
('Social Chef', 'Share 5 recipes with friends', 'social', '{"shares": 5}', 75, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days'),
('Streak Builder', 'Maintain a 5-day cooking streak', 'streak', '{"consecutive_days": 5}', 125, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days'); 