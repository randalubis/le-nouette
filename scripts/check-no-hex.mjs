#!/usr/bin/env node
// Fails CI if a Tailwind arbitrary-value class with a literal hex color
// (e.g. bg-[#f3ede1], text-[#1f1610]) appears anywhere under src/ except
// in the design-token source of truth (src/app/globals.css).
//
// All inline hex values were lifted into named tokens by ticket X-10. The
// rule below keeps the design system from drifting back. If you genuinely
// need a one-off color, add a token in globals.css and reference it.
//
// Run: `npm run check:hex`. Wire into CI before tests.

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const ALLOWLIST = new Set(["src/app/globals.css"]);
// Matches `[#abc]`, `[#abcdef]`, with optional opacity modifier `/40`.
const HEX_PATTERN = /\[#[0-9a-fA-F]{3,8}(?:\/[0-9.]+)?\]/;

const tracked = execSync("git ls-files src", { encoding: "utf8" })
  .split("\n")
  .filter((p) => /\.(tsx?|jsx?|css)$/.test(p))
  .filter((p) => !ALLOWLIST.has(p));

const violations = [];
for (const path of tracked) {
  let body;
  try {
    body = readFileSync(path, "utf8");
  } catch {
    continue;
  }
  body.split("\n").forEach((line, i) => {
    if (HEX_PATTERN.test(line)) {
      violations.push({ path, line: i + 1, snippet: line.trim().slice(0, 140) });
    }
  });
}

if (violations.length === 0) {
  console.log("check:hex passed — no inline hex outside globals.css.");
  process.exit(0);
}

console.error(
  `check:hex failed — ${violations.length} inline hex usage${
    violations.length === 1 ? "" : "s"
  } found outside globals.css.\nLift the value into a named token in src/app/globals.css and reference it as bg-[var(--token)].\n`,
);
for (const v of violations) {
  console.error(`  ${v.path}:${v.line}  ${v.snippet}`);
}
process.exit(1);
