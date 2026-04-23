import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

/**
 * Cache for CSS mutation testing, stored as two separate files:
 *
 * 1. `statuses.json` — mutant status + CSS hashes (for incremental skipping)
 *    rm this to force a full re-run
 *
 * 2. `killers.json` — which test case killed each mutant (for smart ordering)
 *    rm this to disable "Killed (fast)" shortcutting
 *
 * Both live in `.css-mutator-cache/`. Users can `rm -rf` either independently.
 */

export interface KillerInfo {
  file: string;
  testName: string;
}

export interface StatusCache {
  statuses: Record<string, string>;
  cssHashes: Record<string, string>;
}

export interface KillerCache {
  killers: Record<string, KillerInfo>;
}

export interface MutationCacheData {
  statuses: Record<string, string>;
  cssHashes: Record<string, string>;
  killers: Record<string, KillerInfo>;
}

export function mutantKey(
  fileName: string,
  property: string,
  original: string,
  replacement: string,
  line: number,
): string {
  return `${fileName}:${line}:${property}:${original}->${replacement}`;
}

export function hashFile(filePath: string): string {
  const content = readFileSync(filePath, "utf-8");
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

/**
 * Hash a CSS file AND all test files that import it.
 * Cache invalidates when ANY file in the chain changes —
 * adding/removing/editing a test triggers re-testing.
 */
export function hashFileChain(cssFile: string, testFiles: string[]): string {
  const h = createHash("sha256");
  h.update(readFileSync(cssFile, "utf-8"));
  for (const tf of testFiles.toSorted()) {
    try {
      h.update(readFileSync(tf, "utf-8"));
    } catch {
      // test file removed → hash changes → cache invalidates
      h.update(`MISSING:${tf}`);
    }
  }
  return h.digest("hex").slice(0, 16);
}

export function loadCache(cacheDir: string): MutationCacheData {
  const statusPath = resolve(cacheDir, "statuses.json");
  const killerPath = resolve(cacheDir, "killers.json");

  let statuses: Record<string, string> = {};
  let cssHashes: Record<string, string> = {};
  let killers: Record<string, KillerInfo> = {};

  if (existsSync(statusPath)) {
    try {
      const raw = JSON.parse(readFileSync(statusPath, "utf-8"));
      statuses = raw.statuses ?? {};
      cssHashes = raw.cssHashes ?? {};
    } catch {
      /* corrupted — start fresh */
    }
  }

  if (existsSync(killerPath)) {
    try {
      const raw = JSON.parse(readFileSync(killerPath, "utf-8"));
      killers = raw.killers ?? {};
    } catch {
      /* corrupted — start fresh */
    }
  }

  // Migrate from old single-file cache
  const legacyPath = resolve(cacheDir, "mutation-cache.json");
  if (existsSync(legacyPath) && !existsSync(statusPath)) {
    try {
      const raw = JSON.parse(readFileSync(legacyPath, "utf-8"));
      statuses = raw.statuses ?? {};
      cssHashes = raw.cssHashes ?? {};
      killers = raw.killers ?? {};
    } catch {
      /* skip */
    }
  }

  return { statuses, cssHashes, killers };
}

export function saveCache(cacheDir: string, cache: MutationCacheData): void {
  mkdirSync(cacheDir, { recursive: true });

  writeFileSync(
    resolve(cacheDir, "statuses.json"),
    JSON.stringify({ statuses: cache.statuses, cssHashes: cache.cssHashes }, null, 2),
  );

  writeFileSync(
    resolve(cacheDir, "killers.json"),
    JSON.stringify({ killers: cache.killers }, null, 2),
  );
}
