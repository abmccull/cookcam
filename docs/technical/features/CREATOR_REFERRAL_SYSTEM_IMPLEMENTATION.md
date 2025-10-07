# Creator Referral System & Universal Links Implementation Plan

## Current Status Analysis

### ✅ What's Already Implemented

#### Backend Infrastructure (95% Complete)
- **Affiliate Link System**: Fully implemented in `creatorService.ts`
  - Link generation with unique codes (CC_XXXXXXXX format)
  - Custom slug support for branded links
  - Click tracking with metadata (IP, user agent, referrer)
  - Conversion tracking when subscriptions are created
  - Revenue calculation and payout system

- **Database Schema**: Complete affiliate tracking tables
  - `creator_affiliate_links` - Stores affiliate link data
  - `affiliate_link_clicks` - Tracks all clicks with metadata
  - `affiliate_conversions` - Links subscribers to creators
  - Revenue sharing calculations (30% lifetime recurring)

- **API Endpoints**: Full REST API implemented
  - `POST /api/v1/subscription/affiliate/generate` - Create links
  - `GET /api/v1/subscription/affiliate/links` - Get creator's links
  - `POST /api/v1/subscription/affiliate/track/:linkCode` - Track clicks
  - Analytics and revenue endpoints for creators

#### Mobile App (80% Complete)
- **Creator Dashboard**: Basic implementation in `CreatorScreen.tsx`
  - Displays creator code and revenue stats
  - Share functionality for referral links
  - Analytics overview

- **Subscription Integration**: Links affiliate codes to checkouts
- **Deep Link Handlers**: iOS AppDelegate has Universal Links setup
- **API Integration**: Mobile app can generate and track affiliate links

#### Website (70% Complete)
- **Creator Program Landing**: Detailed revenue sharing info
- **Analytics Tracking**: Basic event tracking implemented
- **Download Attribution**: Tracks which platform users download from

### ❌ What's Missing (Critical Gaps)

#### 1. Universal Links Setup (0% Complete)
- **No AASA File**: Missing `apple-app-site-association` file
- **No Associated Domains**: iOS entitlements file is empty
- **No URL Routing**: Mobile app can't handle deep links
- **No Attribution Flow**: Can't track app installs from web links

#### 2. Deep Link URL Handling (10% Complete)
- **No Link Parsing**: App can't parse referral codes from URLs
- **No Routing Logic**: No navigation from deep links to signup/attribution
- **No Persistence**: Referral codes not stored during signup flow

#### 3. App Install Attribution (0% Complete)
- **No Install Tracking**: Can't track which creator drove app installs
- **No Deferred Deep Links**: Lost attribution if app not installed
- **No Attribution APIs**: No integration with Apple/Google attribution

#### 4. Website Referral Landing Pages (0% Complete)
- **No Dynamic Landing Pages**: `/ref/{code}` and `/c/{slug}` don't exist
- **No App Store Redirects**: No smart app install flows
- **No Attribution Persistence**: Codes lost during app install process

---

## Implementation Plan

### Phase 1: Universal Links & AASA Setup (Priority 1)

#### 1.1 Create Apple App Site Association File
**Location**: `website/.well-known/apple-app-site-association`

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "2RYA3562X9.com.abmccull.cookcamexpo",
        "paths": [
          "/ref/*",
          "/c/*",
          "/creator/*",
          "/recipe/*",
          "/signup",
          "/download"
        ]
      }
    ]
  }
}
```

#### 1.2 Update iOS Entitlements
**File**: `mobile/CookCam/ios/cookcamexpo/cookcamexpo.entitlements`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.developer.associated-domains</key>
  <array>
    <string>applinks:cookcam.ai</string>
    <string>applinks:www.cookcam.ai</string>
  </array>
</dict>
</plist>
```

#### 1.3 Configure Xcode Project
- Add Associated Domains capability
- Ensure bundle ID matches AASA file: `com.abmccull.cookcamexpo`
- Verify team ID matches: `2RYA3562X9`

