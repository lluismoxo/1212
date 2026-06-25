import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // un solo proceso: env de proceso compartido y sin condiciones de carrera
    // entre el test de integración (Neon) y los unitarios.
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,
    testTimeout: 20000, // tests de integración contra Neon (latencia de red)
  },
});
