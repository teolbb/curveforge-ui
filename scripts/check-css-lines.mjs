#!/usr/bin/env node
// Stylelint has no built-in max-lines rule, so we enforce one here. Mirrors
// the `max-lines: 200` cap we apply to TypeScript via eslint.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const MAX_LINES = 200;
const ROOT = "src";

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (p.endsWith(".css")) yield p;
  }
}

let bad = 0;
for (const file of walk(ROOT)) {
  const lines = readFileSync(file, "utf8").split("\n").length;
  if (lines > MAX_LINES) {
    console.error(`${file}: ${lines} lines (max ${MAX_LINES})`);
    bad += 1;
  }
}
process.exit(bad === 0 ? 0 : 1);
