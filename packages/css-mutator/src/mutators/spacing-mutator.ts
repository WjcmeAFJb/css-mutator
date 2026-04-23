import { BaseCssMutator } from "./base-mutator.ts";

const SPACING_PATTERN = /^(-?\d+(?:\.\d+)?)(px|rem|em|vh|vw|%)$/;

export class SpacingMutator extends BaseCssMutator {
  readonly name = "SpacingMutator";
  readonly description = "Mutates CSS margin and padding values";
  readonly targetProperties = [
    "margin",
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",
    "margin-block",
    "margin-inline",
    "margin-block-start",
    "margin-block-end",
    "margin-inline-start",
    "margin-inline-end",
    "padding",
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",
    "padding-block",
    "padding-inline",
    "padding-block-start",
    "padding-block-end",
    "padding-inline-start",
    "padding-inline-end",
    "gap",
    "row-gap",
    "column-gap",
  ];

  mutate(property: string, value: string): string[] {
    const trimmed = value.trim().toLowerCase();

    // Auto margin (commonly used for centering)
    if (trimmed === "auto") {
      return ["0"];
    }

    // Single value
    const match = trimmed.match(SPACING_PATTERN);
    if (match) {
      const num = parseFloat(match[1]!);
      const unit = match[2]!;
      const results: string[] = [];

      if (num !== 0) {
        results.push(`0${unit}`);
      }

      if (num >= 0 && !property.startsWith("padding")) {
        // Margins can be negative, padding cannot
        results.push(`${num > 0 ? -num : 10}${unit}`);
      } else if (num === 0) {
        results.push(`16${unit}`);
      }

      return results;
    }

    // Multi-value shorthand (e.g., "10px 20px" or "10px 20px 30px 40px")
    const parts = trimmed.split(/\s+/);
    if (
      parts.length > 1 &&
      parts.every((p) => SPACING_PATTERN.test(p) || p === "auto" || p === "0")
    ) {
      // Zero out all values
      return ["0"];
    }

    return [];
  }
}
