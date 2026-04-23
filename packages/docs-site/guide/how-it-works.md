# How It Works

CSS mutation testing follows a pipeline of five stages: **Scan**, **Track**,
**Group**, **Test**, and **Report**.

## Pipeline Overview

```
┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐
│  SCAN  │──▶│ TRACK  │──▶│ GROUP  │──▶│  TEST  │──▶│ REPORT │
│        │   │        │   │        │   │        │   │        │
│ Parse  │   │ Map    │   │ Pick   │   │ Run    │   │ HTML / │
│ CSS    │   │ CSS →  │   │ paral- │   │ vitest │   │ JSON / │
│ props  │   │ tests  │   │ lel    │   │ per    │   │ Console│
│        │   │        │   │ groups │   │ mutant │   │        │
└────────┘   └────────┘   └────────┘   └────────┘   └────────┘
```

## Stage 1: Scan

The CSS mutant generator uses [PostCSS](https://postcss.org/) to parse your CSS
files into an AST. It walks every declaration (`property: value`) and records:

- The **selector** (e.g., `.modal-overlay`)
- The **property** (e.g., `z-index`)
- The **value** (e.g., `10`)
- The **byte range** in the source file (for precise replacement)

Each declaration is passed to the relevant **mutation operators**. An operator
inspects the property and value, then returns zero or more replacement values:

```
Input:   z-index: 10
Output:  z-index: -1   (ZIndexMutator)
         z-index: 0    (ZIndexMutator)
```

Each replacement becomes a **mutant** — a uniquely identified potential CSS
change with a byte-range in the source file.

## Stage 2: Track

The import tracker statically analyses your project's imports (regex-based, no
babel dependency) and builds a map `cssFile → testFiles[]`. This means a mutant
in `Button.module.css` is only ever evaluated against the tests that transitively
import it, not your entire suite.

## Stage 3: Group

`buildParallelGroups()` uses graph coloring to identify CSS files whose test
sets are disjoint, and schedules them into parallel groups. Each group gets its
own vitest instance, so groups run concurrently. Files that share tests must
live in the same group, to prevent one mutation from leaking into another.

## Stage 4: Test

There are two modes for executing mutants:

### Server mode (default)

The orchestrator starts a **long-lived vitest instance per group** using
vitest's programmatic API (`vitest/node`). The browser stays open across
mutants, which is where most of the speed comes from.

For each mutant:

1. Write the mutated CSS to disk (overwriting the original)
2. `vitest.invalidateFile()` + `project.browser.vite.reloadModule()` push the
   change to the browser via HMR — no file watcher delay
3. `rerunTestSpecifications()` re-runs only the tests that cover this CSS file
4. Check `testModules` for failures → `Killed` or `Survived`
5. Restore the original CSS

A timeout + `vitest.cancelCurrentRun()` catches stuck runs (for example,
`display: none` making `toBeVisible()` retry for 15s) without tying up the
rest of the group.

### Process mode (`--no-server-mode`)

Spawns `npx vitest run` per mutant. Uses the Vite plugin to apply mutations
in-memory via a shared state file. Simpler, but ~2× slower because every
mutant pays a cold-start cost.

## Stage 5: Report

Results are aggregated into a summary:

- **Killed**: Tests caught the mutation (good)
- **Survived**: Tests did not catch the mutation (needs more tests)
- **Timeout**: Test run exceeded the time limit
- **No Coverage**: No tests exercise the mutated CSS

The HTML reporter shows mutation annotations directly on your CSS source:

```css
.overlay {
  position: fixed; /* 2 mutants: killed, killed */
  z-index: 10; /* 2 mutants: killed, SURVIVED → z-index: 9999 */
  background: rgba(0, 0, 0, 0.5); /* 2 mutants: killed, killed */
}
```

## Why Server Mode Writes Mutations to Disk

We initially explored an in-memory Vite plugin approach for server mode. It
doesn't work: plugins added via `createVitest({ plugins: [...] })` only
register on the **main** Vite server, not the browser's Vite server. The
browser's Vite server reads CSS from disk. So disk writes + an HMR reload is
the only approach that works reliably in browser mode.

Process mode uses the plugin because spawned vitest runs have a different Vite
lifecycle and the plugin attaches to the right server.

## Incremental Runs

Results are cached in `.css-mutator-cache/`:

- **`statuses.json`** — previous mutant results, keyed by
  `file:line:property:old->new`
- **`killers.json`** — the test that killed each mutant last time, so the
  orchestrator tries it first on the next run

Cache entries are invalidated when the CSS file **or any test file that
imports it** changes — so editing a test correctly invalidates just the
mutants covered by that test.
