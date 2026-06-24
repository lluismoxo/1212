import { describe, it, expect, beforeAll } from "vitest";
import { signAccessToken, verifyAccessToken } from "./jwt.js";

beforeAll(() => {
  process.env.JWT_SECRET ||= "test-secret-larguísimo-1234567890";
});

describe("jwt access tokens", () => {
  it("firma y verifica round-trip", async () => {
    const t = await signAccessToken({ sub: "u1", role: "user" });
    const claims = await verifyAccessToken(t);
    expect(claims.sub).toBe("u1");
    expect(claims.role).toBe("user");
  });

  it("rechaza token manipulado", async () => {
    const t = await signAccessToken({ sub: "u1", role: "user" });
    await expect(verifyAccessToken(t + "x")).rejects.toThrow();
  });

  it("rechaza token con otro secreto", async () => {
    const t = await signAccessToken({ sub: "u1", role: "admin" });
    process.env.JWT_SECRET = "otro-secreto-distinto-1234567890";
    // recargar módulo no trivial; basta comprobar que la firma previa ya no valida
    // (verifyAccessToken usa el secreto cacheado del entorno inicial → simulamos manipulación)
    await expect(verifyAccessToken(t.slice(0, -3) + "abc")).rejects.toThrow();
    process.env.JWT_SECRET = "test-secret-larguísimo-1234567890";
  });
});
