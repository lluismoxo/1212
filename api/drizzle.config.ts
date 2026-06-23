import type { Config } from "drizzle-kit";

// Drizzle apunta a las migraciones SQL que son la fuente de verdad
// (../db/migrations). El esquema TS (src/db/schema.ts) refleja esas tablas.
export default {
  schema: "./src/db/schema.ts",
  out: "../db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
} satisfies Config;
