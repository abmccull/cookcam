# CookCam Deployment Guide - DigitalOcean

## Prerequisites
- DigitalOcean droplet (Ubuntu 20.04+ recommended)
- SSH access to your droplet
- Your droplet's IP address

## Step 1: Deploy Backend to DigitalOcean

### 1.1 Upload files to droplet
```bash
# From your local machine, upload the backend
scp -r backend/api root@YOUR_DROPLET_IP:/tmp/cookcam-api

# SSH into your droplet
ssh root@YOUR_DROPLET_IP
```

### 1.2 Run deployment script
```bash
cd /tmp/cookcam-api
chmod +x deploy.sh
./deploy.sh
```

### 1.3 Configure environment
```bash
# Copy the production environment file
cp production.env /var/www/cookcam-api/.env

# Edit nginx config with your IP (replace YOUR_DROPLET_IP)
sudo nano /etc/nginx/sites-available/cookcam-api
# Change: server_name your-domain.com;
# To:     server_name YOUR_DROPLET_IP;
```

### 1.4 Start the services
```bash
cd /var/www/cookcam-api

# Start the API with PM2
pm2 start ecosystem.config.js --env production

# Start nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check if everything is running
pm2 status
sudo systemctl status nginx
```

### 1.5 Test the API
```bash
# Check if API is responding
curl http://YOUR_DROPLET_IP/api/health

# Should return something like: {"status":"ok","message":"CookCam API is running"}
```

## Step 2: Update Mobile App Configuration

### 2.1 Update the API URL
In `mobile/CookCam/src/config/env.ts`, replace `YOUR_DROPLET_IP` with your actual droplet IP:

```javascript
API_URL: 'http://123.456.789.123',  // Your actual droplet IP
```

### 2.2 Rebuild the mobile app
```bash
cd mobile/CookCam

# Clean previous builds
rm android/app/src/main/assets/index.android.bundle
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res

# Build new standalone APK
cd android
./gradlew clean && ./gradlew assembleDebug

# Copy the new APK
cp app/build/outputs/apk/debug/app-debug.apk ../../CookCam-Live.apk
```

## Step 3: Test the Full App

### 3.1 Install the new APK
Transfer `CookCam-Live.apk` to your Android device and install it.

### 3.2 Test functionality
1. **App Launch**: Should start without crashing
2. **Registration**: Try creating a demo account
3. **Camera**: Take a photo of ingredients
4. **AI Recognition**: Should connect to your backend for processing
5. **Recipe Generation**: Should use OpenAI API through your backend

## Troubleshooting

### Check API logs
```bash
pm2 logs cookcam-api
```

### Check nginx logs
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Restart services
```bash
pm2 restart cookcam-api
sudo systemctl restart nginx
```

### Check database connection
```bash
cd /var/www/cookcam-api
npm run db:status
```

## Security Notes (for production)

1. **SSL Certificate**: Set up Let's Encrypt for HTTPS
2. **Firewall**: Configure UFW to only allow necessary ports
3. **Environment Variables**: Secure your API keys
4. **Database**: Ensure Supabase RLS policies are properly configured

## Next Steps

Once everything is working:
1. Point a domain to your droplet IP
2. Set up SSL with Let's Encrypt
3. Configure proper CORS settings
4. Set up monitoring and backups 