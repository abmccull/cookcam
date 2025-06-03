# CookCam API Production Deployment Guide

## ✅ Successfully Deployed Configuration

**Server:** 64.23.236.43:3000  
**Status:** ✅ Online and responding  
**Memory Usage:** ~85MB (optimized from 640+ packages)  

## 🚀 Quick Deployment Commands

### 1. Deploy to Production Server
```bash
# Copy files to server
scp -r backend/api/* root@64.23.236.43:/var/www/cookcam-api/
scp .env.production root@64.23.236.43:/var/www/cookcam-api/.env
scp ecosystem.config.production.js root@64.23.236.43:/var/www/cookcam-api/ecosystem.config.js

# SSH into server
ssh root@64.23.236.43

# Navigate to app directory
cd /var/www/cookcam-api

# Install dependencies and build
npm install
npm run build

# Start with PM2 (with environment variables)
export $(cat .env | xargs)
pm2 start ecosystem.config.js
```

### 2. Verify Deployment
```bash
# Check PM2 status
pm2 status

# Test API endpoints
curl http://localhost:3000/health
curl http://64.23.236.43:3000/health

# View logs
pm2 logs cookcam-api --follow
```

## 🔧 Key Configuration Files

### PM2 Ecosystem Configuration (`ecosystem.config.js`)
```javascript
module.exports = {
  apps: [{
    name: 'cookcam-api',
    script: 'dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    env_file: '.env',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2.log',
    max_memory_restart: '1G',
    restart_delay: 1000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

### Required Environment Variables
```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_ANON_KEY=your_supabase_anon_key

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# API Keys
OPENAI_API_KEY=your_openai_api_key_here
USDA_API_KEY=your_usda_api_key_here

# Security
JWT_SECRET=your_jwt_secret_here

# Application
PORT=3000
NODE_ENV=production
DEMO_MODE=true
```

## 🔍 Troubleshooting Issues We Solved

### Issue 1: PM2 Running TypeScript Instead of JavaScript
**Problem:** PM2 was trying to execute `src/index.ts` instead of `dist/index.js`
**Solution:** Updated ecosystem config to point to compiled JavaScript

### Issue 2: Environment Variables Not Loading
**Problem:** `.env` file wasn't being loaded properly by dotenv
**Solution:** Explicitly export environment variables before starting PM2:
```bash
export $(cat .env | xargs)
pm2 start ecosystem.config.js
```

### Issue 3: Missing Environment Variables
**Problem:** `OPENAI_API_KEY` was lowercase, missing `SUPABASE_ANON_KEY`
**Solution:** Updated to correct casing and added missing variables

## 📊 Optimization Results

- **Dependencies:** Reduced from 71 to 42 packages (41% reduction)
- **Memory Usage:** Only 85MB in production
- **Package Bloat:** Eliminated 640+ unnecessary packages
- **Startup Time:** Fast startup with minimal dependencies

## 🔄 Future Deployments

For future deployments, use this working configuration:

1. Update code locally
2. Build: `npm run build` 
3. Copy to server: Use the deployment commands above
4. Restart: `pm2 restart cookcam-api`

## 📝 API Endpoints

- **Health Check:** `GET http://64.23.236.43:3000/health`
- **API Base:** `http://64.23.236.43:3000/api/v1/`
- **WebSocket:** Enabled for real-time features

## 🔐 Security Notes

- JWT authentication enabled
- CORS configured for production
- Rate limiting active
- Input sanitization middleware applied
- Helmet security headers enabled 