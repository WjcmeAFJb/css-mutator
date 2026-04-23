import { relative } from "node:path";
import { readFileSync } from "node:fs";
import type {
  CssCoverageReport,
  CssRuleCoverage,
  TestCaseCoverage,
  TestFileCoverage,
} from "./types.ts";

// ─── Types for CDP interaction ───────────────────────────────

interface CDPSession {
  send(method: string, params?: Record<string, unknown>): Promise<unknown>;
  detach(): Promise<void>;
}

interface CDPRuleUsage {
  styleSheetId: string;
  startOffset: number;
  endOffset: number;
  used: boolean;
}

interface PlaywrightPage {
  context(): { newCDPSession(page: PlaywrightPage): Promise<CDPSession> };
}

interface VitestProvider {
  pages?: Map<string, PlaywrightPage>;
}

interface VitestForCoverage {
  globTestSpecifications(): Promise<Array<{ moduleId: string }>>;
  rerunTestSpecifications(
    specs: Array<{ moduleId: string }>,
    all?: boolean,
  ): Promise<{
    testModules: Array<{
      moduleId: string;
      state(): string;
      task: { tasks?: Array<{ name: string; result?: { state: string } }> };
    }>;
  }>;
  projects: Array<{ browser?: { provider: VitestProvider } }>;
  close(): Promise<void>;
}

type CreateVitestFn = (
  cwd: string,
  configFile: string | undefined,
  bail: number,
  testNamePattern?: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => Promise<any>;

// ─── Main ────────────────────────────────────────────────────

/**
 * Collect per-test-file CSS coverage using Playwright CDP.
 *
 * For each test file, creates a fresh vitest instance, attaches
 * CDP CSS.startRuleUsageTracking to all browser pages, runs the
 * test, and maps used/unused CSS rules back to source files.
 */
export async function collectCssCoverage(
  testFiles: string[],
  cssFiles: string[],
  cwd: string,
  createInstance: CreateVitestFn,
  configFile: string | undefined,
  log: (msg: string) => void,
): Promise<CssCoverageReport> {
  // Parse source CSS files to build a class-name → file+line map
  const classMap = buildClassMap(cssFiles);

  log("  Collecting CSS coverage...\n");

  const perTestFile: TestFileCoverage[] = [];

  for (const testFile of testFiles) {
    const testRel = relative(cwd, testFile);

    // First pass: discover test names with a quick run
    const discoverVitest = (await createInstance(cwd, configFile, 0)) as VitestForCoverage;
    const testNames: string[] = [];
    try {
      const specs = await discoverVitest.globTestSpecifications();
      const testSpecs = specs.filter((s) => s.moduleId === testFile);
      if (testSpecs.length === 0) continue;
      const result = await discoverVitest.rerunTestSpecifications(testSpecs, true);
      for (const mod of result.testModules) {
        const tasks = mod.task?.tasks;
        if (tasks) {
          for (const t of tasks) {
            if (t.result?.state === "pass" || t.result?.state === "fail") {
              testNames.push(t.name);
            }
          }
        }
      }
    } finally {
      await Promise.race([discoverVitest.close(), new Promise<void>((r) => setTimeout(r, 5000))]);
    }

    if (testNames.length === 0) continue;

    // Second pass: run each test case in a FRESH vitest instance with CDP tracking.
    // Fresh instance = clean browser, no stale DOM from previous tests.
    // testNamePattern is set at vitest creation time so only the target test runs.
    const perTestCase: TestCaseCoverage[] = [];
    for (const testName of testNames) {
      const pattern = `^${escapeRegex(testName)}$`;
      const vitest = (await createInstance(cwd, configFile, 0, pattern)) as VitestForCoverage;
      try {
        const provider = vitest.projects[0]?.browser?.provider;
        if (!provider?.pages) continue;

        // Start CDP tracking
        const sessions = await startCdpTracking(provider);

        // Run the filtered test
        const specs = await vitest.globTestSpecifications();
        const testSpecs = specs.filter((s) => s.moduleId === testFile);
        if (testSpecs.length > 0) {
          await vitest.rerunTestSpecifications(testSpecs, true);
        }

        // Collect coverage
        const cdpRules = await stopCdpTracking(sessions);
        const rules = mapToSource(cdpRules, classMap);
        perTestCase.push({ testName, rules });
      } finally {
        await Promise.race([vitest.close(), new Promise<void>((r) => setTimeout(r, 5000))]);
      }
    }

    // File-level aggregate = union of per-test-case rules
    const fileRules = mergeTestCaseRules(perTestCase, classMap);

    const used = fileRules.filter((r) => r.used).length;
    const testCaseDetail = perTestCase
      .map((tc) => {
        const u = tc.rules.filter((r) => r.used).length;
        return `${tc.testName} ${u}/${tc.rules.length}`;
      })
      .join(", ");
    log(`    ${testRel}: ${used}/${fileRules.length} [${testCaseDetail}]\n`);

    perTestFile.push({ testFile: testRel, testNames, rules: fileRules, perTestCase });
  }

  // Build aggregate coverage (union of all test files + uncovered source rules)
  const aggregate = buildAggregate(perTestFile, classMap);

  return { perTestFile, aggregate };
}

// ─── CDP helpers ─────────────────────────────────────────────

interface CdpRule {
  selector: string;
  used: boolean;
}

async function startCdpTracking(
  provider: VitestProvider,
): Promise<CDPSession[]> {
  const sessions: CDPSession[] = [];
  if (!provider.pages) return sessions;
  for (const [, page] of provider.pages) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    await cdp.send("CSS.startRuleUsageTracking");
    sessions.push(cdp);
  }
  return sessions;
}

