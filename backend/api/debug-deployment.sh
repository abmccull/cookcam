#!/bin/bash

# CookCam API Deployment Debugging Script
echo "🔍 CookCam API Deployment Debugging"
echo "=================================="

# Check PM2 status
echo ""
echo "📊 PM2 Status:"
pm2 status

echo ""
echo "📝 PM2 Logs (last 50 lines):"
pm2 logs cookcam-api --lines 50 --nostream

echo ""
echo "💾 PM2 Error Logs (last 20 lines):"
pm2 logs cookcam-api --err --lines 20 --nostream

echo ""
echo "🌐 Port Usage Check:"
echo "Checking if port 3000 is in use..."
sudo netstat -tulpn | grep :3000 || echo "Port 3000 is not bound"

echo ""
echo "🔍 Process Check:"
echo "Checking for Node.js processes..."
ps aux | grep node | grep -v grep || echo "No Node.js processes found"

echo ""
echo "📂 Application Directory:"
echo "Current directory: $(pwd)"
echo "Files in current directory:"
ls -la

echo ""
echo "🔧 Environment Check:"
echo "NODE_ENV: ${NODE_ENV:-not set}"
echo "PORT: ${PORT:-not set}"

echo ""
echo "📄 Environment File Check:"
if [ -f ".env" ]; then
    echo "✅ .env file exists"
    echo "Environment variables (excluding sensitive data):"
    grep -E "^(NODE_ENV|PORT|CORS_ORIGIN)" .env || echo "No matching environment variables found"
else
    echo "❌ .env file missing"
fi

echo ""
echo "🏗️ Build Check:"
if [ -d "dist" ]; then
    echo "✅ dist directory exists"
    echo "Contents of dist directory:"
    ls -la dist/
    if [ -f "dist/index.js" ]; then
        echo "✅ index.js exists in dist"
    else
        echo "❌ index.js missing in dist"
    fi
else
    echo "❌ dist directory missing - run 'npm run build'"
fi

echo ""
echo "🔗 Dependencies Check:"
if [ -f "package.json" ]; then
    echo "✅ package.json exists"
else
    echo "❌ package.json missing"
fi

if [ -d "node_modules" ]; then
    echo "✅ node_modules exists"
else
    echo "❌ node_modules missing - run 'npm install'"
fi

echo ""
echo "🌐 Network Connectivity:"
echo "Testing local connectivity..."
curl -f http://localhost:3000/health -m 5 2>/dev/null && echo "✅ Health endpoint responding" || echo "❌ Health endpoint not responding"

echo ""
echo "🔒 Firewall Check:"
sudo ufw status || echo "UFW not configured"

echo ""
echo "📊 System Resources:"
echo "Memory usage:"
free -h
echo ""
echo "Disk usage:"
df -h /

echo ""
echo "🚀 Quick Restart Commands:"
echo "To restart the app: pm2 restart cookcam-api"
echo "To view live logs: pm2 logs cookcam-api --follow"
echo "To check specific issues:"
echo "  - Check build: npm run build"
echo "  - Check start: node dist/index.js"
echo "  - Check environment: cat .env"

echo ""
echo "🔍 Advanced Debugging:"
echo "If the app shows as online but doesn't respond:"
echo "1. Check if it's binding to the correct port: sudo lsof -i :3000"
echo "2. Test direct Node.js execution: cd /var/www/cookcam-api && node dist/index.js"
echo "3. Check for startup errors in the application itself" 