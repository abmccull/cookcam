# CookCam Quick Start Guide

## 🚀 Get Started in 15 Minutes

### Step 1: Backend Setup (5 minutes)

```bash
# 1. Navigate to backend
cd backend/api

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env

# 4. Add these minimum values to .env:
# SUPABASE_URL=your_supabase_url
# SUPABASE_ANON_KEY=your_supabase_anon_key
# OPENAI_API_KEY=your_openai_api_key
# JWT_SECRET=any_random_string_here
# JWT_REFRESH_SECRET=another_random_string_here
# DEMO_MODE=true

# 5. Start the backend (ignore TypeScript warnings for now)
npm run dev
```

### Step 2: Database Setup (5 minutes)

1. Go to your Supabase dashboard
2. Run this SQL to create the subscription table:

```sql
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  product_id TEXT NOT NULL,
  purchase_token TEXT,
  transaction_id TEXT,
  original_transaction_id TEXT,
  status TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  auto_renewing BOOLEAN DEFAULT true,
  trial_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, platform)
);
```

### Step 3: Mobile App Setup (5 minutes)

```bash
# 1. Navigate to mobile app
cd mobile/CookCam

# 2. Install dependencies
npm install

# 3. For iOS (Mac only)
cd ios && pod install && cd ..

# 4. Update environment config
# Edit src/config/env.ts and set:
# API_URL: 'http://localhost:3000' (or your IP for device testing)

# 5. Start React Native
npx react-native start

# 6. In another terminal, run on iOS or Android
npx react-native run-ios
# OR
npx react-native run-android
```

## 🔥 Quick Fixes for Common Issues

### TypeScript JWT Error
If the backend won't compile, temporarily add to `tsconfig.json`:
```json
{
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```

### Port Already in Use
```bash
# Kill backend on port 3000
lsof -ti:3000 | xargs kill -9

# Kill React Native on port 8081
lsof -ti:8081 | xargs kill -9
```

### Can't Connect to API from Mobile
Use your computer's IP instead of localhost:
```bash
# Find your IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# Update mobile/CookCam/src/config/env.ts
API_URL: 'http://YOUR_IP:3000'
```

## 🎯 Test Core Features

### 1. Authentication (Demo Mode)
- Sign up with any email/password
- You'll get a demo token
- All features work in demo mode

### 2. Scanning
- Take a photo of ingredients
- AI will detect and list them
- Generate recipe suggestions

### 3. Subscriptions
- Navigate to subscription screen
- See the UI (purchases disabled in demo)
- Test subscription status endpoint

## 📱 What Works Right Now

✅ User authentication (demo mode)
✅ Ingredient scanning with AI
✅ Recipe generation
✅ Basic gamification
✅ Subscription UI and backend
✅ Health checks
✅ API rate limiting

## ⚠️ What Needs Work

❌ Real payment processing (needs app store setup)
❌ Push notifications
❌ Email sending
❌ Some TypeScript types
❌ Production deployment

## 🏃‍♂️ Next Steps for Production

1. **Fix Critical Issues** (1 day)
   - Resolve TypeScript errors
   - Install react-native-iap
   - Create missing DB tables

2. **Configure Services** (2-3 days)
   - App Store Connect setup
   - Google Play Console setup
   - Email service (SendGrid)
   - Error tracking (Sentry)

3. **Testing** (2-3 days)
   - End-to-end testing
   - Subscription flow testing
   - Performance testing

4. **Launch Preparation** (2-3 days)
   - Legal documents
   - App store assets
   - Production deployment

## 💡 Pro Tips

1. **Start with Demo Mode**: Keep `DEMO_MODE=true` until everything works
2. **Test on Real Devices**: Simulators don't support in-app purchases
3. **Use Sandbox Accounts**: For testing subscriptions without charges
4. **Monitor Logs**: Backend logs show all API calls and errors
5. **Check Health Endpoint**: `http://localhost:3000/health/detailed`

## 🆘 Getting Help

- **API Documentation**: Check routes in `backend/api/src/routes/`
- **Database Schema**: See `backend/supabase/migrations/`
- **Error Logs**: Backend console shows detailed errors
- **Type Issues**: Can temporarily use `any` type to move forward

## 🎉 You're Ready!

With these steps, you should have a running CookCam app with:
- Working authentication
- AI-powered scanning
- Recipe generation
- Subscription system (UI only in demo mode)

The app is functional enough for testing and development. Focus on the production checklist items when you're ready to launch! 