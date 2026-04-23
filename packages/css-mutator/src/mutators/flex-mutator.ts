import { BaseCssMutator } from "./base-mutator.ts";

const DIRECTION_SWAPS: Record<string, string[]> = {
  row: ["column", "row-reverse"],
  "row-reverse": ["row", "column-reverse"],
  column: ["row", "column-reverse"],
  "column-reverse": ["column", "row-reverse"],
};

const WRAP_SWAPS: Record<string, string[]> = {
  nowrap: ["wrap"],
  wrap: ["nowrap"],
  "wrap-reverse": ["nowrap", "wrap"],
};

const ALIGN_SWAPS: Record<string, string[]> = {
  "flex-start": ["flex-end", "center"],
  "flex-end": ["flex-start", "center"],
  center: ["flex-start", "flex-end"],
  stretch: ["flex-start", "center"],
  baseline: ["center", "flex-start"],
  "space-between": ["center", "flex-start"],
  "space-around": ["center", "space-between"],
  "space-evenly": ["center", "space-between"],
  start: ["end", "center"],
  end: ["start", "center"],
};

export class FlexMutator extends BaseCssMutator {
  readonly name = "FlexMutator";
  readonly description = "Mutates CSS flexbox properties";
  readonly targetProperties = [
    "flex-direction",
    "flex-wrap",
    "flex-flow",
    "justify-content",
    "align-items",
    "align-self",
    "align-content",
    "flex-grow",
    "flex-shrink",
    "flex-basis",
    "order",
    "place-content",
    "place-items",
    "place-self",
  ];

  mutate(property: string, value: string): string[] {
    const trimmed = value.trim().toLowerCase();

    switch (property) {
      case "flex-direction":
        return DIRECTION_SWAPS[trimmed] ?? [];

      case "flex-wrap":
        return WRAP_SWAPS[trimmed] ?? [];

      case "flex-flow": {
        // flex-flow is shorthand for direction + wrap
        const parts = trimmed.split(/\s+/);
        if (parts.length === 2) {
          const dirSwaps = DIRECTION_SWAPS[parts[0]!];
          if (dirSwaps) return [dirSwaps[0] + " " + parts[1]!];
        }
        return [];
      }

      case "justify-content":
      case "align-items":
      case "align-self":
      case "align-content":
      case "place-content":
      case "place-items":
      case "place-self":
        return ALIGN_SWAPS[trimmed] ?? [];

      case "flex-grow":
      case "flex-shrink": {
        const num = parseFloat(trimmed);
        if (isNaN(num)) return [];
        if (num === 0) return ["1"];
        if (num === 1) return ["0"];
        return ["0", "1"];
      }

      case "flex-basis": {
        if (trimmed === "auto") return ["0", "100%"];
        if (trimmed === "0" || trimmed === "0px") return ["auto", "100%"];
        return ["0", "auto"];
      }

      case "order": {
        const n = parseInt(trimmed, 10);
        if (isNaN(n)) return [];
        if (n === 0) return ["-1", "1"];
        return ["0", `${-n}`];
      }

      default:
        return []; // unreachable — all target properties have cases
    }
  }
}
