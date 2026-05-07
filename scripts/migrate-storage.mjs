#!/usr/bin/env node
// One-off Supabase Storage migrator: copies every object in a bucket from
// an OLD project to a NEW one. Idempotent (upsert: true), safe to rerun.
// Run via the command in docs/REGION_MIGRATION.md (Phase 6).
// Delete this file after the migration is done.

import { createClient } from "@supabase/supabase-js";

const {
  OLD_SUPABASE_URL,
  OLD_SUPABASE_SECRET_KEY,
  NEW_SUPABASE_URL,
  NEW_SUPABASE_SECRET_KEY,
  SUPABASE_STORAGE_BUCKET,
} = process.env;

const BUCKET = SUPABASE_STORAGE_BUCKET ?? "le-nouette";

const missing = [
  ["OLD_SUPABASE_URL", OLD_SUPABASE_URL],
  ["OLD_SUPABASE_SECRET_KEY", OLD_SUPABASE_SECRET_KEY],
  ["NEW_SUPABASE_URL", NEW_SUPABASE_URL],
  ["NEW_SUPABASE_SECRET_KEY", NEW_SUPABASE_SECRET_KEY],
].filter(([, v]) => !v).map(([k]) => k);
if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(", ")}`);
  console.error("See docs/REGION_MIGRATION.md Phase 6 for usage.");
  process.exit(1);
}

const oldClient = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const newClient = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function listAll(prefix = "") {
  const PAGE = 100;
  const out = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await oldClient.storage
      .from(BUCKET)
      .list(prefix, { limit: PAGE, offset });
    if (error) throw new Error(`List failed at "${prefix}": ${error.message}`);
    if (!data || data.length === 0) break;
    for (const item of data) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      // Supabase marks folders with id === null and metadata === null.
      if (item.id === null) {
        out.push(...(await listAll(fullPath)));
      } else {
        out.push(fullPath);
      }
    }
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return out;
}

const paths = await listAll();
console.log(`Found ${paths.length} objects in bucket "${BUCKET}".`);
if (paths.length === 0) {
  console.log("Nothing to copy.");
  process.exit(0);
}

let copied = 0;
let failed = 0;
for (const p of paths) {
  const { data: blob, error: dlErr } = await oldClient.storage
    .from(BUCKET)
    .download(p);
  if (dlErr || !blob) {
    console.error(`download failed: ${p}: ${dlErr?.message ?? "no body"}`);
    failed++;
    continue;
  }
  const { error: upErr } = await newClient.storage.from(BUCKET).upload(p, blob, {
    upsert: true,
    contentType: blob.type || undefined,
    cacheControl: "3600",
  });
  if (upErr) {
    console.error(`upload failed: ${p}: ${upErr.message}`);
    failed++;
    continue;
  }
  copied++;
  if (copied % 10 === 0) console.log(`  ${copied}/${paths.length}…`);
}

console.log(`Done. Copied ${copied}/${paths.length}.`);
if (failed > 0) {
  console.error(`${failed} object(s) failed. Rerun the same command to retry — uploads use upsert.`);
  process.exit(1);
}
