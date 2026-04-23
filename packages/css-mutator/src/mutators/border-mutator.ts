import { BaseCssMutator } from "./base-mutator.ts";

const BORDER_STYLE_SWAPS: Record<string, string[]> = {
  solid: ["none", "dashed"],
  dashed: ["solid", "none"],
  dotted: ["solid", "none"],
  double: ["solid", "none"],
  none: ["1px solid black"],
  hidden: ["1px solid black"],
  groove: ["solid", "none"],
  ridge: ["solid", "none"],
  inset: ["solid", "none"],
  outset: ["solid", "none"],
};

const BORDER_SHORTHAND_PATTERN =
  /^(\d+(?:\.\d+)?)(px|rem|em)\s+(solid|dashed|dotted|double|groove|ridge|inset|outset)\s+(.+)$/i;
const BORDER_RADIUS_PATTERN = /^(\d+(?:\.\d+)?)(px|rem|em|%)$/;

export class BorderMutator extends BaseCssMutator {
  readonly name = "BorderMutator";
  readonly description = "Mutates CSS border properties";
  readonly targetProperties = [
    "border",
    "border-top",
    "border-right",
    "border-bottom",
    "border-left",
    "border-style",
    "border-width",
    "border-radius",
    "border-top-left-radius",
    "border-top-right-radius",
    "border-bottom-left-radius",
    "border-bottom-right-radius",
    "outline",
    "outline-style",
    "outline-width",
  ];

  mutate(property: string, value: string): string[] {
    const trimmed = value.trim().toLowerCase();

    // Border radius
    if (property.includes("radius")) {
      if (trimmed === "0" || trimmed === "0px") {
        return ["50%", "8px"];
      }
      const match = trimmed.match(BORDER_RADIUS_PATTERN);
      if (match) {
        return ["0", "50%"];
      }
      return [];
    }

    // Border style property
    if (property === "border-style" || property === "outline-style") {
      return BORDER_STYLE_SWAPS[trimmed] ?? [];
    }

    // Border width
    if (property === "border-width" || property === "outline-width") {
      if (trimmed === "0" || trimmed === "0px") {
        return ["2px"];
      }
      return ["0"];
    }

    // Shorthand border
    if (trimmed === "none" || trimmed === "0") {
      return ["1px solid black"];
    }

    const shorthandMatch = trimmed.match(BORDER_SHORTHAND_PATTERN);
    if (shorthandMatch) {
      return ["none"];
    }

    // Any other non-zero border value — remove it
    return ["none"];
  }
}
