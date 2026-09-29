import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/stubs/empty.ts", import.meta.url)),
    },
  },
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    environment: "node",
    testTimeout: 30_000,
    coverage: { provider: "v8", include: ["src/lib/**"], reporter: ["text-summary", "html"] },
  },
});
