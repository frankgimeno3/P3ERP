import { getPgPool } from "../../database/pgClient.js";

function numberOrZero(value) {
  return value === null || value === undefined ? 0 : Number(value);
}

function normalizeLineaBanco(row) {
  return {
    id_linea_banco: row.id_linea_banco,
    banco: row.banco ?? "",
    fecha_operativa: row.fecha_operativa ?? "",
    fecha_valor: row.fecha_valor ?? "",
    concepto: row.concepto ?? "",
    importe: numberOrZero(row.importe),
    saldo: numberOrZero(row.saldo),
    estado_revision: Boolean(row.estado_revision),
    comentarios: row.comentarios ?? "",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getLineasBanco() {
  const pool = getPgPool();
  const { rows } = await pool.query(`
    SELECT *
    FROM lineas_bancos
    ORDER BY to_date(NULLIF(fecha_operativa, ''), 'DD/MM/YYYY') DESC NULLS LAST, id_linea_banco DESC
  `);

  return rows.map(normalizeLineaBanco);
}

export async function createLineasBanco(lineas = []) {
  if (!lineas.length) return [];

  const pool = getPgPool();
  const values = [];
  const placeholders = lineas.map((linea, index) => {
    const offset = index * 7;
    values.push(
      linea.id_linea_banco,
      linea.banco,
      linea.fecha_operativa,
      linea.fecha_valor,
      linea.concepto,
      Number(linea.importe),
      Number(linea.saldo),
    );
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`;
  });

  const { rows } = await pool.query(
    `
      INSERT INTO lineas_bancos (
        id_linea_banco,
        banco,
        fecha_operativa,
        fecha_valor,
        concepto,
        importe,
        saldo
      )
      VALUES ${placeholders.join(", ")}
      ON CONFLICT (id_linea_banco) DO NOTHING
      RETURNING *
    `,
    values,
  );

  return rows.map(normalizeLineaBanco);
}

export async function updateLineaBanco(idLineaBanco, data = {}) {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `
      UPDATE lineas_bancos
      SET estado_revision = $1,
          comentarios = $2,
          updated_at = NOW()
      WHERE id_linea_banco = $3
      RETURNING *
    `,
    [Boolean(data.estado_revision), data.comentarios ?? "", idLineaBanco],
  );

  return rows[0] ? normalizeLineaBanco(rows[0]) : null;
}
