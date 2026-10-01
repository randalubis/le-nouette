#!/bin/sh
# Create the LOCAL e2e database (only le_nouette_e2e), extension, migrations. Idempotent. Never touches other DBs.
set -e
cd "$(dirname "$0")/.."
DB=le_nouette_e2e
psql -d postgres -tAc "select 1 from pg_database where datname='$DB'" | grep -q 1 || createdb "$DB"
psql -v ON_ERROR_STOP=1 -q -d "$DB" -c "create extension if not exists pgcrypto"
if [ "$(psql -d "$DB" -tAc "select to_regclass('public.orders') is not null")" != "t" ]; then
  for f in drizzle/0*.sql; do psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$f"; done
fi
npx tsx e2e/reset.ts
echo "e2e database ready: $DB"
