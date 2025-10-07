# Onboarding & Paywall: Quick Implementation Checklist

**Sprint Goal**: Ship value-first onboarding with functional paywall  
**Timeline**: 3-4 weeks  
**Status**: 🔴 Not Started

---

## 🚨 Week 1: CRITICAL PATH (Must Complete)

### Day 1-2: Build Paywall
- [ ] Create `PlanPaywallScreen.tsx` component
- [ ] Add billing period toggle (monthly/yearly)
- [ ] Implement "Start Free Trial" CTA
- [ ] Add "Maybe later" option
- [ ] Add compliance disclaimer text
- [ ] Add Terms/Privacy links
- [ ] Test on iOS device
- [ ] Test on Android device
- [ ] **Blocker**: None - can start immediately

### Day 3: Connect Demo Flow
- [ ] Update `WelcomeScreen.tsx` → navigate to `DemoOnboarding`
- [ ] Add onboarding flag check in `App.tsx`
- [ ] Test new user flow: Welcome → Demo → Recipes → Paywall
- [ ] Test returning user flow: skips to MainTabs
- [ ] **Blocker**: None

### Day 4: Analytics Instrumentation
- [ ] Add `onboarding_started` event (WelcomeScreen)
- [ ] Add `demo_scan_completed` event (DemoOnboarding)
- [ ] Add `recipe_selected` event (RecipeCarousel)
- [ ] Add `plan_selected` event (PlanSelection)
- [ ] Add `paywall_viewed` event (PlanPaywall)
- [ ] Add `trial_started` event (PlanPaywall)
- [ ] Add `paywall_dismissed` event (PlanPaywall)
- [ ] Verify events in analytics dashboard
- [ ] **Blocker**: None

### Day 5: Testing & Polish
- [ ] End-to-end onboarding test (iOS)
- [ ] End-to-end onboarding test (Android)
- [ ] Sandbox purchase test (iOS)
- [ ] Sandbox purchase test (Android)
- [ ] Fix any bugs found
- [ ] **Blocker**: Needs Days 1-4 complete

**Week 1 Success Criteria**:
✅ New users can: Open app → Scan demo → See recipes → Choose plan → Start trial → Enter app  
✅ All critical analytics events firing  
✅ Purchases work in sandbox

---

## 📈 Week 2: OPTIMIZATION

### Monday: Free Tier Implementation
- [ ] Implement daily scan counter
- [ ] Add scan limit check (5/day)
- [ ] Show upgrade modal at limit
- [ ] Test limit reset at midnight
- [ ] Add `scan_limit_reached` analytics event

### Tuesday-Wednesday: UX Improvements
- [ ] Add camera permission primer screen
- [ ] Move push notification prompt (after first recipe)
- [ ] Add "Restore purchases" link to paywall
- [ ] Implement loading states for async operations
- [ ] Test permission flows

### Thursday: Trial Messaging
- [ ] Update plan cards with "7 days free" messaging
- [ ] Add trial countdown on paywall
- [ ] Ensure trial terms visible before purchase
- [ ] Legal review of all disclosure text

### Friday: Testing & Iteration
- [ ] Full regression test
- [ ] Accessibility audit (VoiceOver/TalkBack)
- [ ] Performance testing (Instruments/Profiler)
- [ ] Fix any issues found

**Week 2 Success Criteria**:
✅ Free tier option functional  
✅ Permission flows smooth  
✅ Trial messaging clear  
✅ Zero accessibility issues

---

## 🎯 Week 3: POLISH & GROWTH

### Monday-Tuesday: Social Proof
- [ ] Add user count to paywall ("10,000+ cooks")
- [ ] Add rating display ("4.8★")
- [ ] Design testimonial component (optional)
- [ ] A/B test plan for social proof

### Wednesday: Annual Pricing
- [ ] Add yearly billing option
- [ ] Display savings badge
- [ ] Test price toggle
- [ ] Update analytics to track billing_period

### Thursday: A/B Test Setup
- [ ] Implement experiment framework
- [ ] Set up Experiment 1: Value-first onboarding
- [ ] Configure 50/50 split
- [ ] Add experiment tracking events
- [ ] Test variant assignment

### Friday: Pre-Launch Prep
- [ ] Complete security audit
- [ ] Complete compliance review
- [ ] Prepare rollback plan
- [ ] Set up monitoring dashboard
- [ ] Create launch runbook

**Week 3 Success Criteria**:
✅ Social proof elements live  
✅ Annual pricing option available  
✅ A/B test ready to launch  
✅ All audits passed

---

## 🚀 Week 4: LAUNCH & MONITOR

### Monday: Final Testing
- [ ] Production smoke test checklist (all items)
- [ ] Beta test with 10 internal users
- [ ] Fix any critical issues
- [ ] Get stakeholder approval

