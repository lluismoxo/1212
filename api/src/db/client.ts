import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL no definido");

// Cliente Postgres (Neon). ssl requerido por Neon.
// Todas las queries usan tagged templates parametrizados (sin drizzle).
export const sql = postgres(url, { ssl: "require", max: 10 });
