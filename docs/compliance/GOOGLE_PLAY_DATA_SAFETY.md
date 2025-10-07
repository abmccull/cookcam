# CookCam - Google Play Data Safety Declaration

## Overview
This document outlines CookCam's data collection, usage, and security practices for Google Play Console Data Safety requirements.

## Data Collection Summary

### 1. Personal Information

#### ✅ **Collected: Name**
- **Purpose:** Account creation and personalization
- **Required:** Yes
- **Shared:** No
- **User Control:** Can be modified in profile settings

#### ✅ **Collected: Email Address**
- **Purpose:** Account authentication and important notifications
- **Required:** Yes  
- **Shared:** No
- **User Control:** Cannot be changed (account identifier)

#### ❌ **Not Collected: Physical Address**
#### ❌ **Not Collected: Phone Number**
#### ❌ **Not Collected: Race/Ethnicity**
#### ❌ **Not Collected: Political/Religious Beliefs**
#### ❌ **Not Collected: Sexual Orientation**
#### ❌ **Not Collected: Other Personal Info**

### 2. Financial Information

#### ✅ **Collected: Purchase History**
- **Purpose:** Subscription management and feature access
- **Required:** No (only for paid users)
- **Shared:** No
- **User Control:** Cannot be deleted (billing records)
- **Note:** Payment details handled entirely by Google Play

#### ❌ **Not Collected: Payment Info** (Handled by Google Play)
#### ❌ **Not Collected: Credit Card Info**
#### ❌ **Not Collected: Other Financial Info**

### 3. Health and Fitness

#### ❌ **Not Collected: Health Information**
#### ❌ **Not Collected: Fitness Information**

### 4. Messages

#### ❌ **Not Collected: Emails**
#### ❌ **Not Collected: SMS/Text Messages**
#### ❌ **Not Collected: Other Messages**

### 5. Photos and Videos

#### ✅ **Collected: Photos (Temporary)**
- **Purpose:** Ingredient scanning and recipe generation
- **Required:** Yes (core functionality)
- **Shared:** Yes (with OpenAI for AI processing only)
- **User Control:** Not stored permanently
- **Storage:** Processed and deleted within 24 hours

#### ❌ **Not Collected: Videos**

### 6. Audio Files

#### ❌ **Not Collected: Audio Files**
#### ❌ **Not Collected: Music Files**
#### ❌ **Not Collected: Voice/Sound Recordings**

### 7. Files and Documents

#### ❌ **Not Collected: Files/Documents**

### 8. Calendar

#### ❌ **Not Collected: Calendar Events**

### 9. Contacts

#### ❌ **Not Collected: Contacts**

### 10. App Activity

#### ✅ **Collected: App Interactions**
- **Purpose:** Feature improvement and personalization
- **Required:** No
- **Shared:** No
- **User Control:** Cannot opt out

#### ✅ **Collected: In-App Search History**
- **Purpose:** Personalized recipe recommendations
- **Required:** No
- **Shared:** No
- **User Control:** Can be deleted via account deletion

#### ✅ **Collected: Installed Apps** (Indirect)
- **Purpose:** Analytics and crash reporting
- **Required:** No
- **Shared:** No
- **User Control:** Cannot opt out

#### ✅ **Collected: Other User-Generated Content**
- **Purpose:** Recipe creation and saving
- **Required:** No
- **Shared:** No (unless user explicitly shares)
- **User Control:** Can delete individual recipes

#### ❌ **Not Collected: Web Browsing History**

### 11. Web Browsing

#### ❌ **Not Collected: Web Browsing History**

### 12. App Info and Performance

#### ✅ **Collected: Crash Logs**
- **Purpose:** App stability and bug fixes
- **Required:** No
- **Shared:** No
- **User Control:** Cannot opt out

#### ✅ **Collected: Diagnostics**
- **Purpose:** Performance monitoring
- **Required:** No
- **Shared:** No
- **User Control:** Cannot opt out

