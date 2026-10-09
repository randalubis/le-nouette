#!/bin/sh
# Create + seed the LOCAL dev database (only le_nouette_dev). Idempotent. Never touches other DBs.
# Pass --reset to truncate app tables and reseed (npm run dev:db:reset).
set -e
cd "$(dirname "$0")/.."
DB=le_nouette_dev
psql -d postgres -tAc "select 1 from pg_database where datname='$DB'" | grep -q 1 || createdb "$DB"
psql -v ON_ERROR_STOP=1 -q -d "$DB" -c "create extension if not exists pgcrypto"
if [ "$(psql -d "$DB" -tAc "select to_regclass('public.orders') is not null")" != "t" ]; then
  for f in drizzle/0*.sql; do psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$f"; done
fi
DATABASE_URL="postgres://localhost:5432/$DB" npx tsx --conditions=react-server drizzle/dev-seed.ts "$@"
echo "dev database ready: $DB"
