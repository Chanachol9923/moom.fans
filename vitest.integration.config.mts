import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Runs against the real Supabase project in .env.local. Creates a throw-away user and
// deletes it again. Use: npm run test:integration
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/stubs/empty.ts", import.meta.url)),
    },
  },
  test: { include: ["tests/integration/**/*.test.ts"], testTimeout: 60_000, hookTimeout: 60_000 },
});
