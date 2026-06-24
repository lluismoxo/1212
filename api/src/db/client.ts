import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL no definido");

// SSL según la URL: Neon exige TLS (sslmode=require); Postgres local/CI no.
const needsSsl = /sslmode=require/.test(url) || /\.neon\.tech/.test(url);

// Cliente Postgres. Todas las queries usan tagged templates parametrizados.
export const sql = postgres(url, { ssl: needsSsl ? "require" : false, max: 10 });
