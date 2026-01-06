#!/bin/bash
echo "🚀 Starting BigSIS Web Platform..."

# Function to kill all background jobs on exit
trap 'kill $(jobs -p)' EXIT

# 1. Start Backend
echo "   ... Launching Backend (FastAPI)"
cd bigsis-backend
source venv/bin/activate
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Wait for backend to be somewhat ready
sleep 3

# 2. Start Frontend
echo "   ... Launching Frontend (Vite)"
cd bigsis-web
npm run dev -- --open &
FRONTEND_PID=$!
cd ..

echo "✅ All systems go!"
echo "   Backend: http://localhost:8000"
echo "   Frontend: http://localhost:5173"
echo "   Press Ctrl+C to stop."

wait
