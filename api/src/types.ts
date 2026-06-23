import type { AccessClaims } from "./lib/jwt.js";

// Variables tipadas del contexto Hono (c.get("user")).
declare module "hono" {
  interface ContextVariableMap {
    user: AccessClaims;
  }
}
