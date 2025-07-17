# CookCam AI Marketing Website

A modern, conversion-focused marketing website for the CookCam AI mobile app featuring creator program monetization and comprehensive privacy compliance.

## 🚀 Features

### Landing Page
- **Hero Section**: Compelling value proposition with conversion-focused copy
- **Creator Program**: Detailed revenue sharing model (30% lifetime, 100% tips, 70% collections)
- **Unit Economics**: Real earnings potential across creator tiers ($260-4,700/month)
- **Success Stories**: Testimonials from fictional creators earning $2,100-4,800/month
- **App Features**: AI-powered recipe generation, ingredient scanning, gamification
- **Target Personas**: Beginners, parents, health enthusiasts, creators
- **Download Section**: App store badges with ratings and stats

### Legal Pages
- **Privacy Policy**: Complete GDPR/CCPA compliant privacy documentation
- **Account Deletion**: Google Play compliant deletion process and data handling

### Technical Features
- **Responsive Design**: Mobile-first approach with modern CSS Grid/Flexbox
- **Performance Optimized**: Lazy loading, debounced events, efficient animations
- **Interactive Elements**: Smooth scrolling, mobile menu, modal dialogs
- **Vercel Analytics**: Comprehensive event tracking for conversions and user behavior
- **SEO Optimized**: Meta tags, Open Graph, semantic HTML structure

## 📁 File Structure

```
website/
├── index.html              # Main landing page
├── privacy.html             # Privacy policy page
├── account-deletion.html    # Account deletion instructions (Google Play required)
├── css/
│   └── styles.css          # Complete responsive CSS with modern design
├── js/
│   ├── main.js             # Interactive features and UI behavior
│   └── analytics.js        # Vercel Analytics integration and event tracking
├── images/                 # Website assets (logos, mockups, badges)
│   ├── logo.png            # CookCam AI logo
│   ├── app-mockup.png      # App screenshot mockup
│   ├── app-store-badge.png # iOS App Store download badge
│   ├── google-play-badge.png # Google Play download badge
│   └── og-image.jpg        # Open Graph social sharing image
└── README.md              # This file
```

## 🎨 Design System

### Color Palette
- **Primary**: `#FF6B35` (Orange) - CTA buttons, highlights
- **Secondary**: `#2D1B69` (Dark Purple) - Headers, nav
- **Accent**: `#FFB800` (Yellow) - Creator earnings, success indicators
- **Text**: `#1a1a1a` (Dark), `#666` (Light), `#8E8E93` (Muted)
- **Background**: `#F8F8FF` (Light), `#FFFFFF` (White)

### Typography
- **Font**: Inter (Google Fonts)
- **Weights**: 300, 400, 500, 600, 700, 800
- **Scale**: Modern typographic scale for hierarchy

### Components
- **Buttons**: Gradient primary, outlined secondary with hover effects
- **Cards**: Clean with shadows, hover animations
- **Grids**: Responsive CSS Grid for all layouts
- **Navigation**: Fixed header with scroll effects

## 🛠️ Setup Instructions

### 1. Image Assets Required
Place the following images in the `images/` directory:

```bash
# Required images (create/source these):
images/logo.png              # 40x40px CookCam AI logo
images/app-mockup.png        # App screenshot for hero section
images/app-store-badge.png   # Official App Store download badge
images/google-play-badge.png # Official Google Play download badge
images/og-image.jpg          # 1200x630px social sharing image
```

### 2. Domain Configuration
- **Primary Domain**: `cookcam.ai` (mentioned in account deletion page)
- **Alternative**: `cookcam.app` (mentioned in meta tags)
- Ensure the domain matches your Google Play/App Store listings

### 3. App Store Links
Update the download links in `index.html`:
```html
<!-- Update these with your actual app store URLs -->
<a href="https://apps.apple.com/app/cookcam-ai">iOS App Store</a>
<a href="https://play.google.com/store/apps/details?id=com.cookcam.app">Google Play</a>
```

## 🚀 Deployment Options

### Option 1: Static Hosting (Recommended)
Deploy to any static hosting service:

**Netlify:**
```bash
# Connect to GitHub repo and auto-deploy
# Domain: https://cookcam.ai
```

**Vercel:**
```bash
# Connect to GitHub repo
vercel --prod
```

**GitHub Pages:**
```bash
# Enable GitHub Pages in repository settings
# Custom domain: cookcam.ai
```

### Option 2: Traditional Web Hosting
Upload all files to your web server:
```bash
# FTP/SFTP to your hosting provider
# Ensure index.html is in the root directory
```

### Option 3: CDN Deployment
For global performance:
```bash
# Upload to AWS S3 + CloudFront
# Or use Cloudflare Pages
```

## 🔧 Customization

