#!/usr/bin/env bash
# =============================================================================
# VidyAI — Push migrations + seed to remote Supabase
# =============================================================================
#
# BEFORE RUNNING:
#   1. Supabase Personal Access Token
#      → https://supabase.com/dashboard/account/tokens
#      → Copy the token and set it below OR export it before running:
#           export SUPABASE_ACCESS_TOKEN="sbp_xxxxxxxxxxxxxxxxxxxx"
#
#   2. DB Password (one-time)
#      → Supabase Dashboard → Your Project → Settings → Database
#      → "Database password" section → Reveal/Reset
#      → Set it below OR export it:
#           export SUPABASE_DB_PASSWORD="your-db-password"
#
#   3. Service Role Key (for seed_demo.py step)
#      → Supabase Dashboard → Your Project → Settings → API
#      → Copy "service_role" key → update .env SUPABASE_SERVICE_ROLE_KEY
#
# USAGE:
#   chmod +x supabase/push_remote.sh
#   SUPABASE_ACCESS_TOKEN=sbp_xxx SUPABASE_DB_PASSWORD=your-pass ./supabase/push_remote.sh
#
# =============================================================================

set -euo pipefail

# ── Config ───────────────────────────────────────────────────────────────────
PROJECT_REF="nrfogjkzsisfnxijopxh"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
die()     { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── Preflight ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        VidyAI → Remote Supabase Push                ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

command -v supabase >/dev/null 2>&1 || die "supabase CLI not found. Install: https://supabase.com/docs/guides/cli"

[[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]] && die \
  "SUPABASE_ACCESS_TOKEN not set.\n  Get it from: https://supabase.com/dashboard/account/tokens\n  Then run: export SUPABASE_ACCESS_TOKEN=sbp_xxx"

[[ -z "${SUPABASE_DB_PASSWORD:-}" ]] && die \
  "SUPABASE_DB_PASSWORD not set.\n  Get it from: Supabase Dashboard → Settings → Database\n  Then run: export SUPABASE_DB_PASSWORD=your-password"

info "Project ref : $PROJECT_REF"
info "Working dir : $SCRIPT_DIR"
echo ""

# ── Step 1: Link to remote project ───────────────────────────────────────────
info "Step 1/4 — Linking to remote Supabase project..."
cd "$SCRIPT_DIR/.."

supabase link \
  --project-ref "$PROJECT_REF" \
  --password "$SUPABASE_DB_PASSWORD" 2>&1 | grep -v "^$" || true

success "Linked to project $PROJECT_REF"
echo ""

# ── Step 2: Push all migrations ───────────────────────────────────────────────
info "Step 2/4 — Pushing migrations (20 files)..."
supabase db push --include-all 2>&1

success "All migrations applied"
echo ""

# ── Step 3: Run seed SQL files ────────────────────────────────────────────────
info "Step 3/4 — Running seed files..."

info "  → 01_subjects.sql (exam subjects)"
supabase db execute --file "$SCRIPT_DIR/seed/01_subjects.sql" 2>&1
success "  Subjects seeded"

info "  → 02_jee_syllabus.sql (chapters + concepts)"
supabase db execute --file "$SCRIPT_DIR/seed/02_jee_syllabus.sql" 2>&1
success "  JEE syllabus seeded"

info "  → 03_demo_data.sql (demo user + all activity data)"
supabase db execute --file "$SCRIPT_DIR/seed/03_demo_data.sql" 2>&1
success "  Demo data seeded"

info "  → seed.sql (storage buckets)"
supabase db execute --file "$SCRIPT_DIR/seed.sql" 2>&1
success "  Storage buckets created"

echo ""

# ── Step 4: Create demo user password + update env ───────────────────────────
info "Step 4/4 — Creating demo user via Supabase Admin API..."

# Load service role key from .env
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-$(grep '^SUPABASE_SERVICE_ROLE_KEY=' "$SCRIPT_DIR/../.env" | cut -d'=' -f2-)}"

if [[ "$SERVICE_KEY" == *"supabase-demo"* ]] || [[ -z "$SERVICE_KEY" ]]; then
  warn "SUPABASE_SERVICE_ROLE_KEY in .env is still the placeholder local key."
  warn "The demo user was created by the SQL seed (auth.users insert) but cannot sign in"
  warn "until you set the real service_role key in .env."
  warn ""
  warn "Get real key: Supabase Dashboard → Settings → API → service_role"
  warn "Update .env:  SUPABASE_SERVICE_ROLE_KEY=eyJhbG..."
else
  python3 "$SCRIPT_DIR/seed_demo.py" \
    --url "$SUPABASE_URL" \
    --service-key "$SERVICE_KEY" \
    2>&1 && success "Demo user password set via Admin API" \
         || warn "seed_demo.py failed — demo user may already exist from SQL seed"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ALL DONE!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo "  Remote project : https://$PROJECT_REF.supabase.co"
echo "  Supabase Studio: https://supabase.com/dashboard/project/$PROJECT_REF"
echo ""
echo "  Demo account:"
echo "    Email    : demo@vidyai.in"
echo "    Password : demo1234"
echo ""
