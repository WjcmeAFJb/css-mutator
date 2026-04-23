import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/orchestrator.ts",
        "src/cli.ts",
        "src/reporter/**",
        "src/index.ts",
        "src/types.ts",
      ],
    },
  },
});
