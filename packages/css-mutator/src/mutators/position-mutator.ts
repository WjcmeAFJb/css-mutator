import { BaseCssMutator } from "./base-mutator.ts";

const POSITION_SWAPS: Record<string, string[]> = {
  static: ["relative", "absolute"],
  relative: ["static", "absolute"],
  absolute: ["static", "relative"],
  fixed: ["static", "absolute"],
  sticky: ["static", "relative"],
};

const OFFSET_PATTERN = /^(-?\d+(?:\.\d+)?)(px|rem|em|vh|vw|%)$/;

export class PositionMutator extends BaseCssMutator {
  readonly name = "PositionMutator";
  readonly description = "Mutates CSS position and offset properties";
  readonly targetProperties = [
    "position",
    "top",
    "right",
    "bottom",
    "left",
    "inset",
    "inset-block",
    "inset-inline",
  ];

  mutate(property: string, value: string): string[] {
    const trimmed = value.trim().toLowerCase();

    if (property === "position") {
      return POSITION_SWAPS[trimmed] ?? [];
    }

    // Offset properties (top, right, bottom, left)
    if (trimmed === "auto") {
      return ["0px"];
    }

    const match = trimmed.match(OFFSET_PATTERN);
    if (match) {
      const num = parseFloat(match[1]!);
      const unit = match[2]!;
      const results: string[] = [];

      if (num !== 0) {
        results.push(`0${unit}`);
        results.push(`${-num}${unit}`);
      } else {
        results.push(`10${unit}`);
      }

      return results;
    }

    return [];
  }
}
