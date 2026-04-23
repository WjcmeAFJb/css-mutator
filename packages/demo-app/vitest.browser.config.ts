import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["test/visual/**/*.test.{ts,tsx}"],
    browser: {
      enabled: true,
      provider: "playwright",
      instances: [{ browser: "chromium" }],
    },
  },
});
