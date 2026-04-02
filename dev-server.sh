#!/bin/bash

# Dailybildi Development Server Startup Script

set -e

echo "🚀 Starting Dailybildi Development Servers..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend directory exists
if [ ! -d "backend" ]; then
    echo -e "${RED}Error: backend directory not found${NC}"
    exit 1
fi

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    echo -e "${RED}Error: frontend directory not found${NC}"
    exit 1
fi

# Kill background processes on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down servers...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start Python backend
echo -e "${YELLOW}Starting Python backend...${NC}"
cd backend

# Check if venv exists and activate it
if [ -d "venv" ]; then
    source venv/bin/activate
    echo "Virtual environment activated"
fi

# Install dependencies if needed
if ! python -c "import fastapi" 2>/dev/null; then
    echo "Installing Python dependencies..."
    pip install -e . > /dev/null
fi

python -m uvicorn app.main:app --reload &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
echo -e "${GREEN}  API: http://localhost:8000${NC}"
echo -e "${GREEN}  Docs: http://localhost:8000/docs${NC}"

cd ..

# Wait a moment for backend to start
sleep 2

# Start Vue.js frontend
echo -e "${YELLOW}Starting Vue.js frontend...${NC}"
cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing Node dependencies..."
    npm install
fi

npm run serve &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
echo -e "${GREEN}  Frontend: http://localhost:3000${NC}"

cd ..

echo ""
echo -e "${GREEN}🎉 Both servers running!${NC}"
echo -e "${YELLOW}Backend: http://localhost:8000${NC}"
echo -e "${YELLOW}Frontend: http://localhost:3000${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
