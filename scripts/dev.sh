#!/bin/bash

# CookCam Development Helper Script
# This script helps manage the development environment

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

function show_help {
    echo "CookCam Development Helper"
    echo ""
    echo "Usage: ./scripts/dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start-backend    Start the backend API server"
    echo "  start-mobile     Start the React Native development server"
    echo "  start-all        Start both backend and mobile"
    echo "  stop-all         Stop all development servers"
    echo "  setup            Initial project setup"
    echo "  reset            Kill all processes and restart"
    echo "  status           Check status of services"
    echo "  logs-backend     Show backend logs"
    echo "  logs-mobile      Show mobile logs"
    echo ""
}

function check_dependencies {
    echo -e "${YELLOW}Checking dependencies...${NC}"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Node.js is not installed${NC}"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}npm is not installed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}All dependencies found${NC}"
}

function kill_port {
    local port=$1
    local pid=$(lsof -ti:$port)
    
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}Killing process on port $port (PID: $pid)${NC}"
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

function start_backend {
    echo -e "${GREEN}Starting backend API...${NC}"
    
    # Kill existing backend process
    kill_port 3000
    
    # Navigate to backend directory
    cd "$PROJECT_ROOT/backend/api"
    
    # Check if .env exists
    if [ ! -f .env ]; then
        echo -e "${YELLOW}Creating .env from .env.example...${NC}"
        cp .env.example .env
        echo -e "${RED}Please update .env with your configuration${NC}"
    fi
    
    # Install dependencies if needed
    if [ ! -d node_modules ]; then
        echo -e "${YELLOW}Installing backend dependencies...${NC}"
        npm install
    fi
    
    # Start backend
    npm run dev &
    BACKEND_PID=$!
    echo -e "${GREEN}Backend started (PID: $BACKEND_PID)${NC}"
}

function start_mobile {
    echo -e "${GREEN}Starting React Native...${NC}"
    
    # Kill existing Metro bundler
    kill_port 8081
    
    # Navigate to mobile directory
    cd "$PROJECT_ROOT/mobile/CookCam"
    
    # Install dependencies if needed
    if [ ! -d node_modules ]; then
        echo -e "${YELLOW}Installing mobile dependencies...${NC}"
        npm install
        
        # iOS specific
        if [[ "$OSTYPE" == "darwin"* ]]; then
            echo -e "${YELLOW}Installing iOS pods...${NC}"
            cd ios && pod install && cd ..
        fi
    fi
    
    # Start Metro bundler
    npx react-native start --reset-cache &
    MOBILE_PID=$!
    echo -e "${GREEN}React Native started (PID: $MOBILE_PID)${NC}"
}

function start_all {
    check_dependencies
    start_backend
    sleep 3
    start_mobile
    
    echo ""
    echo -e "${GREEN}All services started!${NC}"
    echo ""
    echo "Backend API: http://localhost:3000"
    echo "React Native: http://localhost:8081"
    echo ""
    echo "Press Ctrl+C to stop all services"
    
    # Keep script running
    wait
}

function stop_all {
    echo -e "${YELLOW}Stopping all services...${NC}"
    
    # Kill backend
    kill_port 3000
    pkill -f "nodemon.*index.ts"
    pkill -f "ts-node.*index.ts"
    
    # Kill React Native
    kill_port 8081
    pkill -f "react-native start"
    pkill -f "node.*metro"
    
    echo -e "${GREEN}All services stopped${NC}"
}

function setup_project {
    echo -e "${GREEN}Setting up CookCam project...${NC}"
    
    check_dependencies
    
    # Backend setup
    echo -e "${YELLOW}Setting up backend...${NC}"
    cd "$PROJECT_ROOT/backend/api"
    npm install
    cp .env.example .env
    
    # Mobile setup
    echo -e "${YELLOW}Setting up mobile app...${NC}"
    cd "$PROJECT_ROOT/mobile/CookCam"
    npm install
    
    # iOS specific
    if [[ "$OSTYPE" == "darwin"* ]]; then
        cd ios && pod install && cd ..
    fi
    
    echo -e "${GREEN}Setup complete!${NC}"
    echo -e "${YELLOW}Don't forget to update .env files with your configuration${NC}"
}

function check_status {
    echo -e "${YELLOW}Checking service status...${NC}"
    
    # Check backend
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${GREEN}✓ Backend API is running on port 3000${NC}"
    else
        echo -e "${RED}✗ Backend API is not running${NC}"
    fi
    
    # Check React Native
    if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${GREEN}✓ React Native is running on port 8081${NC}"
    else
        echo -e "${RED}✗ React Native is not running${NC}"
    fi
}

function reset_all {
    echo -e "${YELLOW}Resetting development environment...${NC}"
    stop_all
    sleep 2
    start_all
}

# Main script logic
case "$1" in
    start-backend)
        check_dependencies
        start_backend
        wait
        ;;
    start-mobile)
        check_dependencies
        start_mobile
        wait
        ;;
    start-all)
        start_all
        ;;
    stop-all)
        stop_all
        ;;
    setup)
        setup_project
        ;;
    status)
        check_status
        ;;
    reset)
        reset_all
        ;;
    *)
        show_help
        ;;
esac 