#### ✅ **Collected: Other App Performance Data**
- **Purpose:** User experience optimization
- **Required:** No
- **Shared:** No
- **User Control:** Cannot opt out

### 13. Device or Other IDs

#### ✅ **Collected: Device or Other IDs**
- **Purpose:** User authentication and analytics
- **Required:** Yes
- **Shared:** No
- **User Control:** Cannot opt out

## Data Usage Purposes

### ✅ **App Functionality**
- Core ingredient scanning and recipe generation
- User authentication and account management
- Subscription and feature access management

### ✅ **Analytics**
- App performance monitoring
- User engagement analysis
- Feature usage statistics

### ✅ **Developer Communications**
- Important account notifications
- Feature announcements (with consent)
- Customer support responses

### ✅ **Advertising or Marketing** (Creator Features Only)
- Affiliate link tracking for creators
- Revenue sharing analytics
- Creator performance metrics

### ✅ **Personalization**
- Recipe recommendations based on preferences
- Customized cooking suggestions
- Dietary restriction accommodations

### ❌ **Not Used for Fraud Prevention/Security** (Handled by platform)
### ❌ **Not Used for Compliance**
### ❌ **Not Used for Account Management** (Beyond basic features)

## Data Security

### Encryption in Transit
- ✅ **All data encrypted with TLS/HTTPS**
- All communication between app and servers uses encryption
- Third-party APIs (OpenAI, Supabase) use encrypted connections

### Encryption at Rest
- ✅ **All stored data encrypted**
- Database hosted on Supabase with industry-standard encryption
- No unencrypted data storage

### Data Deletion
- ✅ **User-requested deletion available**
- Complete account deletion removes all user data
- Automatic deletion of temporary image data
- 30-day deletion timeline for account data

## Data Sharing

### Third-Party Sharing
1. **OpenAI** (AI Processing)
   - Ingredient lists only (no personal data)
   - For recipe generation functionality
   - Data not stored by OpenAI

2. **Supabase** (Database & Auth)
   - User accounts and app data
   - EU-compliant hosting
   - Industry-standard security

3. **Analytics Providers**
   - Anonymized usage statistics only
   - No personally identifiable information
   - For app improvement only

### No Data Selling
- ❌ We do not sell user data to third parties
- ❌ We do not share data for advertising purposes
- ❌ We do not provide data to data brokers

## User Rights and Controls

### Data Access
- ✅ Users can view their profile and activity data
- ✅ Recipe history accessible in-app
- ✅ Subscription information available

### Data Correction
- ✅ Users can update profile information
- ✅ Recipe data can be edited or deleted
- ✅ Preferences can be modified

### Data Deletion
- ✅ **Complete account deletion available**
- ✅ Individual recipe deletion
- ✅ Automatic cleanup of temporary data
- ✅ 30-day permanent deletion timeline

### Data Portability
- ✅ Users can request data export
- ✅ Recipe data available for download
- ✅ Standard format exports

## Special Considerations

### Children's Privacy
- App not intended for users under 13
- No knowingly collected children's data
- Immediate deletion if discovered

### Creator Revenue Data
- Additional data collected for creator tier subscribers
- Affiliate performance tracking
- Revenue and payout information
- Tax compliance data retention

### Offline Functionality
- Minimal offline data storage
- Cached recipes for offline access
- No personal data stored offline

## Data Retention

### Active Users
- Profile data: Until account deletion
- Recipe data: Until user deletes or account deletion
- Usage analytics: 2 years maximum

### Deleted Accounts
- Immediate access removal
- 30-day complete data deletion
- Legal/compliance data may be retained longer

### Automatic Cleanup
- Temporary image data: 24 hours maximum
- Session data: Until logout
- Cache data: 30 days maximum

## Contact Information

For data privacy questions:
- Email: privacy@cookcam.app
- In-app support: Settings > Help & Support
- Data Protection Officer: Available upon request

---

**Last Updated:** [Current Date]  
**Effective Date:** [App Release Date] 