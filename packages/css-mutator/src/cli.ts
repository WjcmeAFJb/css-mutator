#!/usr/bin/env node

import { resolve } from "node:path";
import { runCssMutationTesting } from "./orchestrator.ts";
import { generateCssMutants } from "./css-mutant-generator.ts";
import { getMutatorNames } from "./mutators/index.ts";
import type { CssMutationRunOptions } from "./types.ts";

const cliArgs = process.argv.slice(2);

if (cliArgs.includes("--help") || cliArgs.includes("-h")) {
  printHelp();
  process.exit(0);
}

if (cliArgs.includes("--list-mutators")) {
  console.log("\nAvailable CSS Mutators:");
  console.log("=".repeat(40));
  for (const name of getMutatorNames()) {
    console.log(`  - ${name}`);
  }
  console.log("");
  process.exit(0);
}

async function main(): Promise<void> {
  if (cliArgs.includes("--dry-run")) {
    const options = parseArgs(cliArgs);
    const mutants = await generateCssMutants(options);
    console.log(`\nFound ${mutants.length} potential CSS mutations:\n`);
    for (const mutant of mutants) {
      console.log(`  [${mutant.mutatorName}] ${mutant.description}`);
    }
    console.log(`\nTotal: ${mutants.length} mutants`);
  } else {
    const options = parseArgs(cliArgs);
    const summary = await runCssMutationTesting(options);
    process.exitCode = summary.totals.survived > 0 ? 1 : 0;
  }
}

void main();

function requireArg(flag: string, value: string | undefined): string {
  if (value === undefined) {
    console.error(`Missing value for ${flag}`);
    process.exit(1);
  }
  return value;
}

function parseReporters(value: string): ("html" | "json" | "console")[] {
  const valid = new Set(["html", "json", "console"]);
  return value.split(",").filter((r): r is "html" | "json" | "console" => valid.has(r));
}

function parseArgs(args: string[]): CssMutationRunOptions {
  const options: CssMutationRunOptions = {
    files: ["src/**/*.css"],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--files":
      case "-f":
        options.files = requireArg(arg, args[i + 1]).split(",");
        i++;
        break;
      case "--vitest-config":
        options.vitestConfig = requireArg(arg, args[i + 1]);
        i++;
        break;
      case "--timeout":
      case "-t":
        options.timeout = parseInt(requireArg(arg, args[i + 1]), 10);
        i++;
        break;
      case "--concurrency":
      case "-c":
        options.concurrency = parseInt(requireArg(arg, args[i + 1]), 10);
        i++;
        break;
      case "--report-dir":
        options.reportDir = requireArg(arg, args[i + 1]);
        i++;
        break;
      case "--reporters":
        options.reporters = parseReporters(requireArg(arg, args[i + 1]));
        i++;
        break;
      case "--mutators":
        options.mutators = requireArg(arg, args[i + 1]).split(",");
        i++;
        break;
      case "--exclude-mutators":
        options.excludeMutators = requireArg(arg, args[i + 1]).split(",");
        i++;
        break;
      case "--exclude-selectors":
        options.excludeSelectors = requireArg(arg, args[i + 1]).split(",");
        i++;
        break;
      case "--cwd":
        options.cwd = resolve(requireArg(arg, args[i + 1]));
        i++;
        break;
      case "--no-import-tracking":
        options.importTracking = false;
        break;
      case "--test-patterns":
        options.testPatterns = requireArg(arg, args[i + 1]).split(",");
        i++;
        break;
      case "--no-server-mode":
        options.serverMode = false;
        break;
      case "--no-incremental":
        options.incremental = false;
        break;
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
css-mutate — CSS Mutation Testing for Vite + Vitest

USAGE:
  css-mutate [options]

OPTIONS:
  --files, -f <patterns>     Comma-separated glob patterns for CSS files
                             (default: "src/**/*.css")
  --vitest-config <path>     Path to vitest config file
  --timeout, -t <ms>         Timeout per mutant test run (default: 30000)
  --concurrency, -c <n>      Number of concurrent test runs (default: 1)
  --report-dir <path>        Output directory for reports (default: reports/css-mutation)
  --reporters <types>        Comma-separated reporter types: html,json,console
  --mutators <names>         Comma-separated mutator names to include
  --exclude-mutators <names> Comma-separated mutator names to exclude
  --exclude-selectors <sel>  Comma-separated selectors to exclude from mutation
  --cwd <path>               Working directory
  --no-import-tracking       Run all tests for every mutant (disable import tracking)
  --test-patterns <patterns> Comma-separated globs for test files (for import tracking)
  --no-server-mode           Spawn a new vitest process per mutant (slower)
  --no-incremental           Don't reuse results from previous runs
  --dry-run                  List mutations without running tests
  --list-mutators            List all available mutator operators
  --help, -h                 Show this help message

EXAMPLES:
  # Run with defaults
  css-mutate

  # Target specific CSS files
  css-mutate --files "src/**/*.module.css"

  # Only test color mutations
  css-mutate --mutators ColorMutator

  # Preview mutations without running tests
  css-mutate --dry-run

  # Custom vitest config for browser mode
  css-mutate --vitest-config vitest.browser.config.ts
`);
}
