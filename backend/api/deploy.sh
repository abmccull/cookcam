#!/bin/bash

# CookCam API Deployment Script for DigitalOcean
set -e

echo "🚀 Starting CookCam API deployment..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18 LTS
echo "📥 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
echo "⚡ Installing PM2..."
sudo npm install -g pm2

# Install nginx for reverse proxy
echo "🌐 Installing nginx..."
sudo apt install -y nginx

# Create app directory
echo "📁 Setting up application directory..."
sudo mkdir -p /var/www/cookcam-api
sudo chown -R $USER:$USER /var/www/cookcam-api

# Copy application files (assuming this script runs from project directory)
echo "📄 Copying application files..."
cp -r . /var/www/cookcam-api/
cd /var/www/cookcam-api

# Install dependencies
echo "🔗 Installing dependencies..."
npm install

# Build the application
echo "🔨 Building application..."
npm run build

# Create PM2 ecosystem file
echo "📝 Creating PM2 configuration..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'cookcam-api',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/cookcam-api-error.log',
    out_file: '/var/log/pm2/cookcam-api-out.log',
    log_file: '/var/log/pm2/cookcam-api.log',
    max_memory_restart: '1G'
  }]
};
EOF

# Create nginx configuration
echo "🌐 Configuring nginx..."
sudo tee /etc/nginx/sites-available/cookcam-api << EOF
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or IP

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable nginx site
sudo ln -sf /etc/nginx/sites-available/cookcam-api /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Create log directory for PM2
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

echo "✅ Deployment script completed!"
echo ""
echo "Next steps:"
echo "1. Create and configure your .env file in /var/www/cookcam-api/"
echo "2. Set up your Supabase database"
echo "3. Start the application with: pm2 start ecosystem.config.js --env production"
echo "4. Reload nginx: sudo systemctl reload nginx"
echo "5. Set up SSL with Let's Encrypt (optional but recommended)" 