### Analytics Integration
Add your analytics code to `js/main.js`:
```javascript
// Google Analytics
function trackEvent(eventName, properties = {}) {
    if (window.gtag) {
        gtag('event', eventName, properties);
    }
}

// Mixpanel
function trackEvent(eventName, properties = {}) {
    if (window.mixpanel) {
        mixpanel.track(eventName, properties);
    }
}
```

### Content Updates
- **Revenue numbers**: Update earnings examples in creator section
- **User statistics**: Modify hero section stats (500K+ recipes, 50K+ users)
- **Success stories**: Replace fictional creator testimonials with real ones
- **Contact emails**: Ensure support@cookcam.ai and privacy@cookcam.ai are active

### Styling Modifications
Edit `css/styles.css` CSS custom properties:
```css
:root {
    --primary-color: #FF6B35;    /* Change brand colors */
    --secondary-color: #2D1B69;
    --accent-color: #FFB800;
}
```

## 📱 Google Play Requirements

The website includes the required account deletion page at `/account-deletion.html` that:

✅ **References app name**: "CookCam AI by ABM Studios LLC"  
✅ **Prominent deletion steps**: Two clear options (in-app + email)  
✅ **Data specifications**: What's deleted vs. retained  
✅ **Contact information**: support@cookcam.ai for requests  
✅ **Timeline**: 30-day deletion process  
✅ **Compliance**: GDPR, CCPA, and app store requirements  

## 🔒 Privacy Compliance

### GDPR Compliance
- ✅ Lawful basis for processing
- ✅ Data subject rights (access, portability, deletion)
- ✅ Clear consent mechanisms
- ✅ Data retention policies
- ✅ International transfer safeguards

### CCPA Compliance
- ✅ Right to know what personal information is collected
- ✅ Right to delete personal information
- ✅ Right to opt-out of sale of personal information
- ✅ Right to non-discrimination

## 📊 Performance

### Core Web Vitals
- **LCP**: < 2.5s (optimized images, minimal CSS)
- **FID**: < 100ms (efficient JavaScript, debounced events)
- **CLS**: < 0.1 (no layout shifts, proper image sizing)

### Optimization Features
- CSS Grid for efficient layouts
- Intersection Observer for scroll animations
- Debounced scroll/resize handlers
- Lazy loading implementation ready
- Minimal JavaScript dependencies

## 🚦 Testing Checklist

Before deployment, verify:

### Functionality
- [ ] All navigation links work
- [ ] Mobile menu functions properly
- [ ] Smooth scrolling works on all browsers
- [ ] Modal dialogs open/close correctly
- [ ] Download buttons track correctly
- [ ] Email links work (mailto: functionality)

### Content
- [ ] All app store links are correct
- [ ] Creator revenue numbers are accurate
- [ ] Contact emails are active
- [ ] Privacy policy is current
- [ ] Account deletion process matches app functionality

### Performance
- [ ] Images are optimized (WebP format recommended)
- [ ] CSS/JS files are minified for production
- [ ] HTTPS is enabled
- [ ] Core Web Vitals pass Google's thresholds

### SEO
- [ ] Meta descriptions are compelling
- [ ] Open Graph images display correctly
- [ ] Schema markup added (optional)
- [ ] Sitemap.xml created (optional)

## 🔗 Related Documentation

- [Privacy Policy Implementation](../PRIVACY_POLICY.md)
- [Account Deletion System](../ACCOUNT_DELETION_IMPLEMENTATION.md)
- [Google Play Data Safety](../GOOGLE_PLAY_DATA_SAFETY.md)
- [Production Readiness Report](../PRODUCTION_READINESS_FINAL_REPORT.md)

## 📊 Analytics Implementation

### Vercel Analytics Setup
- **Package**: `@vercel/analytics@^1.1.1` installed via npm
- **Configuration**: Enabled in `vercel.json` with `"analytics": { "enable": true }`
- **Integration**: Automatic pageview tracking and custom event monitoring

### Tracked Events
- **Download Clicks**: iOS/Android app store redirects
- **Creator Interest**: Creator program section engagement  
- **Custom Events**: Page interactions and conversion funnels

### Testing
- Visit `/test-analytics.html` to verify analytics functionality
- Check browser console for successful initialization
- Monitor Vercel dashboard for real-time analytics data

### Files Modified
- `js/analytics.js` - Core analytics implementation
- All HTML files - Analytics script inclusion
- `package.json` - Dependency management
- `vercel.json` - Analytics configuration

## 📞 Support

For questions about the website implementation:
- **Technical Issues**: Contact your development team
- **Content Updates**: Modify HTML files directly
- **Legal Compliance**: Consult with legal team before major changes

---

**© 2024 ABM Studios LLC. All rights reserved.**

This website is part of the CookCam AI ecosystem and supports the mobile app's user acquisition and creator monetization goals. 