### Phase 2: Website Referral Landing Pages (Priority 1)

#### 2.1 Create Referral Landing Page
**File**: `website/ref.html` (for `/ref/{code}` URLs)

```html
<!DOCTYPE html>
<html>
<head>
    <title>Join CookCam AI</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script>
        // Extract referral code from URL
        const pathParts = window.location.pathname.split('/');
        const referralCode = pathParts[2]; // /ref/{code}
        
        // Store referral code for attribution
        if (referralCode) {
            localStorage.setItem('cookcam_referral_code', referralCode);
            sessionStorage.setItem('cookcam_referral_code', referralCode);
            
            // Track the click
            fetch(`https://api.cookcam.ai/api/v1/subscription/affiliate/track/${referralCode}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source: 'web_landing',
                    user_agent: navigator.userAgent,
                    referrer: document.referrer
                })
            });
        }
        
        // Detect mobile platform and redirect to app store
        function redirectToAppStore() {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const isAndroid = /Android/.test(navigator.userAgent);
            
            if (isIOS) {
                window.location.href = 'https://apps.apple.com/app/cookcam-ai';
            } else if (isAndroid) {
                window.location.href = 'https://play.google.com/store/apps/details?id=com.abmccull.cookcamexpo';
            } else {
                // Desktop - show download options
                window.location.href = '/index.html#download';
            }
        }
        
        // Try to open app first, fallback to app store
        function smartRedirect() {
            const appScheme = `cookcam://ref/${referralCode}`;
            
            // Try to open app
            window.location.href = appScheme;
            
            // Fallback to app store after 3 seconds
            setTimeout(redirectToAppStore, 3000);
        }
        
        // Redirect immediately
        setTimeout(smartRedirect, 500);
    </script>
</head>
<body>
    <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
        <h2>Opening CookCam AI...</h2>
        <p>If the app doesn't open automatically, we'll redirect you to download it.</p>
        <p><a href="#" onclick="redirectToAppStore()">Download Now</a></p>
    </div>
</body>
</html>
```

#### 2.2 Create Custom Creator Landing Page
**File**: `website/c.html` (for `/c/{slug}` URLs)

Similar structure but with custom branding per creator.

### Phase 3: Mobile App Deep Link Handling (Priority 1)

#### 3.1 Create Deep Link Service
**File**: `mobile/CookCam/src/services/DeepLinkService.ts`

```typescript
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DeepLinkData {
  type: 'referral' | 'creator' | 'recipe' | 'signup';
  code?: string;
  slug?: string;
  recipeId?: string;
}

class DeepLinkService {
  private static instance: DeepLinkService;
  private pendingLink: DeepLinkData | null = null;

  static getInstance(): DeepLinkService {
    if (!DeepLinkService.instance) {
      DeepLinkService.instance = new DeepLinkService();
    }
    return DeepLinkService.instance;
  }

  async initialize() {
    // Handle app launch from deep link
    const initialURL = await Linking.getInitialURL();
    if (initialURL) {
      this.handleDeepLink(initialURL);
    }

    // Handle deep links while app is running
    Linking.addEventListener('url', (event) => {
      this.handleDeepLink(event.url);
    });
  }

  private async handleDeepLink(url: string) {
    const linkData = this.parseURL(url);
    
    if (linkData) {
      // Store referral code for later attribution
      if (linkData.code) {
        await AsyncStorage.setItem('pending_referral_code', linkData.code);
      }
      
      // Track the deep link click
      await this.trackDeepLinkClick(linkData);
      
      // Store for processing after authentication
      this.pendingLink = linkData;
      
      // Navigate based on user state
      this.processDeepLink(linkData);
    }
  }

