import pg from "pg";
import fs from "node:fs";
import path from "node:path";

const { Pool } = pg;

let pool;

function getSslConfig() {
  const caPath = process.env.DATABASE_CA_CERT_PATH || path.resolve(process.cwd(), "certs", "rds-ca.pem");
  const hasCa = fs.existsSync(caPath);
  const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true" || hasCa;

  return {
    rejectUnauthorized,
    ...(hasCa ? { ca: fs.readFileSync(caPath, "utf8") } : {}),
  };
}

export function getPgPool() {
  if (!pool) {
    pool = new Pool({
      database: process.env.DATABASE_NAME,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      host: process.env.DATABASE_HOST,
      port: Number(process.env.DATABASE_PORT),
      ssl: getSslConfig(),
    });
  }

  return pool;
}
