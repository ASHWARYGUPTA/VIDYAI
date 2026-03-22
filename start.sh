#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

# ── Colors ──────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

log()  { echo -e "${CYAN}[start]${NC} $*"; }
ok()   { echo -e "${GREEN}[  ok ]${NC} $*"; }
warn() { echo -e "${YELLOW}[ warn]${NC} $*"; }
err()  { echo -e "${RED}[error]${NC} $*"; }

# ── Kill any leftover processes ──────────────────────────────────────
log "Stopping any running services..."
pkill -f "uvicorn services.api" 2>/dev/null || true
pkill -f "next dev"             2>/dev/null || true
sleep 1

# ── Verify .env files exist ──────────────────────────────────────────
if [ ! -f "$ROOT/.env" ]; then
  err ".env not found at $ROOT/.env"
  exit 1
fi
if [ ! -f "$ROOT/apps/web/.env.local" ]; then
  warn "apps/web/.env.local not found — frontend may not connect to Supabase"
fi

# ── Log directory ────────────────────────────────────────────────────
mkdir -p "$ROOT/logs"

# ── Start Backend (FastAPI) ──────────────────────────────────────────
log "Starting backend on :8000 ..."
(
  cd "$ROOT"
  source .env 2>/dev/null || true
  services/api/venv/bin/uvicorn services.api.main:app \
    --host 0.0.0.0 --port 8000 --reload \
    >> "$ROOT/logs/backend.log" 2>&1
) &
BACKEND_PID=$!

# ── Start Frontend (Next.js) ─────────────────────────────────────────
log "Starting frontend on :3000 ..."
(
  cd "$ROOT/apps/web"
  node_modules/.bin/next dev --port 3000 \
    >> "$ROOT/logs/frontend.log" 2>&1
) &
FRONTEND_PID=$!

# ── Wait for services to be ready ───────────────────────────────────
log "Waiting for services to come up..."

for i in $(seq 1 30); do
  sleep 1
  BACKEND_UP=false
  FRONTEND_UP=false
  curl -sf http://localhost:8000/health > /dev/null 2>&1  && BACKEND_UP=true
  curl -sf http://localhost:3000        > /dev/null 2>&1  && FRONTEND_UP=true

  if $BACKEND_UP && $FRONTEND_UP; then
    break
  fi
done

echo ""
if $BACKEND_UP;  then ok "Backend  → http://localhost:8000"; else err "Backend  failed to start (check logs/backend.log)";  fi
if $FRONTEND_UP; then ok "Frontend → http://localhost:3000"; else err "Frontend failed to start (check logs/frontend.log)"; fi
echo ""

# ── Tail logs ────────────────────────────────────────────────────────
log "Tailing logs (Ctrl+C to stop all services)..."

cleanup() {
  echo ""
  log "Shutting down..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  pkill -f "uvicorn services.api" 2>/dev/null || true
  pkill -f "next dev"             2>/dev/null || true
  ok "All services stopped."
  exit 0
}
trap cleanup SIGINT SIGTERM

tail -f "$ROOT/logs/backend.log" "$ROOT/logs/frontend.log"
