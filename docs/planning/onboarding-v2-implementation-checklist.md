# CookCam v2: Delight-First Onboarding & Paywall Implementation Checklist

## 📋 Project Overview
- **Goal**: Implement delight-first onboarding with early plan bifurcation
- **Timeline**: 8 weeks
- **Success Metrics**: 2× better trial opt-in, <40s core flow, 25% conversion improvement

---

## 🏗️ Phase 1: Core Infrastructure (Weeks 1-2)

### Navigation Structure Updates
- [x] Add new routes to `RootStackParamList`
  - [x] `ColdOpen: undefined`
  - [x] `DemoOnboarding: undefined`
  - [x] `PlanSelection: {tempScanData?: any; tempRecipes?: any; selectedRecipe?: any}`
  - [x] `AccountGate: {intendedPlan: string; tempData?: any}`
  - [x] `PlanPaywall: {selectedPlan: string; tempData?: any}`
  - [x] `PreferenceQuiz: {skipable: boolean}`
  - [x] `CreatorKYC: undefined`
- [x] Configure React Navigation Modal stack for steps 3-6
- [ ] Implement back navigation restrictions
- [x] Add `onboardingDone` flag persistence logic
- [x] Update App.tsx navigation flow

### Context Extensions

#### AuthContext Enhancements
- [ ] Add `TempUserData` interface
- [ ] Implement `tempUserData: TempUserData | null` state
- [ ] Add `mergeTempData: (userData: User) => Promise<void>`
- [ ] Add `clearTempData: () => void`
- [ ] Implement `signInWithApple: () => Promise<void>`
- [ ] Implement `signInWithGoogle: () => Promise<void>`
- [ ] Add `onboardingProgress: OnboardingStep` tracking
- [ ] Add `setOnboardingProgress: (step: OnboardingStep) => void`

#### SubscriptionContext Enhancements
- [ ] Add `selectedPlan: PlanType | null` state
- [ ] Add `setSelectedPlan: (plan: PlanType) => void`
- [ ] Implement `startFreeTrial: (planType: PlanType) => Promise<boolean>`
- [ ] Add `bypassPaywall: () => void` for "Maybe later"
- [ ] Add `freeScansRemaining: number` tracking
- [ ] Implement `consumeFreeScan: () => void`
- [ ] Add `resetFreeScans: () => void`

#### New TempDataContext
- [ ] Create `src/context/TempDataContext.tsx`
- [ ] Define `TempDataContextType` interface
- [ ] Implement temp scan storage
- [ ] Implement temp recipe storage
- [ ] Add recipe selection logic
- [ ] Add plan intention storage
- [ ] Implement data clearing logic
- [ ] Add merge logic for authenticated users

#### New OnboardingContext
- [ ] Create `src/context/OnboardingContext.tsx`
- [ ] Define `OnboardingStep` enum
- [ ] Implement `OnboardingContextType` interface
- [ ] Add step navigation helpers
- [ ] Implement progress tracking
- [ ] Add back navigation validation

### Database Schema Updates
- [ ] Create migration file: `onboarding_v2_schema.sql`
- [ ] Add `onboarding_sessions` table
  ```sql
  CREATE TABLE onboarding_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    progress_step TEXT NOT NULL,
    temp_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    abandoned_at TIMESTAMP WITH TIME ZONE
  );
  ```
- [ ] Add `temp_scans` table
  ```sql
  CREATE TABLE temp_scans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id TEXT NOT NULL,
    scan_data JSONB NOT NULL,
    recipe_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
  );
  ```
- [ ] Extend `users` table
  - [ ] `onboarding_completed_at TIMESTAMP WITH TIME ZONE`
  - [ ] `intended_plan TEXT`
  - [ ] `free_scans_remaining INTEGER DEFAULT 3`
  - [ ] `paywall_bypassed_at TIMESTAMP WITH TIME ZONE`
- [ ] Create performance indexes
  - [ ] `idx_onboarding_sessions_device_id`
  - [ ] `idx_temp_scans_device_id`
  - [ ] `idx_temp_scans_expires_at`
- [ ] Test migration on development database
- [ ] Prepare rollback migration script

---

## 🎨 Phase 2: Screen Implementation (Weeks 3-4)

### ColdOpenScreen
- [x] Create `src/screens/ColdOpenScreen.tsx`
- [x] Implement logo pulse animation (reuse `LoadingAnimation.tsx` patterns)
- [x] Add 1-second display timer
- [x] Implement `AsyncStorage.getItem('onboardingDone')` check
- [x] Add navigation to `DemoOnboarding` for new users
- [x] Add navigation bypass to `Main` for returning users
- [x] Add error handling for storage failures
- [ ] Test animation performance on low-end devices

