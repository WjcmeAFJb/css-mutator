import { describe, it, expect } from "vitest";
import { ZIndexMutator } from "../../src/mutators/z-index-mutator.ts";

describe("ZIndexMutator", () => {
  const mutator = new ZIndexMutator();

  it("handles only z-index property", () => {
    expect(mutator.handles("z-index")).toBe(true);
    expect(mutator.handles("index")).toBe(false);
  });

  it("mutates positive z-index to -1 and 0", () => {
    const result = mutator.mutate("z-index", "10");
    expect(result).toContain("-1");
    expect(result).toContain("0");
  });

  it("mutates negative z-index to 0 and 9999", () => {
    const result = mutator.mutate("z-index", "-5");
    expect(result).toContain("0");
    expect(result).toContain("9999");
  });

  it("mutates zero z-index to -1 and 9999", () => {
    const result = mutator.mutate("z-index", "0");
    expect(result).toContain("-1");
    expect(result).toContain("9999");
  });

  it("mutates auto to 0, -1, and 9999", () => {
    const result = mutator.mutate("z-index", "auto");
    expect(result).toContain("0");
    expect(result).toContain("-1");
    expect(result).toContain("9999");
  });
});
