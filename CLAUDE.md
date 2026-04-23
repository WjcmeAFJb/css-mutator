# CSS Mutator — Project Guide

## Overview

CSS mutation testing tool for Vite + Vitest projects. Systematically mutates CSS properties and verifies that visual/screenshot tests detect the changes.

## Monorepo Structure

```
packages/
  css-mutator/     # css-mutator — core library, Vite plugin, CLI
  demo-app/        # Demo Vite+React app with intentional CSS bugs and visual tests
  docs-site/       # VitePress documentation site
```

The standalone demo is at `~/workspace/css-mutator-demo/` (separate git repo).

## Commands

```bash
# Install dependencies (use npx pnpm@9 if pnpm not installed globally)
npx pnpm@9 install

# Run CSS mutator tests (805 unit tests)
cd packages/css-mutator && npx vitest run

# Type check (tsgo)
npx tsgo -b

# Lint (oxlint with type-aware rules)
npx oxlint --type-aware --tsconfig tsconfig.json

# Format
npx oxfmt --write .

# Build the package (emits to dist/)
cd packages/css-mutator && npx tsc
# NOTE: must delete tsconfig.tsbuildinfo if dist is empty after tsc

# Dry run — list mutations without testing
npx css-mutate --dry-run --files "src/**/*.module.css"
```

## Architecture — How It Works

### Pipeline Overview

```
1. SCAN        css-parser.ts + css-mutant-generator.ts
   Parse CSS with PostCSS → extract declarations → generate mutants

2. TRACK       import-tracker.ts
   Static import analysis → map each CSS file to its test files

3. GROUP       orchestrator.ts (buildParallelGroups)
   Graph coloring → CSS files with disjoint test sets → parallel groups

4. TEST        orchestrator.ts (runWithParallelServers)
   For each group, start a vitest instance → for each mutant:
     a. Write mutated CSS to disk
     b. invalidateFile + reloadModule (HMR push to browser)
     c. rerunTestSpecifications (re-runs affected tests)
     d. Check testModules for failures → Killed/Survived
     e. Restore original CSS

5. REPORT      reporter/css-html-reporter.ts
   Console summary + HTML with annotated CSS source + JSON
```

### Key Source Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/orchestrator.ts` | 757 | **Core** — vitest server management, parallel execution, mutation loop, timeout/cancel, caching |
| `src/css-parser.ts` | 151 | PostCSS parsing with byte-range tracking for precise value replacement |
| `src/css-mutant-generator.ts` | 145 | Scans CSS files, applies all mutators, generates `CssMutant[]` |
| `src/import-tracker.ts` | 197 | Regex-based import analysis: CSS file → test files mapping |
| `src/mutation-cache.ts` | 126 | Two-file cache: `statuses.json` (incremental) + `killers.json` (smart ordering) |
| `src/vite-plugin.ts` | 117 | Vite plugin for CSS interception (used in process mode only) |
| `src/reporter/css-html-reporter.ts` | 504 | HTML report with per-line CSS annotations, JSON report |
| `src/mutators/*.ts` | ~900 | 12 mutation operators (Color, Display, Size, Position, etc.) |
| `src/types.ts` | 150 | Core type definitions: CssMutant, CssMutantResult, options |
| `src/cli.ts` | 171 | CLI entry point and arg parsing |
| `src/index.ts` | 63 | Public API exports |

### The Orchestrator (orchestrator.ts) — The Most Complex File

The orchestrator is the heart of the system. It has two modes:

**Server mode (default)**: Uses vitest's programmatic API (`vitest/node`).
- Creates vitest instances with `watch: true` to keep browser alive
- Uses `invalidateFile()` + `reloadModule()` for HMR-based CSS updates
- Uses `cancelCurrentRun()` to force-stop stuck test runs on timeout
- Resolves vitest from the PROJECT's node_modules (not ours) via `createRequire`

**Process mode (`--no-server-mode`)**: Spawns `npx vitest run` per mutant.
- Simpler but ~2x slower due to cold starts
- Uses `execSync` with `bail: 1` flag

#### Parallel Execution

`buildParallelGroups()` uses graph coloring to identify CSS files with disjoint test sets:
- Badge.module.css → [Badge.test.tsx] } group 1
- Button.module.css → [Button.test.tsx] } group 2  
- Card.module.css → [Card.test.tsx] } group 3
- App.module.css → [] (NoCoverage, no vitest instance needed)

