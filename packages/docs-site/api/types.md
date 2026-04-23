# Types

All TypeScript types are exported from the main package.

```ts
import type { CssMutant, CssMutantResult, MutantStatus, ... } from 'css-mutator';
```

## Core Types

### `CssMutant`

A single CSS mutation.

```ts
interface CssMutant {
  id: string;
  mutatorName: string;
  fileName: string;
  selector: string;
  property: string;
  original: string;
  replacement: string;
  range: [number, number];
  location: CssLocation;
  description: string;
}
```

### `CssMutantResult`

A mutant with its test result.

```ts
interface CssMutantResult extends CssMutant {
  status: MutantStatus;
  killedBy: string[];
  coveredBy: string[];
  duration: number;
}
```

### `MutantStatus`

```ts
type MutantStatus = "Killed" | "Survived" | "Timeout" | "RuntimeError" | "NoCoverage";
```

### `CssLocation`

```ts
interface CssLocation {
  start: { line: number; column: number; offset: number };
  end: { line: number; column: number; offset: number };
}
```

## Configuration Types

### `CssMutatorOptions`

```ts
interface CssMutatorOptions {
  files: string[];
  cwd?: string;
  mutators?: string[];
  excludeMutators?: string[];
  excludeSelectors?: string[];
}
```

### `CssMutationRunOptions`

Extends `CssMutatorOptions` with runtime options.

```ts
interface CssMutationRunOptions extends CssMutatorOptions {
  vitestConfig?: string;
  timeout?: number;
  concurrency?: number;
  reportDir?: string;
  reporters?: ("html" | "json" | "console")[];
}
```

## Report Types

### `MutationTestingSummary`

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

### `CssCoverageReport`

```ts
interface CssCoverageReport {
  entries: CssCoverageEntry[];
  summary: {
    totalRules: number;
    coveredRules: number;
    coveragePercentage: number;
  };
}

interface CssCoverageEntry {
  fileName: string;
  selector: string;
  property: string;
  coveredBy: string[];
  covered: boolean;
}
```

## Operator Types

### `CssMutatorOperator`

Interface for mutation operators.

```ts
interface CssMutatorOperator {
  readonly name: string;
  readonly description: string;
  readonly targetProperties: string[];
  mutate(property: string, value: string): string[];
}
```
