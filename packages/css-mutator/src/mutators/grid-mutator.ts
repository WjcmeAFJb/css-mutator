import { BaseCssMutator } from "./base-mutator.ts";

export class GridMutator extends BaseCssMutator {
  readonly name = "GridMutator";
  readonly description = "Mutates CSS grid layout properties";
  readonly targetProperties = [
    "grid-template-columns",
    "grid-template-rows",
    "grid-column",
    "grid-row",
    "grid-auto-flow",
    "grid-auto-columns",
    "grid-auto-rows",
  ];

  mutate(property: string, value: string): string[] {
    const trimmed = value.trim().toLowerCase();

    switch (property) {
      case "grid-template-columns":
      case "grid-template-rows":
        return this.mutateTemplate(trimmed);

      case "grid-auto-flow": {
        const swaps: Record<string, string[]> = {
          row: ["column"],
          column: ["row"],
          "row dense": ["column dense", "row"],
          "column dense": ["row dense", "column"],
          dense: ["row"],
        };
        return swaps[trimmed] ?? [];
      }

      case "grid-column":
      case "grid-row":
        return this.mutateSpan(trimmed);

      case "grid-auto-columns":
      case "grid-auto-rows":
        if (trimmed === "auto") return ["min-content", "1fr"];
        if (trimmed === "min-content") return ["auto", "max-content"];
        if (trimmed === "max-content") return ["auto", "min-content"];
        return ["auto"];

      default:
        return [];
    }
  }

  private mutateTemplate(value: string): string[] {
    const results: string[] = [];

    // "repeat(3, 1fr)" → "repeat(3, 2fr)", "1fr"
    if (value.includes("repeat")) {
      results.push("1fr");
    }

    // Count columns/rows and reduce or change to single
    const parts = value.split(/\s+/);
    if (parts.length > 1) {
      results.push(parts[0]!); // Reduce to single column/row
    }

    if (value === "none") {
      results.push("1fr 1fr");
    } else if (!value.includes("none")) {
      results.push("none");
    }

    return results;
  }

  private mutateSpan(value: string): string[] {
    // "1 / 3" → "1 / 2", "span 2" → "span 1"
    if (value.includes("span")) {
      const spanMatch = value.match(/span\s+(\d+)/);
      if (spanMatch) {
        const n = parseInt(spanMatch[1]!, 10);
        if (n > 1) return [`span ${n - 1}`];
        return ["span 2"];
      }
    }

    if (value.includes("/")) {
      const parts = value.split("/").map((p) => p.trim());
      if (parts.length === 2) {
        return [`${parts[0]} / ${parts[0]}`]; // Collapse to single cell
      }
    }

    return [];
  }
}
