# Mutation Pipeline

The mutation testing pipeline consists of five phases, each with clear inputs and outputs: **Discovery**, **Mutation Generation**, **Import Tracking & Parallel Grouping**, **Execution**, and **Reporting**.

## Phase 1: Discovery

**Input**: Glob patterns for CSS files  
**Output**: Parsed CSS declarations with source positions

```ts
// 1. Find files matching patterns
const files = await glob("src/**/*.module.css");

// 2. Parse each file with PostCSS
for (const file of files) {
  const parsed = parseCssFile(file);
  // parsed.declarations = [
  //   { selector: '.btn', property: 'color', value: 'red', range: [15, 18], ... },
  //   { selector: '.btn', property: 'display', value: 'flex', range: [35, 39], ... },
  //   ...
  // ]
}
```

### Value Position Tracking

CSS Mutator tracks the byte offset of each declaration's **value** (not the property or selector). This is critical for precise replacement:

```css
.button { color: red; display: flex; }
                 ^^^            ^^^^
                 [17,20]        [37,41]
```

The range calculation:

1. PostCSS gives us the declaration's start position (line/column)
2. We find the colon after the property name
3. We skip whitespace after the colon
4. The value starts there and ends at `start + value.length`

## Phase 2: Mutation Generation

**Input**: Parsed declarations  
**Output**: `CssMutant[]`

Each declaration is passed to all 12 mutator operators. An operator:

1. Checks if it handles the property (e.g., `ColorMutator` handles `color`)
2. Analyzes the value
3. Returns zero or more replacement strings

```ts
const colorMutator = new ColorMutator();
colorMutator.handles("color"); // true
colorMutator.handles("display"); // false
colorMutator.mutate("color", "red"); // ['blue', 'transparent']
```

### Operator Design

Each operator follows the same interface:

```ts
interface CssMutatorOperator {
  readonly name: string;
  readonly targetProperties: string[];
  mutate(property: string, value: string): string[];
}
```

The `targetProperties` array supports wildcards: `border-*-color` matches `border-top-color`, `border-bottom-color`, etc.

### Mutation Count

A typical CSS file generates many mutants:

| CSS Properties            | ~Mutants per Property | Example File                              |
| ------------------------- | --------------------- | ----------------------------------------- |
| Color values              | 2-3                   | 40-line component CSS → ~15 color mutants |
| Layout (display, flex)    | 2-3                   | Grid layout → ~20 layout mutants          |
| Spacing (margin, padding) | 1-2                   | Spacing-heavy → ~10 spacing mutants       |
| Typography                | 1-2                   | Typography → ~8 font mutants              |

A 100-line CSS module might generate 40-80 mutants across all operators.

## Phase 3: Import Tracking & Parallel Grouping

**Input**: CSS files + test glob patterns
**Output**: `Map<cssFile, testFiles[]>` and a list of disjoint parallel groups

The import tracker walks each test file's static `import` graph (regex-based)
and records every relative CSS file it reaches. Bare specifiers (`react`,
`vitest`) are skipped; only relative imports are followed. Dynamic `import()`
expressions are **not** traced — that's a known limitation.

```
extractImports(source)         → ["./Button.tsx", "vitest"]
resolveImport("./Button", dir) → /abs/path/Button.tsx
collectCssDependencies(file)   → Set<"/abs/path/Button.module.css">
buildImportMap(patterns, cwd)  → Map<cssPath, testPaths[]>
```

Once we know which tests cover which CSS files, `buildParallelGroups()` uses
graph coloring to pack CSS files with **disjoint** test sets into groups. Each
group runs in its own vitest instance, so they execute concurrently without
stepping on each other's mutations.

## Phase 4: Execution

**Input**: `CssMutant[]`, vitest config path  
**Output**: `CssMutantResult[]`

### Baseline Validation

Before testing mutants, the orchestrator runs tests with no active mutation to verify they pass:

```ts
setActiveMutant(null);
const baselinePassed = runTests(vitestConfig, timeout);
if (!baselinePassed) {
  throw new Error("Fix your tests before running mutation testing");
}
```

### Mutant Activation — Server Mode (default)

The orchestrator keeps one long-lived vitest instance per parallel group. For
each mutant:

```ts
for (const mutant of mutants) {
  writeFileSync(mutant.fileName, mutate(originalSource, mutant));
  vitest.invalidateFile(mutant.fileName);
  await invalidateAndReload(vitest, mutant.fileName); // HMR push to browser

  try {
    const run = await vitest.rerunTestSpecifications(specsForFile);
    result.status = anyFailed(run.testModules) ? "Killed" : "Survived";
  } catch (e) {
    result.status = e.message === "TIMEOUT" ? "Timeout" : "RuntimeError";
  } finally {
    writeFileSync(mutant.fileName, originalSource); // restore
  }
}
```

`reloadModule()` is essential — without it, the browser keeps the old CSS
cached even though the disk contents changed. A timeout +
`vitest.cancelCurrentRun("test-failure")` guards against stuck runs (e.g.
`display: none` making Playwright's `toBeVisible()` retry for 15s).

### Mutant Activation — Process Mode (`--no-server-mode`)

Process mode uses the Vite plugin for in-memory interception. Per mutant the
orchestrator writes the mutant id to a state file, spawns `npx vitest run`
(with `bail: 1`), and the plugin's `transform` hook rewrites the matching CSS:

```ts
transform(code, id) {
  if (!id.endsWith('.css')) return null;
  const activeId = readActiveMutant();
  if (!activeId) return null;

  const mutant = fileMutants.find(m => m.id === activeId);
  if (!mutant) return null;

  // Read original CSS from disk (not the already-transformed code)
  const original = readFileSync(file, 'utf-8');
  return (
    original.slice(0, mutant.range[0]) +
    mutant.replacement +
    original.slice(mutant.range[1])
  );
}
```

Process mode is roughly 2× slower than server mode because every mutant pays
the vitest + browser cold-start cost.

## Phase 5: Reporting

**Input**: `CssMutantResult[]`  
**Output**: Console summary, HTML report, JSON report

### Console Report

```
============================================================
  CSS Mutation Testing Results
============================================================
  Total mutants:    47
  Killed:           39 ✅
  Survived:         8  ❌
  Mutation Score:   82.98%
  Duration:         34.2s
============================================================

  📁 styles/modal.module.css — 90.0% (9/10)
     ❌ L8: .overlay { z-index: 10 → 9999 }

  📁 styles/card.module.css — 75.0% (6/8)
     ❌ L23: .card { border: 1px solid #fefefe → none }
     ❌ L24: .card { border: 1px solid #fefefe → 1px solid black }
```

### HTML Report

The HTML report shows CSS source files with per-line mutation annotations. Each line with mutations gets:

- A colored gutter (green = all killed, red = some survived)
- A count badge
- Hover tooltip with mutation details

Below the source, a table lists every mutation with its status, timing, and description.

### JSON Report

The JSON report follows the `mutation-testing-report-schema` format:

```json
{
  "$schema": "https://git.io/mutation-testing-schema",
  "schemaVersion": "2",
  "files": {
    "src/styles/modal.module.css": {
      "language": "css",
      "source": "...",
      "mutants": [
        {
          "id": "css-0",
          "mutatorName": "ZIndexMutator",
          "status": "Killed",
          "location": { "start": { "line": 8, "column": 12 }, "end": { "line": 8, "column": 14 } }
        }
      ]
    }
  }
}
```
