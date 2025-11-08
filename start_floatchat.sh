#!/bin/bash

# FloatChat Startup Script
# Starts both backend and frontend services

echo "======================================"
echo "  FloatChat - Starting Services"
echo "======================================"
echo ""

# Check if .env files exist
if [ ! -f "backend/.env" ]; then
    echo "❌ backend/.env not found!"
    echo "Please create backend/.env with required variables"
    exit 1
fi

if [ ! -f "frontend/.env.local" ]; then
    echo "❌ frontend/.env.local not found!"
    echo "Please create frontend/.env.local with required variables"
    exit 1
fi

# Check if Python dependencies are installed
echo "Checking Python dependencies..."
if ! python -c "import fastapi" 2>/dev/null; then
    echo "⚠️  Python dependencies not installed"
    echo "Installing dependencies..."
    cd backend
    pip install -r requirements.txt
    cd ..
fi

# Check if Node dependencies are installed
echo "Checking Node dependencies..."
if [ ! -d "frontend/node_modules" ]; then
    echo "⚠️  Node dependencies not installed"
    echo "Installing dependencies..."
    cd frontend
    npm install
    cd ..
fi

echo ""
echo "✅ All dependencies installed"
echo ""

# Start backend in background
echo "🚀 Starting Backend API Server (port 8000)..."
cd backend
python api_server.py > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Check if backend is running
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ Backend is running (PID: $BACKEND_PID)"
else
    echo "❌ Backend failed to start. Check backend.log for errors"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo ""

# Start frontend
echo "🚀 Starting Frontend (port 3000)..."
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo "⏳ Waiting for frontend to start..."
sleep 5

echo ""
echo "======================================"
echo "  FloatChat is Running!"
echo "======================================"
echo ""
echo "📊 Backend API:  http://localhost:8000"
echo "🌐 Frontend:     http://localhost:3000"
echo "📖 API Docs:     http://localhost:8000/docs"
echo ""
echo "Backend PID:  $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Logs:"
echo "  Backend:  tail -f backend.log"
echo "  Frontend: tail -f frontend.log"
echo ""
echo "To stop services:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Save PIDs to file for easy cleanup
echo "$BACKEND_PID" > .floatchat.pid
echo "$FRONTEND_PID" >> .floatchat.pid

# Wait for user interrupt
trap "echo ''; echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; rm .floatchat.pid; echo 'Services stopped'; exit 0" INT

# Keep script running
wait
