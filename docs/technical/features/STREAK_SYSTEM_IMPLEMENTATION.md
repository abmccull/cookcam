# Streak System Implementation

## Overview
The streak system has been updated from using local storage to a proper server-side implementation using Supabase.

## Database Schema

### Tables Created

#### 1. `user_streaks`
Tracks overall streak statistics for each user:
- `current_streak` - Current consecutive days
- `longest_streak` - Best streak ever achieved
- `last_cook_date` - Last date user cooked
- `freeze_tokens_used` - Number of shields used
- `total_freeze_tokens` - Total shields available (default: 3)

#### 2. `daily_cooks`
Records individual cooking days:
- `cook_date` - Date of cooking
- `recipes_cooked` - Number of recipes that day
- `xp_earned` - XP earned that day
- `freeze_used` - Whether a freeze token was used

### Functions

#### `update_user_streak(user_id)`
- Updates streak when user completes cooking
- Handles streak continuation/breaking logic
- Records daily cooking activity

#### `use_freeze_token(user_id, date)`
- Uses a freeze token to maintain streak
- Typically used for yesterday if user missed cooking
- Returns boolean success

## Frontend Integration

### Updated Components

#### 1. **StreakCalendar.tsx**
- Now fetches data from Supabase instead of SecureStore
- Real-time sync across devices
- Shows cooking history with flame/shield icons
- Freeze token management

#### 2. **GamificationContext.tsx**
- `checkStreak()` - Updates streak in database when recipe completed
- `useFreeze()` - Uses freeze token from database
- Awards milestone bonuses and badges

#### 3. **StreakService.ts**
New service class with methods:
- `updateStreak()` - Updates user's streak
- `getStreakData()` - Fetches current streak info
- `getCookingHistory()` - Gets cooking calendar data
- `useFreezeToken()` - Uses a shield
- `hasCookedToday()` - Checks if already cooked
- `getStreakMilestones()` - Defines rewards
- `checkAndAwardMilestones()` - Awards milestone rewards

## Benefits

### 1. **Data Integrity**
- Server-side validation prevents cheating
- Consistent with other gamification features
- Reliable streak tracking

### 2. **Cross-Device Sync**
- Streak follows user account
- Works on any device
- Survives app reinstalls

### 3. **Analytics**
- Track user engagement patterns
- Monitor retention metrics
- Understand freeze token usage

### 4. **Scalability**
- Enables streak leaderboards
- Social streak sharing
- Advanced streak challenges

## Streak Rewards

### Milestones
- **3 days** - Starter Chef (10 XP)
- **7 days** - Week Warrior (50 XP + Shield)
- **14 days** - Fortnight Fighter (100 XP + Recipe Pack)
- **30 days** - Monthly Master (Exclusive Recipes + Badge)
- **60 days** - Culinary Champion (Creator Features)
- **100 days** - Century Chef (Lifetime Achievement)
- **365 days** - Legendary Chef (Hall of Fame)

### Daily Bonuses
- Streak bonus XP: 2 × streak days (capped at 50 XP)
- Badges unlock at key milestones
- Special rewards for maintaining streaks

## Migration Notes

- Old local storage data is not migrated (users start fresh)
- Streak data now persists across devices
- Freeze tokens are account-wide, not device-specific

## Future Enhancements

1. **Streak Challenges** - Weekly/monthly streak competitions
2. **Team Streaks** - Group cooking challenges
3. **Streak Insurance** - Premium feature for extra shields
4. **Streak Sharing** - Social media integration
5. **Custom Rewards** - Personalized milestone rewards