### Tuesday: Soft Launch
- [ ] Deploy to 10% of users
- [ ] Monitor crash rate (<0.1% target)
- [ ] Monitor trial start rate (40%+ target)
- [ ] Monitor support tickets (should be minimal)

### Wednesday-Thursday: Ramp Up
- [ ] Increase to 25% if metrics healthy
- [ ] Increase to 50% if metrics healthy
- [ ] Continue monitoring
- [ ] Fix any issues immediately

### Friday: Full Launch + Retrospective
- [ ] Deploy to 100% of users
- [ ] Celebrate! 🎉
- [ ] Launch retrospective meeting
- [ ] Document lessons learned
- [ ] Plan next iteration

**Week 4 Success Criteria**:
✅ Live to 100% of users  
✅ Trial opt-in rate: 40-60%  
✅ Zero critical bugs  
✅ Team aligned on next steps

---

## 🎬 Quick Reference: What to Ship

### Must Ship (P0)
1. ✅ PlanPaywallScreen UI complete
2. ✅ Demo flow connected to main navigation
3. ✅ 10+ analytics events firing
4. ✅ Compliance text on paywall
5. ✅ Onboarding flag persistence
6. ✅ Sandbox payments working

### Should Ship (P1)
7. ✅ "Maybe later" free tier option
8. ✅ Camera permission primer
9. ✅ Trial messaging on paywall
10. ✅ Loading states

### Nice to Have (P2)
11. ⭐ Social proof elements
12. ⭐ Annual pricing toggle
13. ⭐ A/B test framework

---

## 📊 Success Metrics

**Track Daily**:
- Trial opt-in rate: ____% (target: 40-60%)
- Crash rate: ____% (target: <0.1%)
- Refund rate: ____% (target: <5%)

**Track Weekly**:
- Time-to-trial (median): ____ min (target: <3 min)
- Onboarding completion: ____% (target: >50%)
- Trial-to-paid conversion: ____% (target: >40%)

---

## 🚨 Escalation Triggers

**Stop and rollback if**:
- [ ] Crash rate >1%
- [ ] Trial start rate drops >30% vs baseline
- [ ] Refund rate >10%
- [ ] App Store/Play rejection
- [ ] Critical security issue

**Investigate immediately if**:
- [ ] Trial start rate <30%
- [ ] Support tickets >5× baseline
- [ ] Negative reviews spike
- [ ] Payment failures >2%

---

## 👥 Team Assignments

| Role | Name | Responsibilities |
|------|------|------------------|
| **Eng Lead** | _______ | PlanPaywallScreen, navigation, analytics |
| **Eng Support** | _______ | Free tier, permissions, testing |
| **Designer** | _______ | Paywall UI, social proof, accessibility |
| **Growth** | _______ | A/B tests, metrics, experiments |
| **QA** | _______ | Testing, regression, accessibility |
| **Legal** | _______ | Compliance review, T&C |

---

## 📞 Daily Standup Template

**What I did yesterday**:
- Task X: ✅ Done / 🟡 In Progress / 🔴 Blocked

**What I'm doing today**:
- Task Y: Will complete by EOD

**Blockers**:
- Need Z from [Person]

**Risks**:
- Concern about ABC

---

## ✅ Definition of Done

**For each task**:
- [ ] Code complete & reviewed
- [ ] Unit tests passing
- [ ] Manual testing on iOS & Android
- [ ] Analytics events verified
- [ ] No new lint errors
- [ ] Documentation updated
- [ ] PR approved & merged

**For each week**:
- [ ] All P0 tasks complete
- [ ] Demo to stakeholders
- [ ] Metrics within targets
- [ ] No known critical bugs

---

## 🎯 Final Pre-Launch Checklist

### Functionality
- [ ] New user flow works end-to-end
- [ ] Returning user flow works
- [ ] Purchase completes successfully
- [ ] Restore purchases works
- [ ] Free tier limits enforced
- [ ] Analytics tracking complete

### Compliance
- [ ] Auto-renewal disclosed
- [ ] Trial terms visible
- [ ] Cancel instructions present
- [ ] Terms/Privacy linked
- [ ] Legal review complete

### Quality
- [ ] Crash rate <0.1%
- [ ] All CTAs have accessibility labels
- [ ] Performance targets met
- [ ] Works on iOS 14+ and Android 8+
- [ ] No memory leaks

### Business
- [ ] Stakeholder approval
- [ ] Support team trained
- [ ] Rollback plan ready
- [ ] Monitoring dashboard live
- [ ] Success metrics defined

---

**Last Updated**: [Date]  
**Next Review**: [Date]  
**Status**: 🔴 Not Started | 🟡 In Progress | 🟢 Complete

---

**Questions?** Post in #cookcam-growth

