import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { applyCssMutation } from "./css-parser.ts";
import type { CssMutant } from "./types.ts";

/**
 * State file path for communicating the active mutant between
 * the orchestrator and the Vite dev server.
 */
const DEFAULT_STATE_DIR = resolve(process.cwd(), ".css-mutator-tmp");

export interface CssMutationVitePluginOptions {
  /** All CSS mutants generated for this run. */
  mutants: CssMutant[];
  /** Directory for state files. */
  stateDir?: string;
}

/**
 * Vite plugin that intercepts CSS file loading and applies the active mutation.
 *
 * The orchestrator writes the active mutant ID to a state file.
 * This plugin reads it on each CSS transform and applies the mutation if it
 * matches the file being loaded.
 *
 * Usage in vite.config.ts / vitest.config.ts:
 * ```ts
 * import { cssMutationVitePlugin } from 'css-mutator/vite-plugin';
 *
 * export default defineConfig({
 *   plugins: [cssMutationVitePlugin({ mutants })],
 * });
 * ```
 */
export function cssMutationVitePlugin(options: CssMutationVitePluginOptions) {
  const stateDir = options.stateDir ?? DEFAULT_STATE_DIR;
  const stateFile = resolve(stateDir, "active-mutant.json");

  // Build a lookup: fileName → mutant[]
  const mutantsByFile = new Map<string, CssMutant[]>();
  for (const mutant of options.mutants) {
    const normalized = resolve(mutant.fileName);
    if (!mutantsByFile.has(normalized)) {
      mutantsByFile.set(normalized, []);
    }
    mutantsByFile.get(normalized)!.push(mutant);
  }

  return {
    name: "css-mutator",
    enforce: "pre" as const,

    transform(_code: string, id: string) {
      // Strip query parameters (Vite adds ?used, ?direct, etc.)
      const cleanId = id.split("?")[0]!;

      // Only process CSS files
      if (!cleanId.endsWith(".css")) return null;
      const normalizedId = resolve(cleanId);

      // Check if this file has any mutants
      if (!mutantsByFile.has(normalizedId)) return null;

      // Read the active mutant ID
      const activeMutant = readActiveMutant(stateFile);
      if (!activeMutant) return null;

      // Find the mutant
      const fileMutants = mutantsByFile.get(normalizedId)!;
      const mutant = fileMutants.find((m) => m.id === activeMutant);
      if (!mutant) return null;

      // Apply the mutation
      // Read the original source from disk (not the already-transformed code)
      const originalSource = readFileSync(cleanId, "utf-8");
      const mutatedSource = applyCssMutation(originalSource, mutant.range, mutant.replacement);

      return {
        code: mutatedSource,
        map: null, // TODO: generate proper source map
      };
    },
  };
}

/**
 * Set the active mutant ID. Called by the orchestrator before each test run.
 */
export function setActiveMutant(mutantId: string | null, stateDir?: string): void {
  const dir = stateDir ?? DEFAULT_STATE_DIR;
  const stateFile = resolve(dir, "active-mutant.json");

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  if (mutantId === null) {
    writeFileSync(stateFile, JSON.stringify({ activeMutant: null }));
  } else {
    writeFileSync(stateFile, JSON.stringify({ activeMutant: mutantId }));
  }
}

/**
 * Read the currently active mutant ID.
 */
function readActiveMutant(stateFile: string): string | null {
  try {
    if (!existsSync(stateFile)) return null;
    const data = JSON.parse(readFileSync(stateFile, "utf-8"));
    return data.activeMutant ?? null;
  } catch {
    return null;
  }
}

export default cssMutationVitePlugin;