### DemoOnboardingScreen  
- [x] Create `src/screens/DemoOnboardingScreen.tsx`
- [x] Integrate camera view from existing `CameraScreen.tsx`
- [x] Add semi-transparent overlay with guidance text
- [x] Implement "Point at today's ingredients → tap to scan" UI
- [x] Add skip button (top-right)
- [x] Modify ingredient detection for temp storage
- [ ] Implement temp data storage in context
- [x] Add error handling for camera permissions
- [x] Test scanning accuracy without authentication
- [x] Add fallback UI for poor ingredient recognition

### RecipeCarouselScreen
- [x] Create `src/screens/RecipeCarouselScreen.tsx`
- [x] Implement horizontal swipe carousel using standard components
- [x] Create custom recipe card display for temp recipes
- [x] Add "Cook Now" CTA to each card
- [x] Implement recipe selection logic
- [x] Add toast notification: "Save your streak & unlock free trial → next"
- [x] Add navigation to `PlanSelection` on recipe selection
- [x] Implement loading states for recipe generation
- [x] Add error handling for AI recipe failures
- [ ] Test carousel performance with multiple recipes

### PlanSelectionSheet
- [x] Create `src/screens/PlanSelectionSheet.tsx`
- [x] Implement React Navigation Modal presentation
- [x] Design two-button layout with clear visual distinction
- [x] Add Consumer plan button: "Get Cooking – Free 7-day trial ($3.99/mo)"
- [x] Add Creator plan button: "Earn with CookCam – Free 7-day Creator trial ($9.99/mo, 30% share)"
- [x] Implement mini bullet lists under each plan
- [x] Add plan selection logic with context storage
- [x] Implement navigation to `AccountGate` with selected plan
- [x] Add plan comparison UI elements
- [ ] Test modal animations and gestures

---

## 🔐 Phase 3: Authentication & Paywall (Weeks 5-6)

### AccountGateScreen
- [ ] Create `src/screens/AccountGateScreen.tsx`
- [ ] Implement Apple Sign-In button (prominent)
- [ ] Implement Google Sign-In button (prominent)
- [ ] Add "Other email" link (small) to manual signup
- [ ] Integrate with enhanced `AuthContext`
- [ ] Implement data merge logic on successful auth
- [ ] Add loading states during authentication
- [ ] Add error handling for auth failures
- [ ] Implement automatic progression to paywall
- [ ] Test federated auth flows on iOS/Android

### Enhanced PlanPaywallScreen
- [ ] Update existing `SubscriptionScreen.tsx` or create new
- [ ] Add hero dish image at top
- [ ] Implement "7 days free, cancel anytime" messaging
- [ ] Create Monthly/Yearly price toggle chips
- [ ] Design primary CTA: "Start Free Trial"
- [ ] Add secondary option: "Maybe later (3 free scans/mo)"
- [ ] Integrate StoreKit2/Google Play Billing
- [ ] Implement trial start logic
- [ ] Add paywall bypass logic for "Maybe later"
- [ ] Set `onboardingDone=true` after subscription/bypass
- [ ] Test payment flows with sandbox accounts
- [ ] Add analytics tracking for conversion events

### PreferenceQuizScreen
- [ ] Create `src/screens/PreferenceQuizScreen.tsx` 
- [ ] Implement single scroll view layout
- [ ] Add pill selection UI for Diet preferences
- [ ] Add pill selection UI for Cuisine preferences  
- [ ] Add pill selection UI for Skill level
- [ ] Add pill selection UI for Cooking time
- [ ] Implement skip button (always visible)
- [ ] Add save to `user_profile` logic
- [ ] Integrate with existing preference system
- [ ] Add smooth transitions between sections
- [ ] Test accessibility compliance

### CreatorKYCScreen
- [ ] Create `src/screens/CreatorKYCScreen.tsx`
- [ ] Add "Finish payout setup (2 min) to activate 30% share" messaging
- [ ] Integrate Stripe Connect onboarding flow
- [ ] Implement skip option
- [ ] Add 24h push reminder scheduling for skipped KYC
- [ ] Set creator status to "pending_onboarding" until complete
- [ ] Add progress indicators for KYC steps
- [ ] Test Stripe Connect integration
- [ ] Add error handling for KYC failures
- [ ] Implement retry logic for failed submissions

---

## 🔄 Phase 4: Backend Integration (Week 5)

