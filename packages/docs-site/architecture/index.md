# Architecture Overview

CSS Mutator is structured as a monorepo with three packages:

```
css-mutator/
├── packages/
│   ├── css-mutator/     # Core library + Vite plugin + CLI
│   ├── demo-app/        # Demo Vite+React app with visual tests
│   └── docs-site/       # This documentation site (VitePress)
```

## Core Package Architecture

```
css-mutator
├── Mutation Operators     12 built-in CSS mutators
├── CSS Parser             PostCSS-based AST parsing
├── Mutant Generator       Scans CSS → produces CssMutant[]
├── Import Tracker         Maps CSS files to the tests that cover them
├── Vite Plugin            In-memory CSS interception (process mode)
├── Orchestrator           Runs mutation testing pipeline
├── Mutation Cache         Incremental runs + smart test ordering
├── HTML Reporter          Source-annotated coverage reports
└── CLI                    Command-line interface
```

## Design Principles

### 1. Two Execution Modes

**Server mode (default)** uses a long-lived vitest instance per parallel
group. Each mutant is applied by writing the mutated CSS to disk, then pushing
the change to the browser via HMR (`invalidateFile()` + `reloadModule()`). The
original CSS is always restored before moving on.

**Process mode (`--no-server-mode`)** spawns `npx vitest run` per mutant and
uses the Vite plugin for in-memory interception. Simpler but roughly 2× slower
because of cold starts.

Disk writes are required for server mode because plugins added via
`createVitest({ plugins })` only register on the main Vite server, not the
browser's — and the browser's Vite server reads CSS from disk.

### 2. PostCSS for Parsing

PostCSS provides a battle-tested CSS parser that handles:

- Standard CSS
- CSS Modules syntax (`composes`)
- Vendor prefixes
- Custom properties
- Media queries and at-rules

### 3. Byte-Range Mutations

Each mutant records the exact byte offset of the value it replaces. This enables:

- Precise, character-level replacements
- Correct source mapping
- Multiple mutations per file without interference

### 4. File-Based IPC (Process Mode)

In process mode, the orchestrator and the Vite plugin communicate through a
JSON state file in `.css-mutator-tmp/`:

```json
{ "activeMutant": "css-42" }
```

This is simpler and more reliable than:

- Environment variables (can't change mid-process)
- IPC sockets (complex, platform-dependent)
- In-memory state (works only in same process)

Server mode doesn't need this IPC — it writes the mutated CSS directly and
calls vitest's programmatic API to re-run tests.

### 5. Structured JSON Output

The JSON report follows the generic [mutation-testing-report-schema](https://github.com/mutation-testing/mutation-testing-elements), so the output can be consumed by any tooling that understands that schema.

## Component Interactions

```
                    ┌─────────────────────┐
                    │   CLI / runCssMutationTesting()  │
                    │   Entry Point       │
                    └─────────┬───────────┘
                              │
                    ┌─────────▼───────────┐
                    │   Orchestrator       │
                    │   (orchestrator.ts)  │
                    └─────────┬───────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
    ┌─────────▼─────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │ Mutant        │ │ Vite        │ │ Reporter    │
    │ Generator     │ │ Plugin      │ │             │
    │               │ │             │ │ - Console   │
    │ - CSS Parser  │ │ - transform │ │ - HTML      │
    │ - 12 Mutators │ │ - state mgmt│ │ - JSON      │
    └───────────────┘ └──────┬──────┘ └─────────────┘
                             │
                    ┌────────▼────────┐
                    │   Vitest        │
                    │   Browser Mode  │
                    │   + Playwright  │
                    └─────────────────┘
```

## Data Flow

### Mutation Generation

```
CSS File → PostCSS Parse → Walk Declarations → Match Mutators → Generate Replacements → CssMutant[]
```

Each `CssMutant` contains:

- **id**: Unique identifier (e.g., `css-42`)
- **mutatorName**: Which operator generated it
- **fileName**: Absolute path to the CSS file
- **selector**: The CSS selector context
- **property** / **original** / **replacement**: The mutation
- **range**: Byte offset `[start, end)` for the value
- **location**: Line/column for reporting

### Test Execution (Server Mode)

```
Start one vitest instance per parallel group (kept alive across mutants).

For each CssMutant:
  1. writeFileSync(cssFile, mutatedSource)           ← write mutation to disk
  2. vitest.invalidateFile(cssFile)
     + project.browser.vite.reloadModule(mod)        ← HMR push to browser
  3. vitest.rerunTestSpecifications(specsForCssFile) ← re-run covering tests
  4. Inspect testModules → Killed | Survived | Timeout | RuntimeError
  5. writeFileSync(cssFile, originalSource)          ← restore
```

### Test Execution (Process Mode)

```
For each CssMutant:
  1. setActiveMutant(mutant.id) → writes state file
  2. spawn `npx vitest run`     → starts Vite dev server
  3. Vite processes CSS → plugin reads state → applies mutation
  4. Tests run in the browser  → pass or fail
  5. Record result              → Killed | Survived | Timeout | RuntimeError
  6. setActiveMutant(null)
```

### Report Generation

```
CssMutantResult[] → Group by file → Read source → Annotate lines → Generate HTML/JSON
```

The HTML report renders CSS source with per-line mutation markers:

- Green gutter: all mutants on this line were killed
- Red gutter: some mutants survived
- Hover for mutation details
