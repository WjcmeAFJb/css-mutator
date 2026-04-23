import {
  parse as postcssParse,
  type Root,
  type Declaration,
  type Rule,
  type AtRule,
} from "postcss";
import { readFileSync } from "node:fs";

export interface ParsedDeclaration {
  /** The CSS selector (e.g. ".button", "#header > nav"). */
  selector: string;
  /** The CSS property (e.g. "color", "display"). */
  property: string;
  /** The CSS value (e.g. "red", "flex"). */
  value: string;
  /** Byte offset range [start, end) in the source. */
  range: [number, number];
  /** Line/column location. */
  location: {
    start: { line: number; column: number; offset: number };
    end: { line: number; column: number; offset: number };
  };
  /** The raw PostCSS Declaration node. */
  node: Declaration;
}

export interface ParsedCssFile {
  fileName: string;
  source: string;
  ast: Root;
  declarations: ParsedDeclaration[];
}

/**
 * Parse a CSS string into a structured representation with all declarations.
 */
export function parseCss(source: string, fileName: string): ParsedCssFile {
  const ast = postcssParse(source, { from: fileName });
  const declarations: ParsedDeclaration[] = [];

  ast.walk((node) => {
    if (node.type === "decl") {
      const decl = node as Declaration;
      const rule = decl.parent;

      // Get the selector — walk up to find the nearest Rule
      let selector = "(root)";
      if (rule && rule.type === "rule") {
        selector = (rule as Rule).selector;
      } else if (rule && rule.type === "atrule") {
        selector = `@${(rule as AtRule).name}`;
      }

      // Calculate the byte range for the VALUE portion only
      // PostCSS source gives us line/column for the declaration
      const valueStart = findValueOffset(source, decl);
      const valueEnd = valueStart + decl.value.length;

      const startPos = offsetToPosition(source, valueStart);
      const endPos = offsetToPosition(source, valueEnd);

      declarations.push({
        selector,
        property: decl.prop,
        value: decl.value,
        range: [valueStart, valueEnd],
        location: {
          start: { ...startPos, offset: valueStart },
          end: { ...endPos, offset: valueEnd },
        },
        node: decl,
      });
    }
  });

  return { fileName, source, ast, declarations };
}

/**
 * Parse a CSS file from disk.
 */
export function parseCssFile(fileName: string): ParsedCssFile {
  const source = readFileSync(fileName, "utf-8");
  return parseCss(source, fileName);
}

/**
 * Apply a mutation to a CSS source string.
 * Replaces the value at the given byte range with the replacement.
 */
export function applyCssMutation(
  source: string,
  range: [number, number],
  replacement: string,
): string {
  return source.slice(0, range[0]) + replacement + source.slice(range[1]);
}

/**
 * Find the byte offset of a declaration's value in the source string.
 */
function findValueOffset(source: string, decl: Declaration): number {
  // PostCSS declarations parsed from source always have source positions
  const declStartOffset = positionToOffset(
    source,
    decl.source!.start!.line!,
    decl.source!.start!.column!,
  );

  // Find the colon after the property name, then skip whitespace to find value start
  const afterProp = source.indexOf(":", declStartOffset);

  // Skip whitespace after the colon
  let valueStart = afterProp + 1;
  while (valueStart < source.length && /\s/.test(source[valueStart]!)) {
    valueStart++;
  }

  return valueStart;
}

/**
 * Convert a 1-based line/column position to a byte offset.
 */
function positionToOffset(source: string, line: number, column: number): number {
  const lines = source.split("\n");
  let offset = 0;
  for (let i = 0; i < line - 1; i++) {
    offset += lines[i]!.length + 1; // +1 for newline
  }
  offset += column - 1;
  return offset;
}

/**
 * Convert a byte offset to a line/column position (1-based).
 */
function offsetToPosition(source: string, offset: number): { line: number; column: number } {
  let line = 1;
  let column = 1;
  for (let i = 0; i < offset && i < source.length; i++) {
    if (source[i] === "\n") {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  return { line, column };
}
