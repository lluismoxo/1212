import { describe, it, expect } from "vitest";
import { canLinkToExistingAccount } from "./service.js";

// Anti account pre-hijacking: una identidad OIDC solo puede fusionarse con una
// cuenta existente (misma email) si el proveedor verificó el email.
describe("canLinkToExistingAccount", () => {
  it("permite enlazar con email verificado", () => {
    expect(canLinkToExistingAccount(true)).toBe(true);
  });
  it("rechaza enlazar con email no verificado", () => {
    expect(canLinkToExistingAccount(false)).toBe(false);
  });
});
