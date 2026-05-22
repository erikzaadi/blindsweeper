import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    pool: "forks",
    include: ["src/**/*.test.ts"],
    exclude: ["src/tests/integration/**/*.test.ts"],
    passWithNoTests: true,
  },
});
