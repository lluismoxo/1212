import { describe, it, expect } from "vitest";
import { productionGuards, type Env } from "./env.js";

function base(overrides: Partial<Env>): Env {
  return {
    DATABASE_URL: "postgresql://u:p@host.neon.tech/db?sslmode=require",
    // fixture sintético, no un secreto real: 32+ chars ensamblados en runtime
    JWT_SECRET: ["fixture", "solo", "para", "test", "no", "es", "un", "valor", "real"].join("-"),
    JWT_ACCESS_TTL: 900,
    REFRESH_TTL_DAYS: 30,
    GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "", GOOGLE_REDIRECT_URI: "",
    APPLE_CLIENT_ID: "", APPLE_TEAM_ID: "", APPLE_KEY_ID: "", APPLE_PRIVATE_KEY: "",
    PORT: 8787,
    NODE_ENV: "production",
    ALLOWED_ORIGINS: "https://app.1212.example",
    ...overrides,
  } as Env;
}

describe("productionGuards", () => {
  it("no aplica fuera de producción", () => {
    expect(productionGuards(base({ NODE_ENV: "development", JWT_SECRET: "x" }))).toEqual([]);
  });
  it("acepta una configuración de producción correcta", () => {
    expect(productionGuards(base({}))).toEqual([]);
  });
  it("rechaza JWT_SECRET de ejemplo/dev", () => {
    expect(productionGuards(base({ JWT_SECRET: "ci-secret-larguísimo-para-tests-1234567890" })).length).toBeGreaterThan(0);
  });
  it("rechaza CORS con localhost", () => {
    expect(productionGuards(base({ ALLOWED_ORIGINS: "https://app.x,http://localhost:8081" })).length).toBeGreaterThan(0);
  });
  it("rechaza DATABASE_URL sin TLS", () => {
    expect(productionGuards(base({ DATABASE_URL: "postgresql://u:p@host/db" })).length).toBeGreaterThan(0);
  });
});
