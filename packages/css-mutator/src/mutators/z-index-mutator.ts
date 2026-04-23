import { BaseCssMutator } from "./base-mutator.ts";

export class ZIndexMutator extends BaseCssMutator {
  readonly name = "ZIndexMutator";
  readonly description = "Mutates CSS z-index values";
  readonly targetProperties = ["z-index"];

  mutate(_property: string, value: string): string[] {
    const trimmed = value.trim().toLowerCase();

    if (trimmed === "auto") {
      return ["0", "-1", "9999"];
    }

    const num = parseInt(trimmed, 10);
    if (isNaN(num)) return [];

    const results: string[] = [];

    if (num > 0) {
      results.push("-1");
      results.push("0");
    } else if (num < 0) {
      results.push("0");
      results.push("9999");
    } else {
      // z-index: 0
      results.push("-1");
      results.push("9999");
    }

    return results;
  }
}
