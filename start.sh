#!/bin/bash
set -e

echo "════════════════════════════════════════════════"
echo "  Call of Cthulhu — Remote Play Server"
echo "  Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn"
echo "════════════════════════════════════════════════"
echo ""

# ── Backend ──────────────────────────────────────
echo "[1/3] Installing Python dependencies..."
cd "$(dirname "$0")/backend"
pip install -r requirements.txt --quiet --break-system-packages 2>/dev/null || \
pip install -r requirements.txt --quiet

echo "[2/3] Starting backend on :8000..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# ── Frontend ─────────────────────────────────────
echo "[3/3] Starting frontend on :3000..."
cd frontend
npm install --silent 2>/dev/null
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "════════════════════════════════════════════════"
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:3000"
echo "  API docs: http://localhost:8000/docs"
echo "════════════════════════════════════════════════"
echo ""
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