Each active group gets its own vitest instance via `createVitestInstance()`.
Groups run concurrently via `Promise.all`. Files with overlapping test sets
MUST be in the same group to prevent one mutation from interfering with another.

#### Timeout and Cancel

- Timeout = 1.5× baseline duration × number of parallel groups
- On timeout: `vitest.cancelCurrentRun("test-failure")` → instant resolve
- Without cancel, stuck runs (e.g. `display:none` makes `toBeVisible()` poll 15s) block all subsequent mutants in the same group

#### Why `display:none` Mutations Timeout

Vitest browser mode uses Playwright's `expect.element(btn).toBeVisible()` which
auto-retries for 15 seconds. When `display:none` is applied, the element never
becomes visible, so the assertion retries until Playwright's assertion timeout
expires. This is intrinsic to the test framework. The orchestrator's timeout
catches this and moves on.

### Module Invalidation — How CSS Changes Reach the Browser

```
1. writeFileSync(cssFile, mutatedCSS)        ← write to disk
2. vitest.invalidateFile(cssFile)             ← clear vitest's cache
3. invalidateAndReload(vitest, cssFile)       ← for each project:
   a. project.vite.moduleGraph.invalidateModule(mod)   ← server-side
   b. project.browser.vite.moduleGraph.invalidateModule(mod)  ← browser-side
   c. project.browser.vite.reloadModule(mod)  ← triggers HMR push to browser
4. vitest.rerunTestSpecifications(specs)      ← re-run tests with new CSS
```

`reloadModule()` is essential — without it, the browser keeps the old CSS.
`invalidateFile()` alone only clears the server-side cache.

### Why We Can't Use a Vite Plugin Instead of Disk Writes

We tested an in-memory Vite plugin approach (no disk writes). It doesn't work
because plugins added via `createVitest({plugins: [...]})` only register on the
MAIN Vite server, not the browser's Vite server. The browser's Vite server
reads CSS from disk. Therefore disk writes + HMR reload is the only approach
that works for browser mode.

### Import Tracking (import-tracker.ts)

Static analysis via regex (no babel dependency). Walks import trees from test
files to find which CSS files they transitively import.

```
extractImports(source)           → ["./Button.tsx", "vitest"]
resolveImport("./Button", dir)   → /abs/path/Button.tsx (tries .ts/.tsx/.js/.jsx/.css)
collectCssDependencies(file)     → Set<"/abs/path/Button.module.css">
buildImportMap(patterns, cwd)    → Map<cssPath, testPaths[]>
```

Bare specifiers (react, vitest) are skipped. Only relative imports are followed.

### Mutation Cache (mutation-cache.ts)

Two separate files in `.css-mutator-cache/`:

**`statuses.json`** — for incremental runs (skip unchanged CSS):
```json
{ "statuses": { "Button.css:5:color:red->blue": "Killed" },
  "cssHashes": { "/path/Button.css": "a1b2c3d4e5f67890" } }
```

**`killers.json`** — for smart test ordering (try killer test first):
```json
{ "killers": { "Button.css:5:color:red->blue":
    { "file": "test/Button.test.tsx", "testName": "primary button" } } }
```

Cache invalidation: hashes include BOTH the CSS file AND all test files that
import it (`hashFileChain`). Changing a test file invalidates all mutants for
the CSS files that test imports.

### Vitest Version Compatibility

The orchestrator resolves `vitest/node` from the PROJECT's node_modules:
```ts
const { createRequire } = await import("node:module");
const req = createRequire(resolve(cwd, "package.json"));
const { createVitest } = await import(req.resolve("vitest/node"));
```

This ensures we use the same vitest version the project is configured with
(v3 or v4). The peerDependency is `"^3.0.0 || ^4.0.0"`.

### Test Results — Test-Case Level Granularity

After a `rerunTestSpecifications` call, per-test results are accessed via:
```ts
for (const mod of runResult.testModules) {
  for (const task of mod.task.tasks) {
    // task.name = "primary button"
    // task.result.state = "fail" | "pass"
  }
}
```

This is vitest 4's API. The `findFailedTestName()` function extracts the first
failed test's name for the killer cache.

## Adding a New Mutation Operator

