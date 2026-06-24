// Aplica las migraciones SQL de ../../db/migrations en orden alfabético.
// Fuente de verdad = los .sql crudos (no Drizzle generate), para conservar
// PostGIS, funciones plpgsql y semillas tal cual.
import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "./client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "../../../db/migrations");

async function run() {
  // tabla de control idempotente
  await sql`create table if not exists public._migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )`;

  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    const done = await sql`select 1 from public._migrations where name = ${file}`;
    if (done.length) {
      console.log(`· ya aplicada: ${file}`);
      continue;
    }
    const ddl = await readFile(join(MIGRATIONS_DIR, file), "utf8");
    console.log(`→ aplicando ${file}`);
    await sql.begin(async (tx) => {
      await tx.unsafe(ddl);
      await tx`insert into public._migrations (name) values (${file})`;
    });
  }
  console.log("Migraciones completadas.");
  await sql.end();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