  private parseURL(url: string): DeepLinkData | null {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;

      if (path.startsWith('/ref/')) {
        return {
          type: 'referral',
          code: path.split('/')[2]
        };
      }
      
      if (path.startsWith('/c/')) {
        return {
          type: 'creator',
          slug: path.split('/')[2]
        };
      }
      
      if (path.startsWith('/recipe/')) {
        return {
          type: 'recipe',
          recipeId: path.split('/')[2]
        };
      }
      
      return null;
    } catch {
      return null;
    }
  }

  private async trackDeepLinkClick(linkData: DeepLinkData) {
    if (linkData.type === 'referral' && linkData.code) {
      // Track affiliate click
      try {
        await fetch(`https://api.cookcam.ai/api/v1/subscription/affiliate/track/${linkData.code}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'mobile_deep_link',
            platform: Platform.OS
          })
        });
      } catch (error) {
        console.log('Failed to track deep link click:', error);
      }
    }
  }

  private processDeepLink(linkData: DeepLinkData) {
    // This will be called by the main app after checking auth state
    // Implementation depends on navigation setup
  }

  getPendingLink(): DeepLinkData | null {
    const link = this.pendingLink;
    this.pendingLink = null; // Clear after reading
    return link;
  }

  async getPendingReferralCode(): Promise<string | null> {
    return await AsyncStorage.getItem('pending_referral_code');
  }

  async clearPendingReferralCode() {
    await AsyncStorage.removeItem('pending_referral_code');
  }
}

export default DeepLinkService;
```

#### 3.2 Update App.tsx for Deep Link Routing
**Update**: `mobile/CookCam/src/App.tsx`

```typescript
// Add to imports
import DeepLinkService from './services/DeepLinkService';

// Add to App component
useEffect(() => {
  const deepLinkService = DeepLinkService.getInstance();
  deepLinkService.initialize();
}, []);

// Add linking configuration to NavigationContainer
const linking = {
  prefixes: ['cookcam://', 'https://cookcam.ai', 'https://www.cookcam.ai'],
  config: {
    screens: {
      Welcome: 'signup',
      Main: {
        screens: {
          Home: 'ref/:code',
          Creator: 'c/:slug',
        }
      },
      RecipeDetail: 'recipe/:recipeId',
    },
  },
};

// Update NavigationContainer
<NavigationContainer linking={linking}>
  {user ? <AppNavigator /> : <AuthNavigator />}
</NavigationContainer>
```

### Phase 4: Attribution & Conversion Tracking (Priority 2)

#### 4.1 Update Signup Flow
**Update**: `mobile/CookCam/src/screens/SignupScreen.tsx`

```typescript
// Add to signup process
const handleSignup = async (userData) => {
  try {
    // Create user account
    const user = await authService.signup(userData);
    
    // Check for pending referral code
    const referralCode = await DeepLinkService.getInstance().getPendingReferralCode();
    
    if (referralCode) {
      // Link user to referral
      await cookCamApi.linkUserToReferral(user.id, referralCode);
      await DeepLinkService.getInstance().clearPendingReferralCode();
    }
    
    // Continue with normal signup flow
  } catch (error) {
    // Handle errors
  }
};
```

#### 4.2 Update Subscription Flow
**Update**: `backend/api/src/routes/subscription.ts`

```typescript
// Update create-checkout to handle affiliate codes
router.post('/create-checkout', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { tierId, successUrl, cancelUrl, affiliateCode } = req.body;

    // Store affiliate code for conversion tracking
    if (affiliateCode) {
      await storeTemporaryAffiliateCode(userId, affiliateCode);
    }

    // ... rest of checkout logic
  } catch (error) {
    // Handle errors
  }
});

// Add webhook handler for successful subscriptions
router.post('/webhook/stripe', async (req: Request, res: Response) => {
  try {
    const event = req.body;
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata.user_id;
      
      // Check for pending affiliate code
      const affiliateCode = await getTemporaryAffiliateCode(userId);
      
      if (affiliateCode) {
        // Record the conversion
        await creatorService.recordAffiliateConversion({
          linkCode: affiliateCode,
          subscriberId: userId,
          subscriptionId: session.subscription,
          tierId: session.metadata.tier_id
        });
        
        // Clear temporary code
        await clearTemporaryAffiliateCode(userId);
      }
    }
    
    res.json({ received: true });
  } catch (error) {
    // Handle errors
  }
});
```

### Phase 5: Enhanced Creator Tools (Priority 3)

#### 5.1 Update Creator Dashboard
**Update**: `mobile/CookCam/src/screens/CreatorScreen.tsx`

Add sections for:
- Multiple affiliate link management
- Custom link creation with campaigns
- Detailed click and conversion analytics
- Link performance metrics
- Payout request functionality

#### 5.2 Add Link Management Screen
**New**: `mobile/CookCam/src/screens/AffiliateLinksScreen.tsx`

- List all creator's affiliate links
- Create new links with custom campaigns
- View individual link performance
- Copy/share specific links
- Deactivate/reactivate links

### Phase 6: Testing & Validation (Priority 2)

#### 6.1 AASA File Validation
- Test AASA file accessibility: `curl https://cookcam.ai/.well-known/apple-app-site-association`
- Validate JSON format and content
- Test on multiple domains (www.cookcam.ai, cookcam.ai)

#### 6.2 Deep Link Testing
- Test Universal Links from Safari
- Test custom scheme links (cookcam://)
- Test attribution flow end-to-end
- Validate conversion tracking

#### 6.3 Attribution Testing
- Test referral code persistence through app install
- Validate conversion recording
- Test revenue calculation accuracy
- Verify payout calculations

---

## Implementation Checklist

### Immediate Actions (Week 1)
- [ ] Create and deploy AASA file to website
- [ ] Update iOS entitlements with Associated Domains
- [ ] Create website referral landing pages (/ref/{code})
- [ ] Implement basic deep link handling in mobile app

### Short Term (Week 2-3)
- [ ] Implement DeepLinkService in mobile app
- [ ] Update signup flow for referral attribution
- [ ] Add conversion tracking to subscription webhooks
- [ ] Test end-to-end attribution flow

### Medium Term (Week 4-6)
- [ ] Enhanced creator dashboard with link management
- [ ] Custom campaign creation
- [ ] Detailed analytics and reporting
- [ ] A/B testing for landing pages

### Long Term (Month 2+)
- [ ] Advanced attribution models
- [ ] Multi-touch attribution
- [ ] Creator collaboration tools
- [ ] Automated payout systems

---

## Revenue Impact Projections

### Conservative Estimate (Month 3)
- 50 active creators
- Average 20 referrals per creator per month
- 1000 total referrals
- 10% conversion rate = 100 paid subscriptions
- Revenue: $399/month (100 subs × $3.99)
- Creator payouts: $119.70/month (30% of revenue)

### Aggressive Estimate (Month 12)
- 500 active creators
- Average 100 referrals per creator per month
- 50,000 total referrals
- 15% conversion rate = 7,500 paid subscriptions
- Revenue: $29,925/month (7,500 subs × $3.99)
- Creator payouts: $8,977.50/month (30% of revenue)

### Success Metrics to Track
- Click-through rate from links to app store
- App install rate from referral links
- Conversion rate from install to paid subscription
- Creator retention and engagement
- Average revenue per creator
- Time from signup to first referral
- Monthly recurring referral growth rate

---

## Technical Considerations

### Security
- Validate all incoming referral codes
- Rate limit affiliate link creation
- Prevent fraudulent click inflation
- Secure webhook endpoints with signatures

### Performance
- Cache affiliate link lookups
- Batch process conversion events
- Optimize database queries for analytics
- Use CDN for landing pages

### Scalability
- Design for millions of clicks per month
- Use queue system for conversion processing
- Implement horizontal scaling for API endpoints
- Consider separate analytics database

### Compliance
- GDPR compliance for EU users
- App Store guidelines for referral programs
- FTC disclosure requirements for creators
- Tax reporting for creator earnings

---

This implementation plan provides a comprehensive roadmap for creating a world-class creator referral system that can scale to support thousands of creators and millions of referrals per month. 