1. Create `src/mutators/foo-mutator.ts`:
```ts
import { BaseCssMutator } from "./base-mutator.ts";

export class FooMutator extends BaseCssMutator {
  readonly name = "FooMutator";
  readonly description = "Mutates foo-related CSS properties";
  readonly targetProperties = ["foo", "foo-bar"];

  mutate(property: string, value: string): string[] {
    // Return replacement values. Empty array = no mutations for this value.
    if (value === "x") return ["y", "z"];
    return [];
  }
}
```

2. Register in `src/mutators/index.ts`: add to imports, `createAllMutators()`, and exports.

3. Write tests in `test/mutators/foo-mutator.test.ts` — use `toEqual` for exact output.

4. Add `handles()` tests in `test/mutators/target-properties.test.ts`.

5. Run: `npx vitest run && npx tsgo -b && npx oxlint --type-aware --tsconfig tsconfig.json`

## Tooling

- **@tsconfig/strictest** — strictest TypeScript config (noUncheckedIndexedAccess, exactOptionalPropertyTypes, etc.)
- **tsgo** (`@typescript/native-preview`) — fast Go-based type checker via `npx tsgo -b`
- **oxlint** — fast Rust-based linter with type-aware semantic rules (no style rules)
- **oxfmt** — fast Rust-based formatter
- **NOTE**: after editing source, delete `tsconfig.tsbuildinfo` if `npx tsc` produces empty dist/

## Testing Philosophy

Screenshot tests render individual components (not full pages) in a real browser,
take Playwright screenshots, and compare against baselines via vitest 4's native
`toMatchScreenshot()`. A single screenshot captures every visual property — no need
to assert individual CSS values.

## Centralized Rule Overrides

All lint rule overrides are documented in `.oxlintrc.json`:

- `no-unused-vars` / `typescript/no-unused-vars`: off — handled by tsgo
- `no-console`: off — CLI tool uses console output
- `typescript/no-unnecessary-type-assertion`: off — conflicts with tsgo's noUncheckedIndexedAccess
- `unicorn/no-array-sort`: off — toSorted() not yet available in tsgo's ES2023 lib
- Test files: `no-unsafe-member-access`, `no-unsafe-type-assertion` off — JSON.parse results are untyped in tests
- `noPropertyAccessFromIndexSignature`: false in demo-app tsconfig — CSS module types use Record<string, string>

## Performance Optimizations

| Optimization | Mechanism | Impact |
|-------------|-----------|--------|
| Server mode | Single vitest instance, reuse browser | ~2x faster than process-per-mutant |
| Parallel groups | Multiple vitest instances for disjoint CSS→test sets | ~1.7x on 3+ CSS files |
| Import tracking | Only run tests that import the mutated CSS | Skips irrelevant tests |
| Incremental cache | Skip mutants in unchanged CSS+test files | Instant on re-run |
| Smart ordering | Try the test that killed this mutant last time first | ~1 test per killed mutant |
| Short-circuit | `bail:1` — stop after first test failure | Skip remaining tests |
| CSS validation | PostCSS validates mutated CSS before testing | Skip invalid mutations |
| cancelCurrentRun | Force-stop stuck test runs on timeout | Prevents cascading timeouts |
| HMR reload | `reloadModule()` pushes CSS to browser via HMR | No file watcher delay |

## Known Limitations

1. **Vite plugin injection** — plugins added via `createVitest({plugins})` only register on the main Vite server, not the browser's. Disk writes required for browser mode.
2. **Playwright assertion timeout** — `display:none` mutations cause 15s assertion timeouts in `toBeVisible()`. The orchestrator's timeout catches this but the mutant takes 2-4s (timeout + cancel).
3. **`bail:1` killer attribution** — with `bail:1`, the `killedBy` test name may be the FIRST test that fails, not necessarily the most specific one. The mutation IS correctly killed; just the attribution may be imprecise.
4. **Dynamic imports not tracked** — the import tracker uses regex and only follows static `import` statements. `import()` expressions are not traced.
5. **CSS-in-JS not supported** — only `.css` files processed by Vite's transform pipeline. styled-components, emotion, etc. are JavaScript, not CSS files.

## Conventions

- TypeScript with `.ts` extensions in imports
- ESM throughout (type: "module")
- pnpm workspaces for monorepo
- Double quotes (oxfmt default)
- No `getComputedStyle` in tests — use screenshot comparison
