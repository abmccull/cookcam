# 🍳 CookCam - AI-Powered Cooking Game

[![Production Ready](https://img.shields.io/badge/Production-85%25%20Ready-green.svg)](./docs/status/PRODUCTION_READINESS_FINAL_REPORT.md)
[![Tech Stack](https://img.shields.io/badge/Stack-Expo%20%2B%20Supabase-blue.svg)](#technology-stack)
[![Revenue Model](https://img.shields.io/badge/Revenue-%243.99%2Fmonth-purple.svg)](./docs/setup/subscription-setup-guide.md)

#coderabbit Badge
![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/abmccull/cookcam?utm_source=oss&utm_medium=github&utm_campaign=abmccull%2Fcookcam&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)

> Transform cooking into an engaging, gamified experience with AI-powered ingredient scanning and recipe generation.

## 🚀 **Quick Start**

Get CookCam running in 15 minutes:

```bash
# 1. Setup mobile app (Expo)
npm run install:mobile

# 2. Setup backend
npm run install:backend

# 3. Start development
npm run mobile      # Start Expo development server
npm run backend     # Start backend (in another terminal)
```

**👉 [Complete Setup Guide](./docs/setup/QUICK_START.md)**

## ✨ **Key Features**

### 🔍 **AI Ingredient Scanning**
- Snap photos of ingredients
- AI identifies and lists items
- Generate instant recipe suggestions

### 🎮 **Gamification System**
- **XP & Levels**: 11 ways to earn XP, 10-level progression
- **Daily Streaks**: Consistency rewards with shield protection
- **Achievements**: 5 categories with progress tracking
- **Mystery Boxes**: Rare rewards (70% common, 25% rare, 5% ultra-rare)

### 👥 **Creator Monetization**
- **5-Tier System**: Sous Chef → Master Chef
- **Revenue Sharing**: 10% → 30% based on tier  
- **Recipe Claiming**: 100 XP reward, analytics tracking

### 💰 **Subscription Model**
- $3.99/month with 3-day free trial & $9.99/month Creator Subscription with 3 day free trial
- Premium features: Unlimited scans, AI recipes, storage
- iOS & Android in-app purchases

## 🏗️ **Architecture Overview**

### **Frontend: Expo + React Native 0.79.3**
- TypeScript for type safety
- 10 fully implemented screens
- 30+ custom components
- Expo managed workflow
- Hot reload and OTA updates
- 60 FPS animations

### **Backend: Supabase + PostgreSQL**
- 24-table database schema
- Row Level Security (RLS)
- Real-time subscriptions
- JWT authentication
- RESTful API design

### **AI Integration**
- OpenAI GPT for recipe generation
- Computer vision for ingredient detection
- USDA Food Data Central integration

## 📊 **Current Status: 85% Production Ready**

### ✅ **Complete**
- Frontend development (React Native app)
- Database schema (24 tables)
- Authentication system
- Subscription infrastructure
- Legal compliance (GDPR, Privacy Policy)
- Security implementation

### ⚠️ **Missing (Critical)**
- 2 environment variables:
  ```bash
  SUPABASE_SERVICE_KEY=your_service_key_here
  JWT_REFRESH_SECRET=your_refresh_secret_here
  ```

### 🔄 **In Progress**
- Production deployment
- App store submissions
- Final testing

**📊 [Detailed Status Report](./docs/status/PRODUCTION_READINESS_FINAL_REPORT.md)**

## 📚 **Documentation Hub**

> **[📁 Complete Documentation Index →](./docs/README.md)**

### **🚀 Quick Start Links**
- **[Quick Start Guide](./docs/setup/QUICK_START.md)** - Get running in 15 minutes
- **[Production Status](./docs/status/PRODUCTION_READINESS_FINAL_REPORT.md)** - Current readiness (85%)
- **[System Architecture](./docs/technical/CookCam_Complete_System_Analysis.md)** - Technical overview
- **[User Experience](./docs/user-experience/app_flow_document.md)** - App flow and UX

### **📁 Documentation Categories**
- **[🔧 Setup & Deployment](./docs/setup/)** - Development guides, deployment, testing
- **[🏗️ Technical Architecture](./docs/technical/)** - Database schema, system analysis, integrations  
- **[📱 User Experience](./docs/user-experience/)** - App flow, UX audit, gamification
- **[⚖️ Legal & Compliance](./docs/compliance/)** - Privacy policy, GDPR, app store compliance
- **[🗺️ Planning & Roadmap](./docs/planning/)** - Future phases, enhancements, strategy
- **[📊 Project Status](./docs/status/)** - Current production readiness status

## 🌟 **Key Differentiators**

1. **AI-Powered Ingredient Detection** - Unique computer vision capabilities
2. **Instant Recipe Generation** - From scan to cooking in seconds  
3. **Comprehensive Gamification** - XP, levels, streaks, achievements
4. **Creator Economy** - 5-tier monetization system
5. **Privacy-First** - Complete GDPR compliance

## 📈 **Business Model**

### **Revenue Streams**
- **Subscriptions**: $3.99/month (primary)
- **Creator Revenue Share**: 10-30% commission
- **Premium Features**: Advanced AI, unlimited storage

### **Target Metrics**
- **DAU/MAU**: 70%+ (retention)
- **Average Session**: 15+ minutes
- **Creator Conversion**: 5%+
- **Trial→Paid**: 40%+ conversion

## 🛠️ **Technology Stack**

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Mobile** | Expo + React Native 0.79.3 | Cross-platform app |
| **Language** | TypeScript | Type safety |
| **Backend** | Supabase | Database + Auth |
| **Database** | PostgreSQL | Relational data |
| **AI** | OpenAI GPT-4 | Recipe generation |
| **Payments** | App Store/Google Play | Subscription billing |
| **Storage** | Supabase Storage | Image storage |
| **Analytics** | Built-in tracking | User behavior |

## 🚦 **Next Steps**

### **Immediate (This Week)**
1. ✅ Complete environment variable setup
2. 🔄 Deploy to production hosting
3. 📱 Submit to App Store/Google Play
4. 🧪 Final testing & QA

### **Short Term (Next Month)**
1. 📊 Implement analytics dashboard
2. 🔔 Add push notifications
3. 👥 Social features (following, sharing)
4. 🎯 A/B testing framework

### **Long Term (3-6 Months)**
1. 🌍 Social cooking circles
2. 🤖 Advanced AI personalization
3. 📚 Recipe collections & books
4. 🗺️ Territory control game

## 🤝 **Contributing**

This is a production application. For development setup:

1. Follow the [Quick Start Guide](./docs/setup/QUICK_START.md)
2. Review the [Architecture Documentation](./docs/technical/CookCam_Complete_System_Analysis.md)
3. Check the [Database Schema](./docs/technical/database_schema.md)

## 📞 **Support**

- **Development Issues**: Check [Quick Start Guide](./docs/setup/QUICK_START.md)
- **Production Status**: See [Final Report](./docs/status/PRODUCTION_READINESS_FINAL_REPORT.md)
- **Legal Questions**: Review [Privacy Policy](./docs/compliance/PRIVACY_POLICY.md)

---

**Built with ❤️ for the cooking community**  
*© 2025 ABM Studios LLC. All rights reserved.*
