import { resolve, relative } from "node:path";
import { execSync, type ExecSyncOptions } from "node:child_process";
import { readFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { generateCssMutants } from "./css-mutant-generator.ts";
import { setActiveMutant } from "./vite-plugin.ts";
import { applyCssMutation, parseCss } from "./css-parser.ts";
import { buildImportMap } from "./import-tracker.ts";
import { loadCache, saveCache, mutantKey, hashFileChain } from "./mutation-cache.ts";
import { collectCssCoverage } from "./css-coverage.ts";
import {
  generateHtmlReport,
  generateJsonReport,
  printConsoleReport,
} from "./reporter/css-html-reporter.ts";
import type {
  CssMutant,
  CssMutantResult,
  CssMutationRunOptions,
  MutantStatus,
  MutationTestingSummary,
} from "./types.ts";

const DEFAULT_TEST_PATTERNS = [
  "test/**/*.test.ts",
  "test/**/*.test.tsx",
  "src/**/*.test.ts",
  "src/**/*.test.tsx",
];

// ─── Types ────────────────────────────────────────────────────

interface TaskResult {
  state: string;
}
interface Task {
  name: string;
  type: string;
  result?: TaskResult;
}

interface TestModule {
  state(): string;
  moduleId: string;
  task: { tasks?: Task[] };
}

interface TestSpec {
  moduleId: string;
}

interface VitestLike {
  globTestSpecifications(): Promise<TestSpec[]>;
  rerunTestSpecifications(specs: TestSpec[], all?: boolean): Promise<{ testModules: TestModule[] }>;
  cancelCurrentRun(reason: string): Promise<void>;
  close(): Promise<void>;
}

// ─── Main ─────────────────────────────────────────────────────

export async function runCssMutationTesting(
  options: CssMutationRunOptions,
): Promise<MutationTestingSummary> {
  // Suppress Vite's "Port X is in use" noise from browser server.
  // We create many vitest instances (one per mutation), each starting a
  // new Vite server that may land on an in-use port before retrying.
  const origStdoutWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((data: unknown, ...args: unknown[]) => {
    if (typeof data === "string" && data.includes("is in use")) return true;
    return (origStdoutWrite as Function)(data, ...args);
  }) as typeof process.stdout.write;

  const startTime = Date.now();
  const cwd = options.cwd ?? process.cwd();
  const timeout = options.timeout ?? 30_000;
  const reportDir = options.reportDir ?? resolve(cwd, "reports", "css-mutation");
  const reporters = options.reporters ?? ["console", "html", "json"];
  const stateDir = resolve(cwd, ".css-mutator-tmp");
  const cacheDir = resolve(cwd, ".css-mutator-cache");
  const importTrackingEnabled = options.importTracking !== false;
  const serverModeEnabled = options.serverMode !== false;
  const incrementalEnabled = options.incremental !== false;

  mkdirSync(stateDir, { recursive: true });

  log("\n  CSS Mutation Testing\n");
  log("  Scanning...");
  const mutants = await generateCssMutants(options);
  const cssFiles = new Set(mutants.map((m) => m.fileName));
  log(` ${mutants.length} mutants in ${cssFiles.size} file(s)\n`);

  if (mutants.length === 0) {
    log("  No CSS mutations found.\n");
    return createEmptySummary(startTime);
  }

  writeFileSync(resolve(stateDir, "mutants.json"), JSON.stringify(mutants, null, 2));

  let importMap: Map<string, string[]> | undefined;
  if (importTrackingEnabled) {
    const testPatterns = options.testPatterns ?? DEFAULT_TEST_PATTERNS;
    importMap = await buildImportMap(testPatterns, cwd);
    log(`  Import tracking: ${importMap.size} CSS → test mappings\n`);
  }

  const cache = loadCache(cacheDir);
  // Hash each CSS file together with its test files — if ANY file
  // in the chain changes (CSS, test, or component), cache invalidates
  const currentHashes = new Map<string, string>();
  for (const f of cssFiles) {
    try {
      const testFiles = importMap?.get(f) ?? [];
      currentHashes.set(f, hashFileChain(f, testFiles));
    } catch {
      /* skip */
    }
  }

  let cachedCount = 0;
  if (incrementalEnabled) {
    for (const m of mutants) {
      const k = mkKey(m);
      const oh = cache.cssHashes[m.fileName];
      const nh = currentHashes.get(m.fileName);
      if (oh && nh && oh === nh && cache.statuses[k]) cachedCount++;
    }
    if (cachedCount > 0) log(`  Incremental: ${cachedCount}/${mutants.length} cached\n`);
  }

  let results: CssMutantResult[];

  if (serverModeEnabled) {
    results = await runWithParallelServers(
      mutants,
      cwd,
      options,
      importMap,
      timeout,
      cache,
      currentHashes,
      incrementalEnabled,
    );
  } else {
    results = await runWithProcesses(
      mutants,
      cwd,
      options,
      importMap,
      stateDir,
      timeout,
      cache,
      currentHashes,
      incrementalEnabled,
    );
  }

  setActiveMutant(null, stateDir);

  // Update cache
  const newCache = { ...cache };
  for (const f of cssFiles) {
    const h = currentHashes.get(f);
    if (h) newCache.cssHashes[f] = h;
  }
  for (const r of results) {
    const k = mkKey(r);
    newCache.statuses[k] = r.status;
    // killers are already updated in runMutantGroup with test-case-level info
    // Only set here as fallback if not already set by runMutantGroup
    if (r.status === "Killed" && r.killedBy.length > 0 && !newCache.killers[k]) {
      newCache.killers[k] = { file: r.killedBy[0]!, testName: r.killedBy[0]! };
    }
  }
  saveCache(cacheDir, newCache);

  // Collect CSS coverage via CDP if running in server mode with import tracking
  const summary = createSummary(results, startTime);
  if (serverModeEnabled && importMap) {
    const configFile = options.vitestConfig ? resolve(cwd, options.vitestConfig) : undefined;
    const allTestFiles = [...new Set([...importMap.values()].flat())];
    const allCssFiles = [...cssFiles];
    try {
      summary.cssCoverage = await collectCssCoverage(
        allTestFiles,
        allCssFiles,
        cwd,
        createVitestInstance,
        configFile,
        log,
      );
      const agg = summary.cssCoverage.aggregate;
      const used = agg.filter((r) => r.used).length;
      log(`  CSS coverage: ${used}/${agg.length} rules (${agg.length > 0 ? ((used / agg.length) * 100).toFixed(1) : "100"}%)\n`);
    } catch {
      /* coverage is optional — don't block the run */
    }
  }

  mkdirSync(reportDir, { recursive: true });
  if (reporters.includes("console")) printConsoleReport(summary);
  if (reporters.includes("html")) {
    const p = resolve(reportDir, "index.html");
    await generateHtmlReport(summary, p);
    log(`\n  HTML report: ${p}\n`);
  }
  if (reporters.includes("json")) {
    const p = resolve(reportDir, "mutation-report.json");
    generateJsonReport(summary, p);
    log(`  JSON report: ${p}\n`);
  }
  try {
    rmSync(stateDir, { recursive: true, force: true });
  } catch {
    /* ok */
  }
  process.stdout.write = origStdoutWrite;
  return summary;
}

// ─── Parallel server mode ─────────────────────────────────────

/**
 * Build parallel groups of CSS files with disjoint test sets.
 * Each group gets its own vitest instance running concurrently.
 */
function buildParallelGroups(
  mutants: CssMutant[],
  importMap: Map<string, string[]> | undefined,
): CssMutant[][] {
  if (!importMap) return [mutants];

  const cssToTests = new Map<string, Set<string>>();
  for (const m of mutants) {
    if (!cssToTests.has(m.fileName)) {
      cssToTests.set(m.fileName, new Set(importMap.get(m.fileName) ?? []));
    }
  }

  // Graph coloring: CSS files with disjoint test sets go in DIFFERENT groups
  // so they can run in parallel. Files that share tests must be in the same group.
  // Files with NO tests (NoCoverage) get their own group — they're skipped anyway.
  const groups: Array<{ files: Set<string>; tests: Set<string> }> = [];
  for (const [cssFile, tests] of cssToTests) {
    // No test coverage → skip grouping (handled as NoCoverage)
    if (tests.size === 0) continue;

    // Try to find an existing group where this file CONFLICTS (overlapping tests)
    let conflictGroup: (typeof groups)[number] | undefined;
    for (const g of groups) {
      for (const t of tests) {
        if (g.tests.has(t)) {
          conflictGroup = g;
          break;
        }
      }
      if (conflictGroup) break;
    }

    if (conflictGroup) {
      // Must go in the same group as the conflicting file
      conflictGroup.files.add(cssFile);
      for (const t of tests) conflictGroup.tests.add(t);
    } else {
      // No conflicts — create a new group (runs in parallel with others)
      groups.push({ files: new Set([cssFile]), tests: new Set(tests) });
    }
  }

  // Add NoCoverage mutants as a single non-tested group
  const noCoverageMutants = mutants.filter((m) => (cssToTests.get(m.fileName)?.size ?? 0) === 0);
  if (noCoverageMutants.length > 0) {
    groups.push({ files: new Set(noCoverageMutants.map((m) => m.fileName)), tests: new Set() });
  }

  return groups.map((g) => mutants.filter((m) => g.files.has(m.fileName)));
}

async function createVitestInstance(
  cwd: string,
  configFile: string | undefined,
  bail: number,
  testNamePattern?: string,
): Promise<VitestLike> {
  const { createRequire } = await import("node:module");
  const req = createRequire(resolve(cwd, "package.json"));
  const vitestNodePath = req.resolve("vitest/node");
  const { createVitest } = await import(vitestNodePath);
  const opts: Record<string, unknown> = {
    root: cwd,
    config: configFile,
    watch: true,
    bail,
    reporters: [{ onInit: () => {} }],
  };
  if (testNamePattern) opts["testNamePattern"] = testNamePattern;
  const vitest = (await createVitest("test", opts, { server: { port: 0 } })) as VitestLike;
  // Use standalone() if available (vitest 4+), fall back to init()
  const v = vitest as unknown as { standalone?: () => Promise<void>; init?: () => Promise<void> };
  if (typeof v.standalone === "function") {
    await v.standalone();
  } else if (typeof v.init === "function") {
    await v.init();
  }
  return vitest;
}


function validateCss(source: string, fileName: string): string | null {
  try {
    parseCss(source, fileName);
    return null;
  } catch (e: unknown) {
    return e instanceof Error ? e.message : "Invalid CSS";
  }
}

function findFailedTestNames(mod: TestModule): string[] {
  const tasks = mod.task?.tasks;
  if (!tasks) return [];
  return tasks.filter((t) => t.result?.state === "fail").map((t) => t.name);
}

async function runWithParallelServers(
  mutants: CssMutant[],
  cwd: string,
  options: CssMutationRunOptions,
  importMap: Map<string, string[]> | undefined,
  _timeout: number,
  cache: ReturnType<typeof loadCache>,
  cssHashes: Map<string, string>,
  incrementalEnabled: boolean,
): Promise<CssMutantResult[]> {
  const configFile = options.vitestConfig ? resolve(cwd, options.vitestConfig) : undefined;
  const groups = buildParallelGroups(mutants, importMap);

  // For baseline, use a single instance
  log("  Starting vitest server...");
  const baseVitest = await createVitestInstance(cwd, configFile, 0);

  let mutantTimeout: number;
  try {
    const allSpecs = await baseVitest.globTestSpecifications();

    log(" baseline...");
    const t0 = Date.now();
    const baseline = await baseVitest.rerunTestSpecifications(allSpecs, true);
    const baselineDuration = Date.now() - t0;
    if (baseline.testModules.some((m) => m.state() === "failed")) {
      log(" FAILED\n\n  Fix your tests before running mutation testing.\n");
      process.exitCode = 1;
      await baseVitest.close();
      return [];
    }
    log(` OK (${(baselineDuration / 1000).toFixed(1)}s)\n`);
    // Scale timeout by number of parallel groups — more groups = more resource contention
    const testedGroups = groups.filter((g) =>
      g.some((m) => (importMap?.get(m.fileName)?.length ?? 0) > 0),
    );
    const parallelScale = Math.max(1, testedGroups.length);
    mutantTimeout = Math.max(2000, Math.round(baselineDuration * 1.5 * parallelScale));
    log(`  Timeout: ${(mutantTimeout / 1000).toFixed(1)}s (1.5x × ${parallelScale} parallel)\n`);
  } finally {
    await baseVitest.close();
  }

  if (groups.length > 1) {
    log(`  Parallel: ${groups.length} groups with disjoint test sets\n`);
  }

  const totalActive =
    mutants.length -
    (incrementalEnabled
      ? mutants.filter((m) => {
          const k = mkKey(m);
          const oh = cache.cssHashes[m.fileName];
          const nh = cssHashes.get(m.fileName);
          return oh && nh && oh === nh && cache.statuses[k];
        }).length
      : 0);

  log(
    `\n  Testing ${mutants.length} mutants${totalActive < mutants.length ? ` (${totalActive} active, ${mutants.length - totalActive} cached)` : ""}:\n\n`,
  );

  // Run groups in parallel — each gets its own vitest instance
  // NoCoverage groups don't need a vitest instance
  const noCoverageResults: CssMutantResult[] = [];
  const activeGroups: CssMutant[][] = [];
  for (const group of groups) {
    const hasTests = group.some((m) => (importMap?.get(m.fileName)?.length ?? 0) > 0);
    if (hasTests) {
      activeGroups.push(group);
    } else {
      for (const m of group) {
        noCoverageResults.push(makeResult(m, "NoCoverage", [], [], 0));
        logMutant(m, "NoCoverage");
      }
    }
  }

  // Save originals so we can restore on unexpected exit (kill, Ctrl-C).
  // Without this, force-killed runs leave CSS files in a mutated state.
  const cssOriginals = new Map<string, string>();
  for (const m of mutants) {
    if (!cssOriginals.has(m.fileName)) {
      cssOriginals.set(m.fileName, readFileSync(m.fileName, "utf-8"));
    }
  }
  const restoreAll = () => {
    for (const [f, content] of cssOriginals) {
      try {
        writeFileSync(f, content);
      } catch {
        /* best-effort */
      }
    }
  };
  process.on("exit", restoreAll);
  process.on("SIGINT", () => {
    restoreAll();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    restoreAll();
    process.exit(143);
  });

  // Each active group runs mutations in parallel with other groups.
  // Within a group, mutations run sequentially — each gets a FRESH vitest
  // instance because rerunTestSpecifications can't refresh CSS in the browser.
  const groupPromises = activeGroups.map((group) =>
    runMutantGroup(
      group,
      cwd,
      configFile,
      options,
      importMap,
      cache,
      cssHashes,
      incrementalEnabled,
      mutantTimeout,
    ),
  );

  try {
    const groupResults = await Promise.all(groupPromises);
    return [...noCoverageResults, ...groupResults.flat()];
  } finally {
    restoreAll();
    process.removeListener("exit", restoreAll);
  }
}

/**
 * Run mutations sequentially, each in a FRESH vitest instance.
 *
 * vitest browser mode's rerunTestSpecifications doesn't re-import CSS
 * modules from disk — the browser keeps cached versions. A fresh instance
 * loads all modules from disk, guaranteeing correct CSS state and accurate
 * killer attribution (e.g. :hover mutations only fail hover tests).
 */
async function runMutantGroup(
  mutants: CssMutant[],
  cwd: string,
  configFile: string | undefined,
  options: CssMutationRunOptions,
  importMap: Map<string, string[]> | undefined,
  cache: ReturnType<typeof loadCache>,
  cssHashes: Map<string, string>,
  incrementalEnabled: boolean,
  mutantTimeout: number,
): Promise<CssMutantResult[]> {
  const results: CssMutantResult[] = [];
  const importTrackingOn = options.importTracking !== false;

  for (const mutant of mutants) {
    const testFiles = importMap?.get(mutant.fileName);
    const coveredBy = testFiles ? testFiles.map((f) => relative(cwd, f)) : [];

    if (importTrackingOn && importMap && !testFiles) {
      results.push(makeResult(mutant, "NoCoverage", [], [], 0));
      logMutant(mutant, "NoCoverage");
      continue;
    }

    const key = mkKey(mutant);
    if (incrementalEnabled) {
      const oh = cache.cssHashes[mutant.fileName];
      const nh = cssHashes.get(mutant.fileName);
      const cs = cache.statuses[key];
      const vs = cs ? toMutantStatus(cs) : undefined;
      if (oh && nh && oh === nh && vs) {
        const ck = cache.killers[key];
        const cachedKillers = ck ? [`${ck.file}::${ck.testName}`] : [];
        results.push(makeResult(mutant, vs, cachedKillers, coveredBy, 0));
        logMutant(mutant, `${vs} (cached)`, undefined, cachedKillers);
        continue;
      }
    }

    if (importTrackingOn && testFiles && testFiles.length === 0) {
      results.push(makeResult(mutant, "NoCoverage", [], [], 0));
      logMutant(mutant, "NoCoverage");
      continue;
    }

    const originalSource = readFileSync(mutant.fileName, "utf-8");
    const mutatedSource = applyCssMutation(originalSource, mutant.range, mutant.replacement);
    const cssError = validateCss(mutatedSource, mutant.fileName);
    if (cssError) {
      results.push(makeResult(mutant, "RuntimeError", [], coveredBy, 0));
      logMutant(mutant, "PARSE ERROR");
      continue;
    }

    const t0 = Date.now();
    let status: MutantStatus = "Timeout";
    let killedBy: string[] = [];

    // Write mutation to disk, then create a FRESH vitest instance.
    // This ensures the browser loads the mutated CSS from disk without
    // any HMR stale state from previous mutations.
    writeFileSync(mutant.fileName, mutatedSource);

    try {
      const vitest = await createVitestInstance(cwd, configFile, 0);
      try {
        const allSpecs = await vitest.globTestSpecifications();
        const specsToRun = testFiles
          ? allSpecs.filter((s) => testFiles.includes(s.moduleId))
          : allSpecs;

        if (specsToRun.length === 0) {
          status = "NoCoverage";
        } else {
          let timedOut = false;
          const cancelTimer = setTimeout(() => {
            timedOut = true;
            vitest.cancelCurrentRun("test-failure");
          }, mutantTimeout);

          const runResult = await vitest.rerunTestSpecifications(specsToRun, true);
          clearTimeout(cancelTimer);

          if (timedOut) {
            status = "Timeout";
          } else {
            const failed = runResult.testModules.filter((m) => m.state() === "failed");
            if (failed.length > 0) {
              status = "Killed";
              for (const mod of failed) {
                const testNames = findFailedTestNames(mod);
                const fileRel = relative(cwd, mod.moduleId);
                if (testNames.length > 0) {
                  for (const tn of testNames) killedBy.push(`${fileRel}::${tn}`);
                  cache.killers[key] = { file: fileRel, testName: testNames[0]! };
                } else {
                  killedBy.push(fileRel);
                  cache.killers[key] = { file: fileRel, testName: fileRel };
                }
              }
            } else {
              status = "Survived";
            }
          }
        }
      } finally {
        // Close with a timeout — vitest.close() can hang after cancelCurrentRun
        // (e.g. Playwright still polling for element visibility after display:none)
        await Promise.race([
          vitest.close(),
          new Promise<void>((r) => setTimeout(r, 5000)),
        ]);
      }
    } catch {
      status = "RuntimeError";
    }

    // Restore original CSS
    writeFileSync(mutant.fileName, originalSource);

    results.push(makeResult(mutant, status, killedBy, coveredBy, Date.now() - t0));
    logMutant(mutant, status, Date.now() - t0, killedBy);
  }

  return results;
}

// ─── Process mode (fallback) ──────────────────────────────────

async function runWithProcesses(
  mutants: CssMutant[],
  cwd: string,
  options: CssMutationRunOptions,
  importMap: Map<string, string[]> | undefined,
  stateDir: string,
  timeout: number,
  cache: ReturnType<typeof loadCache>,
  cssHashes: Map<string, string>,
  incrementalEnabled: boolean,
): Promise<CssMutantResult[]> {
  log("  Running baseline...");
  setActiveMutant(null, stateDir);
  if (!runTestProcess(cwd, options.vitestConfig, timeout)) {
    log(" FAILED\n");
    process.exitCode = 1;
    return [];
  }
  log(" OK\n\n");

  const results: CssMutantResult[] = [];
  for (const mutant of mutants) {
    const testFiles = importMap?.get(mutant.fileName);
    const coveredBy = testFiles ? testFiles.map((f) => relative(cwd, f)) : [];
    if (options.importTracking !== false && importMap && !testFiles) {
      results.push(makeResult(mutant, "NoCoverage", [], [], 0));
      logMutant(mutant, "NoCoverage");
      continue;
    }
    const key = mkKey(mutant);
    if (incrementalEnabled) {
      const oh = cache.cssHashes[mutant.fileName];
      const nh = cssHashes.get(mutant.fileName);
      const cs = cache.statuses[key];
      const vs = cs ? toMutantStatus(cs) : undefined;
      if (oh && nh && oh === nh && vs) {
        const ck = cache.killers[key];
        results.push(makeResult(mutant, vs, ck ? [ck.file] : [], coveredBy, 0));
        logMutant(mutant, `${vs} (cached)`);
        continue;
      }
    }
    const orig = readFileSync(mutant.fileName, "utf-8");
    const mut = applyCssMutation(orig, mutant.range, mutant.replacement);
    if (validateCss(mut, mutant.fileName)) {
      results.push(makeResult(mutant, "RuntimeError", [], coveredBy, 0));
      logMutant(mutant, "PARSE ERROR");
      continue;
    }
    setActiveMutant(mutant.id, stateDir);
    writeFileSync(mutant.fileName, mut);
    const t0 = Date.now();
    let status: MutantStatus;
    let killedBy: string[] = [];
    try {
      if (runTestProcess(cwd, options.vitestConfig, timeout, testFiles)) status = "Survived";
      else {
        status = "Killed";
        killedBy = coveredBy;
      }
    } catch (e: unknown) {
      status = e instanceof Error && e.message.includes("TIMEOUT") ? "Timeout" : "RuntimeError";
    } finally {
      writeFileSync(mutant.fileName, orig);
    }
    results.push(makeResult(mutant, status, killedBy, coveredBy, Date.now() - t0));
    logMutant(mutant, status, Date.now() - t0, killedBy);
  }
  return results;
}

// ─── CLI output ───────────────────────────────────────────────

function log(msg: string): void {
  process.stdout.write(msg);
}

function logMutant(
  mutant: CssMutant,
  status: string,
  durationMs?: number,
  killedBy?: string[],
): void {
  const c = status.startsWith("Killed")
    ? "\x1b[32m"
    : status === "Survived"
      ? "\x1b[31m"
      : status.includes("cached")
        ? "\x1b[33m"
        : "\x1b[90m";

  // Format: status | test::name | .selector | property | before → after | time
  // Killed by first test, or empty for non-killed
  let killer = "";
  if (killedBy && killedBy.length > 0) {
    // "file::testName" → "file::testName" (keep compact)
    killer = truncate(killedBy[0]!, 40);
  }

  const parts = [
    `${c}${status.padEnd(16)}\x1b[0m`,
    killer ? `\x1b[36m${killer.padEnd(42)}\x1b[0m` : "".padEnd(42),
    mutant.selector.padEnd(18),
    mutant.property.padEnd(18),
    `\x1b[2m${truncate(`${mutant.original} → ${mutant.replacement}`, 30)}\x1b[0m`,
    durationMs !== undefined ? `${(durationMs / 1000).toFixed(1)}s` : "",
  ];

  log(`  ${parts.join(" ")}\n`);
}

function truncate(s: string, len: number): string {
  return s.length > len ? s.slice(0, len - 1) + "…" : s;
}

// ─── Helpers ──────────────────────────────────────────────────

function runTestProcess(
  cwd: string,
  vitestConfig?: string,
  timeout = 30_000,
  testFiles?: string[],
): boolean {
  const configArg = vitestConfig ? `--config ${vitestConfig}` : "";
  const fileArgs = testFiles ? testFiles.map((f) => relative(cwd, f)).join(" ") : "";
  const cmd = `npx vitest run ${configArg} --bail 1 --reporter=verbose ${fileArgs}`.trim();
  try {
    execSync(cmd, {
      cwd,
      timeout,
      stdio: "pipe",
      env: { ...process.env, FORCE_COLOR: "0" },
    } satisfies ExecSyncOptions);
    return true;
  } catch (error: unknown) {
    if (error && typeof error === "object" && "killed" in error && error.killed)
      throw new Error("TIMEOUT", { cause: error });
    return false;
  }
}

function mkKey(m: {
  fileName: string;
  property: string;
  original: string;
  replacement: string;
  location: { start: { line: number } };
}): string {
  return mutantKey(m.fileName, m.property, m.original, m.replacement, m.location.start.line);
}

function makeResult(
  mutant: CssMutant,
  status: MutantStatus,
  killedBy: string[],
  coveredBy: string[],
  duration: number,
): CssMutantResult {
  return {
    id: mutant.id,
    mutatorName: mutant.mutatorName,
    fileName: mutant.fileName,
    selector: mutant.selector,
    property: mutant.property,
    original: mutant.original,
    replacement: mutant.replacement,
    range: mutant.range,
    location: mutant.location,
    description: mutant.description,
    status,
    killedBy,
    coveredBy,
    duration,
  };
}

function createSummary(results: CssMutantResult[], startTime: number): MutationTestingSummary {
  const killed = results.filter((r) => r.status === "Killed").length;
  const survived = results.filter((r) => r.status === "Survived").length;
  const timeouts = results.filter((r) => r.status === "Timeout").length;
  const noCoverage = results.filter((r) => r.status === "NoCoverage").length;
  const runtimeError = results.filter((r) => r.status === "RuntimeError").length;
  const total = results.length;
  const detected = killed + timeouts;
  const files: Record<string, CssMutantResult[]> = {};
  for (const r of results) {
    const e = files[r.fileName];
    if (e) e.push(r);
    else files[r.fileName] = [r];
  }
  return {
    files,
    totals: {
      mutants: total,
      killed,
      survived,
      timeout: timeouts,
      noCoverage,
      runtimeError,
      mutationScore: total > 0 ? (detected / total) * 100 : 100,
      mutationScoreBasedOnCoveredCode:
        total - noCoverage > 0 ? (detected / (total - noCoverage)) * 100 : 100,
    },
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
  };
}

function createEmptySummary(startTime: number): MutationTestingSummary {
  return {
    files: {},
    totals: {
      mutants: 0,
      killed: 0,
      survived: 0,
      timeout: 0,
      noCoverage: 0,
      runtimeError: 0,
      mutationScore: 100,
      mutationScoreBasedOnCoveredCode: 100,
    },
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
  };
}

function isMutantStatus(v: string): v is MutantStatus {
  return (
    v === "Killed" ||
    v === "Survived" ||
    v === "Timeout" ||
    v === "RuntimeError" ||
    v === "NoCoverage"
  );
}

function toMutantStatus(v: string): MutantStatus | undefined {
  return isMutantStatus(v) ? v : undefined;
}
