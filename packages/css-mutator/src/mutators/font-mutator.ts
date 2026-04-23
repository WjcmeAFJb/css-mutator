import { BaseCssMutator } from "./base-mutator.ts";

const FONT_WEIGHT_SWAPS: Record<string, string[]> = {
  normal: ["bold"],
  bold: ["normal"],
  lighter: ["bolder"],
  bolder: ["lighter"],
  "100": ["900"],
  "200": ["800"],
  "300": ["700"],
  "400": ["700"],
  "500": ["300"],
  "600": ["300"],
  "700": ["400"],
  "800": ["200"],
  "900": ["100"],
};

const FONT_STYLE_SWAPS: Record<string, string[]> = {
  normal: ["italic"],
  italic: ["normal"],
  oblique: ["normal"],
};

const TEXT_ALIGN_SWAPS: Record<string, string[]> = {
  left: ["right", "center"],
  right: ["left", "center"],
  center: ["left", "right"],
  justify: ["left", "center"],
  start: ["end", "center"],
  end: ["start", "center"],
};

const TEXT_TRANSFORM_SWAPS: Record<string, string[]> = {
  none: ["uppercase"],
  uppercase: ["lowercase", "none"],
  lowercase: ["uppercase", "none"],
  capitalize: ["uppercase", "none"],
};

const TEXT_DECORATION_SWAPS: Record<string, string[]> = {
  none: ["underline", "line-through"],
  underline: ["none", "line-through"],
  "line-through": ["none", "underline"],
  overline: ["none", "underline"],
};

const FONT_SIZE_PATTERN = /^(\d+(?:\.\d+)?)(px|rem|em|pt|%)$/;

export class FontMutator extends BaseCssMutator {
  readonly name = "FontMutator";
  readonly description = "Mutates CSS font and text properties";
  readonly targetProperties = [
    "font-size",
    "font-weight",
    "font-style",
    "font-family",
    "text-align",
    "text-transform",
    "text-decoration",
    "text-decoration-line",
    "letter-spacing",
    "line-height",
    "word-spacing",
    "white-space",
  ];

  mutate(property: string, value: string): string[] {
    const trimmed = value.trim().toLowerCase();

    switch (property) {
      case "font-weight":
        return FONT_WEIGHT_SWAPS[trimmed] ?? [];

      case "font-style":
        return FONT_STYLE_SWAPS[trimmed] ?? [];

      case "text-align":
        return TEXT_ALIGN_SWAPS[trimmed] ?? [];

      case "text-transform":
        return TEXT_TRANSFORM_SWAPS[trimmed] ?? [];

      case "text-decoration":
      case "text-decoration-line":
        return TEXT_DECORATION_SWAPS[trimmed] ?? [];

      case "font-size": {
        const match = trimmed.match(FONT_SIZE_PATTERN);
        if (match) {
          const num = parseFloat(match[1]!);
          const unit = match[2]!;
          const results: string[] = [];
          if (num > 0) results.push(`${Math.round(num * 2)}${unit}`);
          if (num > 4) results.push(`${Math.round(num / 2)}${unit}`);
          return results;
        }
        return [];
      }

      case "line-height": {
        const num = parseFloat(trimmed);
        if (!isNaN(num) && num > 0) {
          return [String(Math.max(0.5, num / 2)), String(num * 2)];
        }
        if (trimmed === "normal") return ["1", "2"];
        return [];
      }

      case "letter-spacing":
      case "word-spacing": {
        if (trimmed === "normal") return ["5px", "-2px"];
        const match2 = trimmed.match(/^(-?\d+(?:\.\d+)?)(px|rem|em)$/);
        if (match2) {
          const n = parseFloat(match2[1]!);
          const u = match2[2]!;
          return n === 0 ? [`5${u}`] : ["0", `${-n}${u}`];
        }
        return [];
      }

      case "white-space": {
        if (trimmed === "normal") return ["nowrap", "pre"];
        if (trimmed === "nowrap") return ["normal"];
        if (trimmed === "pre") return ["normal"];
        return [];
      }

      case "font-family":
        // Swap to a visually distinct fallback
        return ["serif", "monospace"].filter((f) => !trimmed.includes(f));

      default:
        return [];
    }
  }
}