### New API Endpoints
- [ ] Create `POST /api/v1/temp-scans` endpoint
- [ ] Create `GET /api/v1/temp-scans/:deviceId` endpoint  
- [ ] Create `DELETE /api/v1/temp-scans/:deviceId` endpoint
- [ ] Create `POST /api/v1/onboarding/progress` endpoint
- [ ] Create `GET /api/v1/onboarding/progress/:deviceId` endpoint
- [ ] Create `PUT /api/v1/onboarding/complete` endpoint
- [ ] Create `POST /api/v1/subscriptions/start-trial` endpoint
- [ ] Create `POST /api/v1/subscriptions/bypass-paywall` endpoint
- [ ] Create `GET /api/v1/subscriptions/free-scans-remaining` endpoint
- [ ] Create `POST /api/v1/users/merge-temp-data` endpoint
- [ ] Add proper error handling to all endpoints
- [ ] Implement rate limiting for temp scan endpoints
- [ ] Add API documentation for new endpoints

### Analytics Integration
- [ ] Add `onboarding_started` event tracking
- [ ] Add `demo_scan_completed` event tracking
- [ ] Add `recipe_selected` event tracking
- [ ] Add `plan_selected` event tracking
- [ ] Add `auth_completed` event tracking
- [ ] Add `trial_started` event tracking
- [ ] Add `paywall_bypassed` event tracking
- [ ] Add `onboarding_completed` event tracking
- [ ] Add `trial_to_paid_conversion` event tracking
- [ ] Add `free_scans_exhausted` event tracking
- [ ] Add `creator_kyc_completed` event tracking
- [ ] Test analytics events in development
- [ ] Verify analytics data in dashboard

### Data Migration & Cleanup
- [ ] Implement temp data cleanup job (24h expiry)
- [ ] Add GDPR-compliant data deletion endpoints
- [ ] Create data migration script for existing users
- [ ] Implement secure device ID generation
- [ ] Add data encryption for temp storage
- [ ] Test data migration with sample accounts
- [ ] Verify proper cleanup of expired data

---

## 🧪 Phase 5: Testing & Quality Assurance (Week 7)

### Unit Tests
- [ ] Test `TempDataContext` functionality
  - [ ] Temp scan storage/retrieval
  - [ ] Recipe selection logic
  - [ ] Data clearing functionality
  - [ ] Merge logic validation
- [ ] Test `OnboardingContext` functionality  
  - [ ] Step progression logic
  - [ ] Back navigation restrictions
  - [ ] Progress tracking accuracy
  - [ ] Skip functionality
- [ ] Test enhanced `AuthContext`
  - [ ] Federated auth integration
  - [ ] Temp data merge logic
  - [ ] Error handling scenarios
- [ ] Test enhanced `SubscriptionContext`
  - [ ] Trial start functionality
  - [ ] Free scan tracking
  - [ ] Paywall bypass logic

### Integration Tests
- [ ] End-to-end onboarding flow (happy path)
- [ ] End-to-end onboarding flow (skip paths)
- [ ] Payment integration with test accounts
- [ ] Creator onboarding and KYC flow
- [ ] Data persistence across app restarts
- [ ] Offline/poor connectivity scenarios
- [ ] Authentication failure recovery
- [ ] Subscription failure handling

### Performance Tests
- [ ] Demo scan response time (<500ms target)
- [ ] Recipe generation performance (<5s target)
- [ ] Camera preview performance during demo
- [ ] Memory usage during onboarding flow
- [ ] Battery impact during extended demo usage
- [ ] App startup time with new navigation
- [ ] Animation smoothness on low-end devices

### Security Audit
- [ ] Temp data encryption validation
- [ ] Device ID security assessment
- [ ] API endpoint security review
- [ ] Payment flow security testing
- [ ] Data exposure risk assessment
- [ ] GDPR compliance verification

---

## 🚀 Phase 6: Launch Preparation (Week 8)

### A/B Testing Setup
- [ ] Create onboarding variant configurations
- [ ] Implement feature flags for rapid rollback
- [ ] Set up conversion funnel tracking
- [ ] Configure variant assignment logic
- [ ] Test A/B testing infrastructure
- [ ] Prepare variant performance dashboards

### Monitoring & Alerting  
- [ ] Set up onboarding completion rate alerts
- [ ] Configure conversion funnel drop-off alerts
- [ ] Add crash rate monitoring for onboarding screens
- [ ] Set up performance degradation alerts
- [ ] Configure payment failure rate alerts
- [ ] Add temp data storage monitoring

