#!/bin/bash

# Quick Fix Script for CookCam API Deployment Issues
echo "🔧 CookCam API Quick Fix"
echo "======================="

# Navigate to app directory
cd /var/www/cookcam-api

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Not in the correct directory. Looking for CookCam API..."
    cd /var/www/cookcam-api 2>/dev/null || cd /home/cookcam-api 2>/dev/null || cd /opt/cookcam-api 2>/dev/null || {
        echo "❌ Cannot find CookCam API directory"
        exit 1
    }
fi

echo "📂 Working in: $(pwd)"

# Stop existing PM2 processes
echo "🛑 Stopping existing PM2 processes..."
pm2 stop cookcam-api 2>/dev/null || echo "No existing process to stop"
pm2 delete cookcam-api 2>/dev/null || echo "No existing process to delete"

# Check for .env file
if [ ! -f ".env" ]; then
    echo "❌ .env file missing. Creating from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "⚠️  Please edit .env file with your actual values"
    else
        echo "❌ No .env.example found. You need to create .env manually"
    fi
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the application
echo "🔨 Building application..."
npm run build

# Check if build was successful
if [ ! -f "dist/index.js" ]; then
    echo "❌ Build failed! Check for TypeScript errors:"
    npm run build
    exit 1
fi

# Test the application directly (without PM2)
echo "🧪 Testing direct Node.js execution..."
timeout 10s node dist/index.js &
NODE_PID=$!
sleep 3

# Test if the app responds
if curl -f http://localhost:3000/health -m 5 >/dev/null 2>&1; then
    echo "✅ App responds when run directly"
    kill $NODE_PID 2>/dev/null
else
    echo "❌ App doesn't respond when run directly"
    kill $NODE_PID 2>/dev/null
    echo "Checking for startup errors..."
    node dist/index.js &
    sleep 2
    kill $! 2>/dev/null
fi

# Create ecosystem.config.js if it doesn't exist
if [ ! -f "ecosystem.config.js" ]; then
    echo "📝 Creating PM2 ecosystem config..."
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'cookcam-api',
    script: 'dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
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
EOF
fi

# Create logs directory
mkdir -p logs

# Start with PM2
echo "🚀 Starting with PM2..."
pm2 start ecosystem.config.js --env production

# Wait and check status
sleep 5
pm2 status

# Test the health endpoint
echo "🏥 Testing health endpoint..."
sleep 2
if curl -f http://localhost:3000/health -m 10 >/dev/null 2>&1; then
    echo "✅ Health endpoint is responding!"
    curl http://localhost:3000/health
else
    echo "❌ Health endpoint still not responding"
    echo "PM2 logs:"
    pm2 logs cookcam-api --lines 20 --nostream
fi

echo ""
echo "📋 Summary:"
echo "- App directory: $(pwd)"
echo "- PM2 status: $(pm2 status | grep cookcam-api | awk '{print $4}')"
echo "- Port 3000 binding: $(sudo netstat -tulpn | grep :3000 | wc -l) processes"
echo ""
echo "Next steps if still not working:"
echo "1. Check logs: pm2 logs cookcam-api --follow"
echo "2. Check environment: cat .env"
echo "3. Test direct execution: node dist/index.js" 