async function stopCdpTracking(sessions: CDPSession[]): Promise<CdpRule[]> {
  const allRules: CdpRule[] = [];
  for (const cdp of sessions) {
    const resp = (await cdp.send("CSS.stopRuleUsageTracking")) as {
      ruleUsage: CDPRuleUsage[];
    };
    for (const rule of resp.ruleUsage) {
      try {
        const textResp = (await cdp.send("CSS.getStyleSheetText", {
          styleSheetId: rule.styleSheetId,
        })) as { text: string };
        const snippet = textResp.text.slice(rule.startOffset, rule.endOffset);
        const bracePos = snippet.indexOf("{");
        const selector = bracePos > 0 ? snippet.slice(0, bracePos).trim() : "";
        if (selector.startsWith("._") || selector.includes("._")) {
          allRules.push({ selector, used: rule.used });
        }
      } catch {
        /* skip */
      }
    }
    await cdp.detach();
  }
  return allRules;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Merge per-test-case rules into a file-level aggregate. */
function mergeTestCaseRules(
  testCases: TestCaseCoverage[],
  classMap: Map<string, ClassInfo[]>,
): CssRuleCoverage[] {
  const ruleMap = new Map<string, CssRuleCoverage>();
  for (const tc of testCases) {
    for (const rule of tc.rules) {
      const key = `${rule.cssFile}:${rule.line}:${rule.selector}`;
      const existing = ruleMap.get(key);
      if (!existing) {
        ruleMap.set(key, { ...rule });
      } else if (rule.used) {
        existing.used = true;
      }
    }
  }
  // Add unseen source selectors from tracked files
  const trackedFiles = new Set([...ruleMap.values()].map((r) => r.cssFile));
  for (const [, entries] of classMap) {
    for (const entry of entries) {
      if (!trackedFiles.has(entry.cssFile)) continue;
      const key = `${entry.cssFile}:${entry.line}:${entry.selector}`;
      if (!ruleMap.has(key)) {
        ruleMap.set(key, { cssFile: entry.cssFile, selector: entry.selector, line: entry.line, used: false });
      }
    }
  }
  return [...ruleMap.values()].sort((a, b) =>
    a.cssFile === b.cssFile ? a.line - b.line : a.cssFile.localeCompare(b.cssFile),
  );
}

// ─── Source mapping ──────────────────────────────────────────

interface ClassInfo {
  cssFile: string;
  selector: string;
  line: number;
}

/**
 * Parse CSS source files and build a map of class names to their
 * file locations. Used to map Vite's generated class names back.
 */
function buildClassMap(cssFiles: string[]): Map<string, ClassInfo[]> {
  const map = new Map<string, ClassInfo[]>();

  for (const file of cssFiles) {
    let source: string;
    try {
      source = readFileSync(file, "utf-8");
    } catch {
      continue;
    }

    const lines = source.split("\n");
    // Match CSS selectors at the start of rules: .className, .className:hover, etc.
    const selectorRegex = /^(\.[a-zA-Z][a-zA-Z0-9_-]*(?::[\w-]+(?:\([^)]*\))?)?)\s*\{/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();
      const match = selectorRegex.exec(line);
      if (match) {
        const selector = match[1]!;
        // Extract class name without pseudo-class for lookup
        const colonPos = selector.indexOf(":");
        const className = colonPos > 0 ? selector.slice(1, colonPos) : selector.slice(1);

        const entries = map.get(className) ?? [];
        entries.push({ cssFile: file, selector, line: i + 1 });
        map.set(className, entries);
      }
    }
  }

  return map;
}

