-- RLS Policies for CookCam

-- Users table policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Public profiles viewable by authenticated users" ON users
  FOR SELECT USING (auth.role() = 'authenticated');

-- User Progress policies
CREATE POLICY "Users can view own progress" ON user_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert progress" ON user_progress
  FOR INSERT WITH CHECK (true); -- Will be restricted to service role

-- Streaks policies
CREATE POLICY "Users can view own streaks" ON streaks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own streaks" ON streaks
  FOR UPDATE USING (auth.uid() = user_id);

-- Achievements policies (public read)
CREATE POLICY "Achievements are public" ON achievements
  FOR SELECT USING (true);

-- User Achievements policies
CREATE POLICY "Users can view own achievements" ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view others achievements" ON user_achievements
  FOR SELECT USING (auth.role() = 'authenticated');

-- Mystery Boxes policies
CREATE POLICY "Users can view own mystery boxes" ON mystery_boxes
  FOR SELECT USING (auth.uid() = user_id);

-- Daily Checkins policies
CREATE POLICY "Users can view own checkins" ON daily_checkins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own checkins" ON daily_checkins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Ingredients policies (public read)
CREATE POLICY "Ingredients are public" ON ingredients
  FOR SELECT USING (true);

-- Scans policies
CREATE POLICY "Users can view own scans" ON scans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own scans" ON scans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Scan Ingredients policies
CREATE POLICY "Users can view scan ingredients for own scans" ON scan_ingredients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM scans 
      WHERE scans.id = scan_ingredients.scan_id 
      AND scans.user_id = auth.uid()
    )
  );

-- Recipes policies
CREATE POLICY "Recipes are public to authenticated users" ON recipes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create recipes from own scans" ON recipes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM scans 
      WHERE scans.id = recipes.scan_id 
      AND scans.user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can update own claimed recipes" ON recipes
  FOR UPDATE USING (creator_id = auth.uid());

-- Recipe Claims policies
CREATE POLICY "Users can view recipe claims" ON recipe_claims
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can claim unclaimed recipes" ON recipe_claims
  FOR INSERT WITH CHECK (
    auth.uid() = creator_id AND
    NOT EXISTS (
      SELECT 1 FROM recipe_claims rc2 
      WHERE rc2.recipe_id = recipe_claims.recipe_id
    )
  );

-- Recipe Ratings policies
CREATE POLICY "Ratings are public" ON recipe_ratings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create own ratings" ON recipe_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings" ON recipe_ratings
  FOR UPDATE USING (auth.uid() = user_id);

-- Favorites policies
CREATE POLICY "Users can view own favorites" ON favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own favorites" ON favorites
  FOR ALL USING (auth.uid() = user_id);

-- Creator Tiers policies
CREATE POLICY "Creator tiers are public" ON creator_tiers
  FOR SELECT USING (auth.role() = 'authenticated');

-- Referral Codes policies
CREATE POLICY "Users can view own referral codes" ON referral_codes
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Public can view all referral codes" ON referral_codes
  FOR SELECT USING (true);

-- Commissions policies
CREATE POLICY "Creators can view own commissions" ON commissions
  FOR SELECT USING (auth.uid() = creator_id);

-- Notification Preferences policies
CREATE POLICY "Users can view own preferences" ON notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Scheduled Notifications policies
CREATE POLICY "Users can view own notifications" ON scheduled_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Leaderboards policies (public read)
CREATE POLICY "Leaderboards are public" ON leaderboards
  FOR SELECT USING (auth.role() = 'authenticated');

-- Challenges policies (public read)
CREATE POLICY "Challenges are public" ON challenges
  FOR SELECT USING (auth.role() = 'authenticated');

-- User Challenges policies
CREATE POLICY "Users can view own challenge progress" ON user_challenges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view others challenge progress" ON user_challenges
  FOR SELECT USING (auth.role() = 'authenticated');

-- User Follows policies
CREATE POLICY "Users can view all follows" ON user_follows
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage own follows" ON user_follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" ON user_follows
  FOR DELETE USING (auth.uid() = follower_id); 