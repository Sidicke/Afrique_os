import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // Le JSX est géré automatiquement : tsconfig définit déjà `jsx: "react-jsx"`.
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // Les tests sont unitaires et rapides : pas de coverage ni de workers parallèles lourds.
    pool: "forks",
  },
});
