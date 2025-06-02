#!/bin/bash

echo "🔄 CookCam USDA Seeding Monitor"
echo "================================"

# Function to check if seeding process is running
check_process() {
    if pgrep -f "usda-bulk-seeder" > /dev/null; then
        echo "✅ Seeding process is RUNNING"
        return 0
    else
        echo "❌ Seeding process is NOT running"
        return 1
    fi
}

# Function to show database status
show_status() {
    echo ""
    echo "📊 Current Database Status:"
    npm run db:status 2>/dev/null | grep -E "(Total Ingredients|With USDA Data|Progress:|Success:|Errors:)"
}

# Function to show recent log output
show_logs() {
    echo ""
    echo "📋 Recent Seeding Activity:"
    if [ -f "seeding.log" ]; then
        tail -n 10 seeding.log
    else
        echo "No log file found"
    fi
}

# Main monitoring loop
case "${1:-status}" in
    "watch")
        echo "🔍 Watching seeding progress... (Press Ctrl+C to stop)"
        while true; do
            clear
            echo "🔄 CookCam USDA Seeding Monitor - $(date)"
            echo "================================"
            check_process
            show_status
            show_logs
            echo ""
            echo "⏱️  Refreshing in 30 seconds..."
            sleep 30
        done
        ;;
    "status")
        check_process
        show_status
        show_logs
        ;;
    "start")
        if check_process; then
            echo "Seeding is already running"
        else
            echo "🚀 Starting USDA seeding..."
            npm run seed-usda:resume > seeding.log 2>&1 &
            echo "Started with PID: $!"
        fi
        ;;
    "stop")
        echo "🛑 Stopping seeding process..."
        pkill -f "usda-bulk-seeder"
        echo "Process stopped"
        ;;
    "logs")
        if [ -f "seeding.log" ]; then
            tail -f seeding.log
        else
            echo "No log file found"
        fi
        ;;
    *)
        echo "Usage: $0 {status|watch|start|stop|logs}"
        echo ""
        echo "Commands:"
        echo "  status  - Show current status (default)"
        echo "  watch   - Monitor progress in real-time"
        echo "  start   - Start seeding process"
        echo "  stop    - Stop seeding process"
        echo "  logs    - Follow seeding logs"
        ;;
esac 