### Documentation & Training
- [ ] Complete technical documentation
- [ ] Create user support documentation
- [ ] Prepare rollback procedures
- [ ] Create troubleshooting guides
- [ ] Document analytics interpretation
- [ ] Prepare team training materials

### Final Testing & Deployment
- [ ] Complete regression testing suite
- [ ] Perform load testing with simulated traffic
- [ ] Validate production payment integration
- [ ] Test rollback procedures
- [ ] Verify monitoring and alerting
- [ ] Conduct final security review
- [ ] Prepare staged rollout plan
- [ ] Create launch communication plan

---

## 📊 Success Metrics & KPIs

### Conversion Funnel Tracking
- [ ] Demo Engagement Rate: % users who complete demo scan
- [ ] Recipe Interest Rate: % users who select recipe in carousel  
- [ ] Plan Selection Rate: % users who choose consumer vs creator
- [ ] Authentication Rate: % users who complete sign-in after demo
- [ ] Trial Conversion Rate: % users who start free trial
- [ ] Paid Conversion Rate: % trial users who convert to paid

### Technical Performance Metrics
- [ ] Demo scan response time (target: <500ms)
- [ ] Recipe generation time (target: <5s)
- [ ] Onboarding crash rate (target: <0.1%)
- [ ] Payment success rate (target: >98%)
- [ ] Data migration success rate (target: >99.5%)

### Business Impact Metrics
- [ ] Trial-to-Paid Conversion Improvement (target: +25%)
- [ ] User Acquisition Cost Reduction (target: -15%)
- [ ] Creator Onboarding Completion (target: +40%)
- [ ] Overall App Store Rating Maintenance (target: >4.5)

---

## 🎯 Post-Launch Optimization Tasks

### Week 1 Post-Launch
- [ ] Monitor conversion funnel performance
- [ ] Analyze crash reports and fix critical issues
- [ ] Review payment integration stability
- [ ] Assess user feedback and ratings
- [ ] Optimize performance bottlenecks

### Week 2-4 Post-Launch  
- [ ] Conduct A/B testing on key components
- [ ] Implement quick wins from user feedback
- [ ] Optimize onboarding messaging based on data
- [ ] Fine-tune payment flow based on conversion data
- [ ] Add personalization features based on user behavior

### Monthly Reviews
- [ ] Comprehensive conversion analysis
- [ ] Cohort retention analysis
- [ ] Feature usage assessment
- [ ] Creator adoption tracking
- [ ] Revenue impact evaluation
- [ ] User satisfaction surveys

---

## 🚨 Risk Mitigation Checklist

### Technical Risks
- [ ] Demo scan accuracy fallbacks implemented
- [ ] Payment integration thoroughly tested
- [ ] Data migration error handling robust
- [ ] Offline functionality gracefully handled
- [ ] Performance regression monitoring active

### UX Risks  
- [ ] Demo-to-real experience consistency validated
- [ ] Onboarding length optimized with skip options
- [ ] Plan value propositions clearly tested
- [ ] Error messages user-friendly and helpful
- [ ] Accessibility compliance verified

### Business Risks
- [ ] Feature flags enabled for rapid rollback
- [ ] Creator migration path clearly documented
- [ ] Revenue impact monitoring established
- [ ] Customer support prepared for changes
- [ ] App store review impact minimized

---

## 📝 Notes & Updates

### Implementation Notes
- [ ] Document any deviations from original plan
- [ ] Track technical debt created during implementation
- [ ] Note performance optimizations made
- [ ] Record A/B testing insights
- [ ] Document lessons learned

### Team Updates
- [ ] Weekly progress review meetings scheduled
- [ ] Stakeholder communication plan active
- [ ] Development team capacity confirmed
- [ ] QA team integration coordinated
- [ ] Design team collaboration optimized

---

**Last Updated**: December 2024  
**Project Lead**: Development Team  
**Development Team**: CookCam Core Team  
**Target Launch**: Q1 2025

## 🎉 IMPLEMENTATION PROGRESS UPDATE

### ✅ COMPLETED (Phase 1 & 2 Core Screens)
- Navigation structure fully implemented
- 4 core onboarding screens created and integrated
- Modal navigation flow working
- App successfully building and running

### 🔄 NEXT PRIORITY ITEMS:
1. **AccountGateScreen** - Federated auth (Apple/Google Sign-In)
2. **PlanPaywallScreen** - Trial subscription integration  
3. **TempDataContext** - Temporary data management
4. **Enhanced AuthContext** - Merge temp data on authentication

---

*This checklist should be updated weekly and reviewed in team standup meetings. Check off completed items and add notes for any blockers or changes to the plan.* 