/**
 * A location within a CSS source file.
 */
export interface CssLocation {
  start: { line: number; column: number; offset: number };
  end: { line: number; column: number; offset: number };
}

/**
 * A single CSS mutation — one property/value change in one file.
 */
export interface CssMutant {
  /** Unique identifier (scoped per run). */
  id: string;
  /** Which mutator generated this. */
  mutatorName: string;
  /** Absolute path to the CSS file. */
  fileName: string;
  /** The CSS selector containing the mutation. */
  selector: string;
  /** The CSS property being mutated. */
  property: string;
  /** Original property value. */
  original: string;
  /** Replacement value. */
  replacement: string;
  /** Byte range [start, end) in the original file. */
  range: [number, number];
  /** Line/column location. */
  location: CssLocation;
  /** Human-readable description. */
  description: string;
}

/**
 * Result of running tests against a single mutant.
 */
export type MutantStatus = "Killed" | "Survived" | "Timeout" | "RuntimeError" | "NoCoverage";

export interface CssMutantResult extends CssMutant {
  status: MutantStatus;
  /** Names of tests that killed this mutant. */
  killedBy: string[];
  /** Names of tests that covered this mutant's file/rule. */
  coveredBy: string[];
  /** Duration in ms. */
  duration: number;
}

/**
 * Options for the CSS mutant generator.
 */
export interface CssMutatorOptions {
  /** Glob patterns for CSS files to mutate. */
  files: string[];
  /** Working directory (defaults to cwd). */
  cwd?: string;
  /** Which mutators to enable (defaults to all). */
  mutators?: string[];
  /** Mutators to exclude. */
  excludeMutators?: string[];
  /** Glob patterns for CSS selectors to exclude from mutation. */
  excludeSelectors?: string[];
}

/**
 * Full run configuration.
 */
export interface CssMutationRunOptions extends CssMutatorOptions {
  /** Vitest config path. */
  vitestConfig?: string;
  /** Timeout per mutant test run in ms (default 30000). */
  timeout?: number;
  /** Number of concurrent mutant test runs (default 1). */
  concurrency?: number;
  /** Output directory for reports. */
  reportDir?: string;
  /** Reporter types to generate. */
  reporters?: ("html" | "json" | "console")[];
  /** Enable import-based test filtering (default: true). */
  importTracking?: boolean;
  /** Glob patterns for test files (used by import tracker). */
  testPatterns?: string[];
  /** Use vitest server mode for faster mutation testing (default: true). */
  serverMode?: boolean;
  /** Reuse results for unchanged CSS files from previous runs (default: true). */
  incremental?: boolean;
}

/**
 * Interface that all CSS mutator operators must implement.
 */
export interface CssMutatorOperator {
  /** Unique name for this mutator. */
  readonly name: string;
  /** Human-readable description of what this mutator does. */
  readonly description: string;
  /** CSS properties this mutator handles. */
  readonly targetProperties: string[];
  /**
   * Check if this mutator handles the given property.
   */
  handles(property: string): boolean;
  /**
   * Given a CSS property and its value, generate replacement values.
   * Return an empty array if no mutations apply.
   */
  mutate(property: string, value: string): string[];
}

/**
 * Summary of a mutation testing run.
 */
export interface MutationTestingSummary {
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
  cssCoverage?: CssCoverageReport;
  timestamp: string;
  duration: number;
}

/**
 * Per-rule CSS coverage from CDP CSS.startRuleUsageTracking.
 * Maps browser-generated selectors back to source CSS file lines.
 */
export interface CssRuleCoverage {
  /** Source CSS file path. */
  cssFile: string;
  /** Original selector in source (e.g. ".button", ".primary:hover"). */
  selector: string;
  /** Line number in source CSS file. */
  line: number;
  /** Whether the rule was matched by any DOM element. */
  used: boolean;
}

/**
 * CSS coverage for a single test case.
 */
export interface TestCaseCoverage {
  /** Test name (e.g. "primary button on hover"). */
  testName: string;
  /** CSS rules covered by this specific test. */
  rules: CssRuleCoverage[];
}

/**
 * CSS coverage per test file — which CSS rules were exercised.
 */
export interface TestFileCoverage {
  /** Test file path (relative). */
  testFile: string;
  /** Test names within this file. */
  testNames: string[];
  /** CSS rules covered by the whole file (aggregate). */
  rules: CssRuleCoverage[];
  /** Per-test-case breakdown. */
  perTestCase: TestCaseCoverage[];
}

/**
 * Complete CSS coverage report.
 */
export interface CssCoverageReport {
  /** Per-test-file breakdown. */
  perTestFile: TestFileCoverage[];
  /** Aggregate: all CSS rules with combined coverage. */
  aggregate: CssRuleCoverage[];
}
