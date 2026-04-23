import { glob } from "glob";
import { parseCss, parseCssFile } from "./css-parser.ts";
import { createAllMutators } from "./mutators/index.ts";
import type { CssMutant, CssMutatorOperator, CssMutatorOptions } from "./types.ts";

/**
 * Scan CSS files and generate all possible mutants.
 */
export async function generateCssMutants(options: CssMutatorOptions): Promise<CssMutant[]> {
  const cwd = options.cwd ?? process.cwd();
  const allMutators = createAllMutators();

  // Filter mutators based on options
  const mutators = filterMutators(allMutators, options);

  // Find CSS files
  const files = await findCssFiles(options.files, cwd);

  // Generate mutants from each file
  const mutants: CssMutant[] = [];
  let idCounter = 0;

  for (const file of files) {
    const parsed = parseCssFile(file);

    for (const decl of parsed.declarations) {
      // Check if this selector is excluded
      if (isSelectorExcluded(decl.selector, options.excludeSelectors)) {
        continue;
      }

      for (const mutator of mutators) {
        if (!mutator.handles(decl.property)) continue;

        const replacements = mutator.mutate(decl.property, decl.value);

        for (const replacement of replacements) {
          mutants.push({
            id: `css-${idCounter++}`,
            mutatorName: mutator.name,
            fileName: file,
            selector: decl.selector,
            property: decl.property,
            original: decl.value,
            replacement,
            range: decl.range,
            location: decl.location,
            description: `${mutator.name}: ${decl.selector} { ${decl.property}: ${decl.value} → ${replacement} }`,
          });
        }
      }
    }
  }

  return mutants;
}

/**
 * Generate mutants from a CSS string (for testing/programmatic use).
 */
export function generateCssMutantsFromSource(
  source: string,
  fileName: string,
  options?: Pick<CssMutatorOptions, "mutators" | "excludeMutators" | "excludeSelectors">,
): CssMutant[] {
  const allMutators = createAllMutators();
  const mutators = filterMutators(allMutators, options ?? {});

  const parsed = parseCss(source, fileName);

  const mutants: CssMutant[] = [];
  let idCounter = 0;

  for (const decl of parsed.declarations) {
    if (isSelectorExcluded(decl.selector, options?.excludeSelectors)) continue;

    for (const mutator of mutators) {
      if (!mutator.handles(decl.property)) continue;

      const replacements = mutator.mutate(decl.property, decl.value);

      for (const replacement of replacements) {
        mutants.push({
          id: `css-${idCounter++}`,
          mutatorName: mutator.name,
          fileName,
          selector: decl.selector,
          property: decl.property,
          original: decl.value,
          replacement,
          range: decl.range,
          location: decl.location,
          description: `${mutator.name}: ${decl.selector} { ${decl.property}: ${decl.value} → ${replacement} }`,
        });
      }
    }
  }

  return mutants;
}

async function findCssFiles(patterns: string[], cwd: string): Promise<string[]> {
  const files: string[] = [];
  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      cwd,
      absolute: true,
      ignore: ["**/node_modules/**", "**/dist/**"],
    });
    files.push(...matches);
  }
  // Deduplicate and sort for deterministic output
  const unique = [...new Set(files)];
  unique.sort();
  return unique;
}

function filterMutators(
  mutators: CssMutatorOperator[],
  options: Pick<CssMutatorOptions, "mutators" | "excludeMutators">,
): CssMutatorOperator[] {
  let result = mutators;

  if (options.mutators?.length) {
    result = result.filter((m) => options.mutators!.includes(m.name));
  }

  if (options.excludeMutators?.length) {
    result = result.filter((m) => !options.excludeMutators!.includes(m.name));
  }

  return result;
}

function isSelectorExcluded(selector: string, excludePatterns?: string[]): boolean {
  if (!excludePatterns?.length) return false;

  return excludePatterns.some((pattern) => {
    if (pattern.startsWith("/") && pattern.endsWith("/")) {
      const regex = new RegExp(pattern.slice(1, -1));
      return regex.test(selector);
    }
    return selector.includes(pattern);
  });
}
