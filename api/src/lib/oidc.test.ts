import { describe, it, expect } from "vitest";
import { extractIdentity } from "./oidc.js";

describe("extractIdentity", () => {
  it("extrae sub/email/nombre de un payload Google", () => {
    const id = extractIdentity("google", {
      sub: "G123",
      email: "Test@Example.com",
      email_verified: true,
      name: "Marco",
    });
    expect(id).toEqual({
      provider: "google",
      sub: "G123",
      email: "test@example.com",
      emailVerified: true,
      name: "Marco",
    });
  });

  it("maneja email_verified como string", () => {
    const id = extractIdentity("apple", { sub: "A1", email_verified: "true" });
    expect(id.emailVerified).toBe(true);
    expect(id.email).toBeNull();
  });

  it("falla sin sub", () => {
    expect(() => extractIdentity("google", {})).toThrow();
  });
});
