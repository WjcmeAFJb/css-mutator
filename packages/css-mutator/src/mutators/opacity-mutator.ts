import { BaseCssMutator } from "./base-mutator.ts";

export class OpacityMutator extends BaseCssMutator {
  readonly name = "OpacityMutator";
  readonly description = "Mutates CSS opacity values";
  readonly targetProperties = ["opacity"];

  mutate(_property: string, value: string): string[] {
    const num = parseFloat(value.trim());
    if (isNaN(num)) return [];

    const results: string[] = [];

    if (num === 1) {
      results.push("0");
      results.push("0.5");
    } else if (num === 0) {
      results.push("1");
    } else {
      // Partial opacity — try 0 and 1
      results.push("0");
      results.push("1");
    }

    return results;
  }
}
