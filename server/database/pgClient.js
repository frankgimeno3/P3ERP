import pg from "pg";

const { Pool } = pg;

let pool;

export function getPgPool() {
  if (!pool) {
    pool = new Pool({
      database: process.env.DATABASE_NAME,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      host: process.env.DATABASE_HOST,
      port: Number(process.env.DATABASE_PORT),
      ssl: {
        rejectUnauthorized: process.env.NODE_ENV !== "development",
      },
    });
  }

  return pool;
}