/**
 * Map CDP-generated selectors (._button_16ll4_1) back to source.
 *
 * Vite CSS Module naming: ._<className>_<hash>_<lineNumber>
 * The className and lineNumber are embedded in the generated name.
 */
function mapToSource(
  cdpRules: Array<{ selector: string; used: boolean }>,
  classMap: Map<string, ClassInfo[]>,
  scopeToTrackedFiles = true,
): CssRuleCoverage[] {
  const results: CssRuleCoverage[] = [];
  const seen = new Set<string>();

  // First pass: map CDP rules to source
  for (const rule of cdpRules) {
    // Parse ._className_hash_line or ._className_hash_line:pseudo
    const match = rule.selector.match(/^\._([a-zA-Z][a-zA-Z0-9-]*)_[a-z0-9]+_(\d+)(:.+)?$/);
    if (!match) continue;

    const className = match[1]!;
    const line = parseInt(match[2]!, 10);
    const pseudo = match[3] ?? "";

    const candidates = classMap.get(className);
    if (!candidates) continue;

    // Find the source entry matching by class name and pseudo-class.
    // Vite encodes the line of the CLASS definition, not the pseudo variant.
    // So ._secondary_hash_25:hover → look for ".secondary:hover" in candidates.
    let source: ClassInfo | undefined;
    if (pseudo) {
      // Prefer an entry whose selector includes the pseudo-class
      source = candidates.find((c) => c.selector === `.${className}${pseudo}`);
    }
    if (!source) {
      source = candidates.find((c) => c.line === line) ?? candidates[0];
    }
    if (!source) continue;

    const sourceSelector = pseudo ? `.${className}${pseudo}` : source.selector;
    const sourceLine = pseudo
      ? (candidates.find((c) => c.selector === sourceSelector)?.line ?? source.line)
      : source.line;
    const key = `${source.cssFile}:${sourceLine}:${sourceSelector}`;
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({
      cssFile: source.cssFile,
      selector: sourceSelector,
      line: sourceLine,
      used: rule.used,
    });
  }

  // Second pass: add source selectors NOT seen in CDP as uncovered.
  // This catches rules from iframes that were destroyed before
  // CSS.stopRuleUsageTracking (e.g. :hover rules never triggered).
  // Only include files that had at least one CDP-tracked rule (i.e. files
  // that the test actually loaded) to avoid inflating per-test counts.
  const trackedFiles = new Set(results.map((r) => r.cssFile));
  for (const [, entries] of classMap) {
    for (const entry of entries) {
      if (scopeToTrackedFiles && !trackedFiles.has(entry.cssFile)) continue;
      const key = `${entry.cssFile}:${entry.line}:${entry.selector}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          cssFile: entry.cssFile,
          selector: entry.selector,
          line: entry.line,
          used: false,
        });
      }
    }
  }

  return results;
}

/**
 * Build aggregate coverage from all per-test-file coverage data.
 * A rule is "used" if ANY test file exercises it.
 */
function buildAggregate(
  perTestFile: TestFileCoverage[],
  classMap: Map<string, ClassInfo[]>,
): CssRuleCoverage[] {
  const ruleMap = new Map<string, CssRuleCoverage>();

  for (const tf of perTestFile) {
    for (const rule of tf.rules) {
      const key = `${rule.cssFile}:${rule.line}:${rule.selector}`;
      const existing = ruleMap.get(key);
      if (!existing) {
        ruleMap.set(key, { ...rule });
      } else if (rule.used) {
        existing.used = true;
      }
    }
  }

  // Add any source selectors not yet in the map as uncovered
  for (const [, entries] of classMap) {
    for (const entry of entries) {
      const key = `${entry.cssFile}:${entry.line}:${entry.selector}`;
      if (!ruleMap.has(key)) {
        ruleMap.set(key, {
          cssFile: entry.cssFile,
          selector: entry.selector,
          line: entry.line,
          used: false,
        });
      }
    }
  }

  return [...ruleMap.values()].sort((a, b) =>
    a.cssFile === b.cssFile ? a.line - b.line : a.cssFile.localeCompare(b.cssFile),
  );
}
