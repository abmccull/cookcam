# 📱 IAP Receipt Validation Setup Guide

This guide explains how to complete the In-App Purchase (IAP) implementation for both iOS and Android platforms in CookCam.

## 🔧 **Current Status**

✅ **Completed:**
- Backend IAP validation routes
- Frontend purchase flow integration
- Receipt validation logic for both platforms

❌ **Requires Setup:**
- Apple App Store configuration
- Google Play Console configuration
- API credentials and secrets

---

## 🍎 **iOS Setup (Apple App Store)**

### **Step 1: App Store Connect Configuration**

1. **Go to App Store Connect** → Your App → Features → In-App Purchases
2. **Create Subscription Groups:**
   ```
   Group Name: CookCam Subscriptions
   Reference Name: cookcam_subscriptions
   ```

3. **Create Auto-Renewable Subscriptions:**
   ```
   Product ID: com.cookcam.pro.monthly
   Reference Name: CookCam Pro Monthly
   Duration: 1 Month
   Price: $3.99
   
   Product ID: com.cookcam.creator.monthly  
   Reference Name: CookCam Creator Monthly
   Duration: 1 Month
   Price: $7.99
   ```

### **Step 2: Apple Shared Secret**

1. **Go to App Store Connect** → Your App → App Information → App Store Connect API
2. **Generate Shared Secret** (used for receipt validation)
3. **Copy the shared secret** - you'll need this for backend

### **Step 3: Environment Variables**

Add to your backend `.env` file:

```bash
# Apple App Store
APPLE_SHARED_SECRET=your_shared_secret_here
```

### **Step 4: iOS Testing**

```bash
# Test with Sandbox environment
# Create sandbox test accounts in App Store Connect
# Use these accounts for testing purchases
```

---

## 🤖 **Android Setup (Google Play)**

### **Step 1: Google Play Console Configuration**

1. **Go to Google Play Console** → Your App → Monetization setup → Products → Subscriptions
2. **Create Subscriptions:**
   ```
   Product ID: cookcam_pro_monthly
   Name: CookCam Pro Monthly
   Price: $3.99
   Billing Period: 1 month
   
   Product ID: cookcam_creator_monthly
   Name: CookCam Creator Monthly  
   Price: $7.99
   Billing Period: 1 month
   ```

### **Step 2: Service Account Setup**

1. **Go to Google Cloud Console** → IAM & Admin → Service Accounts
2. **Create Service Account:**
   ```
   Name: cookcam-iap-validator
   Description: Service account for CookCam IAP validation
   ```

3. **Grant Permissions:**
   - Go to Google Play Console → Setup → API access
   - Link the service account
   - Grant permissions: **Financial data, Orders and cancellation survey responses**

4. **Generate Private Key:**
   ```bash
   # Download JSON key file
   # This contains your private key for API authentication
   ```

### **Step 3: Environment Variables**

Add to your backend `.env` file:

```bash
# Google Play
GOOGLE_PLAY_PACKAGE_NAME=com.cookcam.app
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project",...}'
```

### **Step 4: Android Testing**

```bash
# Test with Internal Test Track
# Add test users in Google Play Console
# Upload signed APK to Internal Test Track
```

---

## 🚀 **Deployment Steps**

### **Step 1: Backend Deployment**

1. **Add Environment Variables** to your production environment:
   ```bash
   APPLE_SHARED_SECRET=your_apple_shared_secret
   GOOGLE_PLAY_PACKAGE_NAME=com.cookcam.app
   GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
   ```

2. **Deploy Backend** with IAP validation routes:
   ```bash
   cd backend/api
   npm run deploy
   ```

### **Step 2: Frontend Configuration**

1. **Update Product IDs** in `src/services/subscriptionService.ts` if needed
2. **Test Purchase Flow** in development environment

### **Step 3: App Store Submissions**

1. **iOS App Store:**
   - Upload app with IAP capability
   - Submit for review
   - Include IAP products in review

2. **Google Play Store:**
   - Upload signed APK/AAB
   - Enable subscription products
   - Submit for review

---

## 🔐 **Security Considerations**

### **Apple Receipt Validation**
- ✅ Uses Apple's official verification API
- ✅ Handles sandbox vs production environments automatically
- ✅ Validates receipt signature and expiration

### **Google Play Validation**
- ✅ Uses Google Play Developer API v3
- ✅ JWT-based authentication with service account
- ✅ Validates purchase tokens and subscription status

### **Backend Security**
- ✅ Requires user authentication for all IAP endpoints
- ✅ Server-side receipt validation (not client-side)
- ✅ Proper error handling and logging

---

## 🧪 **Testing Guide**

### **iOS Testing**

```typescript
// Test in iOS Simulator with Sandbox accounts
const testPurchase = async () => {
  try {
    // Use sandbox test account
    await subscriptionService.purchaseProduct('com.cookcam.creator.monthly');
    // Purchase should validate with sandbox environment
  } catch (error) {
    console.log('Test purchase failed:', error);
  }
};
```

### **Android Testing**

```typescript
// Test with Internal Test Track
const testPurchase = async () => {
  try {
    // Use test account from Google Play Console
    await subscriptionService.purchaseProduct('cookcam_creator_monthly');
    // Purchase should validate with Google Play API
  } catch (error) {
    console.log('Test purchase failed:', error);
  }
};
```

### **Backend Testing**

```bash
# Test receipt validation endpoint
curl -X POST \
  https://your-backend.com/api/v1/iap/validate-receipt \
  -H "Authorization: Bearer your_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "ios",
    "productId": "com.cookcam.creator.monthly",
    "receipt": "base64_receipt_data"
  }'
```

---

## 🚨 **Common Issues & Solutions**

### **Apple Issues**

❌ **Status 21007 (Sandbox receipt in production)**
```typescript
// Solution: Backend automatically retries with sandbox URL
// No action needed - handled automatically
```

❌ **Status 21004 (Invalid shared secret)**
```bash
# Solution: Regenerate shared secret in App Store Connect
APPLE_SHARED_SECRET=new_shared_secret
```

### **Google Play Issues**

❌ **401 Unauthorized**
```bash
# Solution: Check service account permissions
# Ensure account has "Financial data" access in Play Console
```

❌ **Invalid purchase token**
```typescript
// Solution: Ensure you're using the correct purchase token
// from the PurchaseUpdatedListener
```

### **General Issues**

❌ **Receipt validation timeout**
```typescript
// Solution: Backend has 10-second timeout
// Apple/Google APIs may be slow - retry mechanism included
```

---

## 📝 **Next Steps**

1. **Complete Apple App Store Connect setup** (Subscriptions + Shared Secret)
2. **Complete Google Play Console setup** (Subscriptions + Service Account)
3. **Add environment variables** to production backend
4. **Test purchase flows** in both platforms
5. **Submit apps for review** with IAP functionality

After completing these steps, your IAP integration will be fully functional with secure receipt validation! 🎉 