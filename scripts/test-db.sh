#!/usr/bin/env bash
# Applies every migration to a throwaway Postgres and runs the RLS tests.
#   DATABASE_URL=postgres://postgres@localhost:5432/postgres npm run test:db
# The database is dropped and recreated: never point this at real data.
set -euo pipefail
: "${DATABASE_URL:?Set DATABASE_URL to a throwaway Postgres database}"
cd "$(dirname "$0")/.."
DB=plotpaper_test
ADMIN_URL="$DATABASE_URL"
psql "$ADMIN_URL" -qX -v ON_ERROR_STOP=1 -c "drop database if exists $DB" -c "create database $DB"
TEST_URL=$(node -e "const u=new URL(process.argv[1]);u.pathname='/$DB';console.log(u.toString())" "$ADMIN_URL")
run() { psql "$TEST_URL" -qX -v ON_ERROR_STOP=1 -f "$1" >/dev/null && echo "✓ $1"; }
run supabase/tests/00_supabase_shim.sql
for f in supabase/migrations/*.sql; do run "$f"; done
# Migrations must be re-runnable.
for f in supabase/migrations/*.sql; do run "$f"; done
psql "$TEST_URL" -qX -v ON_ERROR_STOP=1 -f supabase/tests/rls.test.sql -o /dev/null
