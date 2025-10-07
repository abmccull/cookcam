-- Create user_streaks table for tracking cooking streaks
CREATE TABLE IF NOT EXISTS user_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_cook_date DATE,
    freeze_tokens_used INTEGER NOT NULL DEFAULT 0,
    total_freeze_tokens INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_streak UNIQUE(user_id)
);

-- Create daily cooking records
CREATE TABLE IF NOT EXISTS daily_cooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cook_date DATE NOT NULL,
    recipes_cooked INTEGER NOT NULL DEFAULT 1,
    xp_earned INTEGER NOT NULL DEFAULT 0,
    freeze_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_daily_cook UNIQUE(user_id, cook_date)
);

-- Add indexes
CREATE INDEX idx_user_streaks_user_id ON user_streaks(user_id);
CREATE INDEX idx_daily_cooks_user_date ON daily_cooks(user_id, cook_date);
CREATE INDEX idx_daily_cooks_date ON daily_cooks(cook_date);

-- Enable RLS
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_cooks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_streaks
CREATE POLICY "Users can view their own streak" 
ON user_streaks FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own streak" 
ON user_streaks FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert user streaks" 
ON user_streaks FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for daily_cooks
CREATE POLICY "Users can view their own cooking records" 
ON daily_cooks FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cooking records" 
ON daily_cooks FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Function to update streak when user cooks
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_last_cook_date DATE;
    v_current_streak INTEGER;
    v_today DATE := CURRENT_DATE;
BEGIN
    -- Get current streak data
    SELECT last_cook_date, current_streak 
    INTO v_last_cook_date, v_current_streak
    FROM user_streaks 
    WHERE user_id = p_user_id;
    
    -- If no streak record exists, create one
    IF NOT FOUND THEN
        INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_cook_date)
        VALUES (p_user_id, 1, 1, v_today);
        RETURN;
    END IF;
    
    -- If already cooked today, nothing to do
    IF v_last_cook_date = v_today THEN
        RETURN;
    END IF;
    
    -- Calculate new streak
    IF v_last_cook_date = v_today - INTERVAL '1 day' THEN
        -- Consecutive day - increment streak
        v_current_streak := v_current_streak + 1;
    ELSE
        -- Streak broken - check for freeze token
        IF EXISTS (
            SELECT 1 FROM daily_cooks 
            WHERE user_id = p_user_id 
            AND cook_date = v_today - INTERVAL '1 day'
            AND freeze_used = TRUE
        ) THEN
            -- Freeze token was used, maintain streak
            v_current_streak := v_current_streak + 1;
        ELSE
            -- Streak broken, reset to 1
            v_current_streak := 1;
        END IF;
    END IF;
    
    -- Update streak record
    UPDATE user_streaks 
    SET 
        current_streak = v_current_streak,
        longest_streak = GREATEST(longest_streak, v_current_streak),
        last_cook_date = v_today,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Record the daily cook
    INSERT INTO daily_cooks (user_id, cook_date)
    VALUES (p_user_id, v_today)
    ON CONFLICT (user_id, cook_date) DO NOTHING;
END;
$$;

-- Function to use a freeze token
CREATE OR REPLACE FUNCTION use_freeze_token(p_user_id UUID, p_date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_tokens_used INTEGER;
    v_total_tokens INTEGER;
BEGIN
    -- Get current token usage
    SELECT freeze_tokens_used, total_freeze_tokens
    INTO v_tokens_used, v_total_tokens
    FROM user_streaks
    WHERE user_id = p_user_id;
    
    -- Check if tokens available
    IF v_tokens_used >= v_total_tokens THEN
        RETURN FALSE;
    END IF;
    
    -- Use a token
    UPDATE user_streaks
    SET 
        freeze_tokens_used = freeze_tokens_used + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Record the freeze usage
    INSERT INTO daily_cooks (user_id, cook_date, freeze_used)
    VALUES (p_user_id, p_date, TRUE)
    ON CONFLICT (user_id, cook_date) 
    DO UPDATE SET freeze_used = TRUE;
    
    RETURN TRUE;
END;
$$;

-- Add trigger to update timestamp
CREATE TRIGGER update_user_streaks_updated_at
    BEFORE UPDATE ON user_streaks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();