# Orchestrator API

## `runCssMutationTesting(options)`

Runs the full CSS mutation testing pipeline: scan, mutate, test, report.

```ts
import { runCssMutationTesting } from "css-mutator";
```

### Options

```ts
interface CssMutationRunOptions {
  /** Glob patterns for CSS files to mutate. */
  files: string[];
  /** Working directory (default: cwd). */
  cwd?: string;
  /** Which mutators to enable (default: all). */
  mutators?: string[];
  /** Mutators to exclude. */
  excludeMutators?: string[];
  /** Selectors to exclude. */
  excludeSelectors?: string[];
  /** Vitest config path. */
  vitestConfig?: string;
  /** Timeout per mutant test run in ms (default: 30000). */
  timeout?: number;
  /** Number of concurrent test runs (default: 1). */
  concurrency?: number;
  /** Output directory for reports. */
  reportDir?: string;
  /** Reporter types. */
  reporters?: ("html" | "json" | "console")[];
}
```

### Return Value

```ts
interface MutationTestingSummary {
  files: Record<string, CssMutantResult[]>;
  totals: {
    mutants: number;
    killed: number;
    survived: number;
    timeout: number;
    noCoverage: number;
    runtimeError: number;
    mutationScore: number;
    mutationScoreBasedOnCoveredCode: number;
  };
  timestamp: string;
  duration: number;
}
```

### Example

```ts
const summary = await runCssMutationTesting({
  files: ["src/**/*.module.css"],
  vitestConfig: "vitest.browser.config.ts",
  timeout: 60000,
  reporters: ["console", "html"],
  excludeMutators: ["GridMutator"],
});

if (summary.totals.mutationScore < 80) {
  console.error("Mutation score below threshold!");
  process.exit(1);
}
```

## `generateCssMutants(options)`

Generates mutants without running tests. Useful for dry runs and custom orchestration.

```ts
import { generateCssMutants } from "css-mutator";

const mutants = await generateCssMutants({
  files: ["src/**/*.css"],
  mutators: ["ColorMutator"],
});
```
