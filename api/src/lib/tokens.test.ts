import { describe, it, expect } from "vitest";
import { generateRefreshToken, hashToken, safeEqualHex } from "./tokens.js";

describe("tokens", () => {
  it("genera refresh tokens únicos y largos", () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(40);
  });

  it("hashToken es determinista", () => {
    expect(hashToken("x")).toBe(hashToken("x"));
    expect(hashToken("x")).not.toBe(hashToken("y"));
  });

  it("safeEqualHex compara correctamente", () => {
    const h = hashToken("abc");
    expect(safeEqualHex(h, h)).toBe(true);
    expect(safeEqualHex(h, hashToken("abd"))).toBe(false);
    expect(safeEqualHex(h, "00")).toBe(false);
  });
});
