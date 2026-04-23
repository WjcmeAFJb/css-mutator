// Core types
export type {
  CssMutant,
  CssMutantResult,
  CssMutatorOperator,
  CssMutatorOptions,
  CssMutationRunOptions,
  CssLocation,
  MutantStatus,
  MutationTestingSummary,
  CssRuleCoverage,
  CssCoverageReport,
} from "./types.ts";

// CSS parsing
export { parseCss, parseCssFile, applyCssMutation } from "./css-parser.ts";

// Mutant generation
export { generateCssMutants } from "./css-mutant-generator.ts";

// Mutator operators
export {
  createAllMutators,
  getMutatorByName,
  getMutatorNames,
  BaseCssMutator,
  ColorMutator,
  DisplayMutator,
  SizeMutator,
  PositionMutator,
  OpacityMutator,
  ZIndexMutator,
  BorderMutator,
  FontMutator,
  SpacingMutator,
  VisibilityMutator,
  FlexMutator,
  GridMutator,
} from "./mutators/index.ts";

// Import tracking
export {
  buildImportMap,
  extractImports,
  resolveImport,
  collectCssDependencies,
} from "./import-tracker.ts";

// Mutation cache
export { loadCache, saveCache, mutantKey, hashFile } from "./mutation-cache.ts";

// Vite plugin
export { cssMutationVitePlugin, setActiveMutant } from "./vite-plugin.ts";

// Orchestrator
export { runCssMutationTesting } from "./orchestrator.ts";

// Reporter
export {
  generateHtmlReport,
  generateJsonReport,
  printConsoleReport,
} from "./reporter/css-html-reporter.ts";
