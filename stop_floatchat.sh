#!/bin/bash

# FloatChat Stop Script
# Stops both backend and frontend services

echo "======================================"
echo "  FloatChat - Stopping Services"
echo "======================================"
echo ""

if [ -f ".floatchat.pid" ]; then
    echo "Reading PIDs from .floatchat.pid..."
    BACKEND_PID=$(sed -n '1p' .floatchat.pid)
    FRONTEND_PID=$(sed -n '2p' .floatchat.pid)
    
    if [ ! -z "$BACKEND_PID" ]; then
        echo "Stopping Backend (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null && echo "✅ Backend stopped" || echo "⚠️  Backend not running"
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        echo "Stopping Frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null && echo "✅ Frontend stopped" || echo "⚠️  Frontend not running"
    fi
    
    rm .floatchat.pid
    echo ""
    echo "✅ All services stopped"
else
    echo "⚠️  No PID file found. Trying to stop by port..."
    
    # Try to kill processes on ports 8000 and 3000
    BACKEND_PID=$(lsof -ti:8000)
    FRONTEND_PID=$(lsof -ti:3000)
    
    if [ ! -z "$BACKEND_PID" ]; then
        echo "Stopping Backend on port 8000 (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null && echo "✅ Backend stopped"
    else
        echo "⚠️  No process found on port 8000"
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        echo "Stopping Frontend on port 3000 (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null && echo "✅ Frontend stopped"
    else
        echo "⚠️  No process found on port 3000"
    fi
fi

echo ""
echo "======================================"
echo "  Services Stopped"
echo "======================================"
