import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL no definido");

// Cliente Postgres (Neon). ssl requerido por Neon.
const sql = postgres(url, { ssl: "require", max: 10 });

export const db = drizzle(sql);
export { sql };
