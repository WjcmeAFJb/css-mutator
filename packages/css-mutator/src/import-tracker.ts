import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { glob } from "glob";

/**
 * Regex to match: import ... from "specifier"
 * Skips `import type` (type-only imports have no runtime effect).
 * Uses non-greedy match for the import clause to handle multiline imports.
 */
const FROM_RE = /import\s+(?!type\s)[\s\S]*?from\s+['"]([^'"]+)['"]/g;

/**
 * Regex to match side-effect imports: import "specifier"
 * These are common for CSS: import "./styles.css"
 */
const SIDE_EFFECT_RE = /^\s*import\s+['"]([^'"]+)['"];?\s*$/gm;

const RESOLVE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".css"];

/**
 * Extract import specifiers from a TypeScript/JavaScript/TSX/JSX source string.
 *
 * Handles:
 *   import Foo from "./Foo"
 *   import { Foo } from "./Foo"
 *   import * as Foo from "./Foo"
 *   import "./styles.css"
 *   import { Foo, Bar } from "./Foo"   (multiline)
 *
 * Skips:
 *   import type { Foo } from "./Foo"   (type-only, no runtime effect)
 */
export function extractImports(source: string): string[] {
  const specifiers: string[] = [];
  const seen = new Set<string>();

  for (const match of source.matchAll(FROM_RE)) {
    const specifier = match[1]!;
    if (!seen.has(specifier)) {
      seen.add(specifier);
      specifiers.push(specifier);
    }
  }

  for (const match of source.matchAll(SIDE_EFFECT_RE)) {
    const specifier = match[1]!;
    if (!seen.has(specifier)) {
      seen.add(specifier);
      specifiers.push(specifier);
    }
  }

  return specifiers;
}

/**
 * Resolve a relative import specifier to an absolute file path.
 *
 * Tries extensions: .ts, .tsx, .js, .jsx, .css
 * Also tries index files for directory imports.
 * Returns null for bare specifiers (node_modules imports like "react").
 */
export function resolveImport(specifier: string, fromDir: string): string | null {
  // Bare specifiers — skip node_modules
  if (!specifier.startsWith(".") && !specifier.startsWith("/")) {
    return null;
  }

  const absolute = resolve(fromDir, specifier);

  // Already has extension and exists
  if (existsSync(absolute) && !isDirectory(absolute)) {
    return absolute;
  }

  // Try adding extensions
  for (const ext of RESOLVE_EXTENSIONS) {
    const withExt = absolute + ext;
    if (existsSync(withExt)) {
      return withExt;
    }
  }

  // Try index files (directory imports)
  for (const ext of RESOLVE_EXTENSIONS) {
    const indexPath = resolve(absolute, `index${ext}`);
    if (existsSync(indexPath)) {
      return indexPath;
    }
  }

  return null;
}

/**
 * Recursively collect all CSS files in the transitive import graph of a file.
 *
 * @param filePath - Absolute path to start from
 * @param cache - Parsed import cache (avoids re-reading files)
 * @param visited - Cycle protection set
 * @returns Set of absolute CSS file paths found in the import tree
 */
export function collectCssDependencies(
  filePath: string,
  cache: Map<string, string[]>,
  visited: Set<string>,
): Set<string> {
  const cssFiles = new Set<string>();

  if (visited.has(filePath)) return cssFiles;
  visited.add(filePath);

  // CSS files are leaf dependencies — add them and stop
  if (filePath.endsWith(".css")) {
    cssFiles.add(filePath);
    return cssFiles;
  }

  // Get imports from cache or read file
  let imports = cache.get(filePath);
  if (imports === undefined) {
    try {
      const source = readFileSync(filePath, "utf-8");
      imports = extractImports(source);
      cache.set(filePath, imports);
    } catch {
      return cssFiles;
    }
  }

  // Resolve and recurse
  const fromDir = dirname(filePath);
  for (const specifier of imports) {
    const resolved = resolveImport(specifier, fromDir);
    if (resolved === null) continue;

    const childCss = collectCssDependencies(resolved, cache, visited);
    for (const css of childCss) {
      cssFiles.add(css);
    }
  }

  return cssFiles;
}

/**
 * Build a map from CSS file paths to the test files that transitively import them.
 *
 * Scans all test files matching the given patterns, walks their import trees,
 * and inverts the relationship: cssFile → [testFile1, testFile2, ...].
 *
 * @param testPatterns - Glob patterns for test files
 * @param cwd - Working directory
 * @returns Map from absolute CSS path to absolute test file paths
 */
export async function buildImportMap(
  testPatterns: string[],
  cwd: string,
): Promise<Map<string, string[]>> {
  // Find all test files
  const testFiles: string[] = [];
  for (const pattern of testPatterns) {
    const matches = await glob(pattern, {
      cwd,
      absolute: true,
      ignore: ["**/node_modules/**"],
    });
    testFiles.push(...matches);
  }

  const uniqueTestFiles = [...new Set(testFiles)];
  const cache = new Map<string, string[]>();
  const cssToTests = new Map<string, string[]>();

  for (const testFile of uniqueTestFiles) {
    const cssDeps = collectCssDependencies(testFile, cache, new Set<string>());

    for (const cssFile of cssDeps) {
      const existing = cssToTests.get(cssFile);
      if (existing) {
        existing.push(testFile);
      } else {
        cssToTests.set(cssFile, [testFile]);
      }
    }
  }

  return cssToTests;
}

function isDirectory(filePath: string): boolean {
  try {
    return statSync(filePath).isDirectory();
  } catch {
    return false;
  }
}
