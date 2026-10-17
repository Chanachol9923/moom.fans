import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@moom/shared": fileURLToPath(new URL("./packages/shared/src", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` throws outside the React server bundle; tests run plain Node.
      "server-only": fileURLToPath(new URL("./tests/stubs/empty.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts", "src/**/*.test.ts", "packages/**/*.test.ts"],
    exclude: ["tests/integration/**", "node_modules/**"],
    testTimeout: 30_000,
  },
});
