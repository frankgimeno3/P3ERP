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
    id_proveedor: row.id_proveedor ?? "",
    nombre_proveedor: row.nombre_proveedor ?? "",
    id_cuenta: row.id_cuenta ?? "",
    nombre_cuenta: row.nombre_cuenta ?? "",
    id_agente: row.id_agente ?? "",
    nombre_agente: row.nombre_agente ?? "",
    duplicado_descartado: Boolean(row.duplicado_descartado),
    id_orden: row.id_orden ?? "",
    id_pago: row.id_pago ?? "",
    id_cargo_recurrente: row.id_cargo_recurrente === null || row.id_cargo_recurrente === undefined ? null : Number(row.id_cargo_recurrente),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const BANK_CODES = { Sabadell: "sab", Santander: "san" };

function dateValue(value) {
  const match = String(value || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? Number(`${match[3]}${match[2]}${match[1]}`) : 0;
}

function fingerprint(linea) {
  return [
    linea.fecha_operativa,
    linea.fecha_valor,
    String(linea.concepto || "").trim().replace(/\s+/g, " ").toLowerCase(),
    Number(linea.importe).toFixed(2),
    Number(linea.saldo).toFixed(2),
  ].join("|");
}

function chronologicalRows(lineas) {
  const rows = [...lineas];
  const firstDated = rows.find((row) => dateValue(row.fecha_operativa));
  const lastDated = [...rows].reverse().find((row) => dateValue(row.fecha_operativa));
  if (firstDated && lastDated && dateValue(firstDated.fecha_operativa) > dateValue(lastDated.fecha_operativa)) rows.reverse();
  return rows;
}

function mergeMovementSequences(existing, incoming) {
  const existingKeys = existing.map(fingerprint);
  const incomingKeys = incoming.map(fingerprint);
  const dp = Array.from({ length: existing.length + 1 }, () => new Uint32Array(incoming.length + 1));

  for (let i = existing.length - 1; i >= 0; i -= 1) {
    for (let j = incoming.length - 1; j >= 0; j -= 1) {
      dp[i][j] = existingKeys[i] === incomingKeys[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const merged = [];
  let existingIndex = 0;
  let incomingIndex = 0;
  while (existingIndex < existing.length && incomingIndex < incoming.length) {
    if (existingKeys[existingIndex] === incomingKeys[incomingIndex]) {
      merged.push(existing[existingIndex]);
      existingIndex += 1;
      incomingIndex += 1;
      continue;
    }

    const existingDate = dateValue(existing[existingIndex].fecha_operativa);
    const incomingDate = dateValue(incoming[incomingIndex].fecha_operativa);
    const skipExistingScore = dp[existingIndex + 1][incomingIndex];
    const skipIncomingScore = dp[existingIndex][incomingIndex + 1];
    const existingThenIncoming = Math.abs((Number(existing[existingIndex].saldo) + Number(incoming[incomingIndex].importe)) - Number(incoming[incomingIndex].saldo)) < 0.005;
    const incomingThenExisting = Math.abs((Number(incoming[incomingIndex].saldo) + Number(existing[existingIndex].importe)) - Number(existing[existingIndex].saldo)) < 0.005;
    const keepExisting = skipExistingScore > skipIncomingScore
      || (skipExistingScore === skipIncomingScore && existingDate < incomingDate)
      || (skipExistingScore === skipIncomingScore && existingDate === incomingDate && existingThenIncoming && !incomingThenExisting);
    if (keepExisting) {
      merged.push(existing[existingIndex]);
      existingIndex += 1;
    } else {
      merged.push({ ...incoming[incomingIndex], estado_revision: false, comentarios: "" });
      incomingIndex += 1;
    }
  }

  while (existingIndex < existing.length) merged.push(existing[existingIndex++]);
  while (incomingIndex < incoming.length) merged.push({ ...incoming[incomingIndex++], estado_revision: false, comentarios: "" });
  return merged;
}

function ordinalId(banco, fechaOperativa, serial) {
  const year = String(fechaOperativa || "").slice(-2);
  const serialText = String(serial).padStart(9, "0").replace(/(\d{3})(\d{3})(\d{3})/, "$1.$2.$3");
  return `banc_${BANK_CODES[banco]}_${year}_${serialText}`;
}

export async function getLineasBanco() {
  const pool = getPgPool();
  const { rows } = await pool.query(`
    SELECT lb.*, p.nombre_proveedor, c.nombre_empresa AS nombre_cuenta, a.nombre_completo_agente AS nombre_agente
    FROM lineas_bancos lb
    LEFT JOIN proveedores_db p ON p.id_proveedor=lb.id_proveedor
    LEFT JOIN cuentas_db c ON c.id_cuenta=lb.id_cuenta
    LEFT JOIN agentes_db a ON a.id_agente=lb.id_agente
    ORDER BY lb.id_linea_banco DESC
  `);

  return rows.map(normalizeLineaBanco);
}

export async function getLineaBancoById(idLineaBanco) {
  const pool = getPgPool();
  const { rows } = await pool.query(`
    SELECT lb.*, p.nombre_proveedor, c.nombre_empresa AS nombre_cuenta, a.nombre_completo_agente AS nombre_agente
    FROM lineas_bancos lb
    LEFT JOIN proveedores_db p ON p.id_proveedor = lb.id_proveedor
    LEFT JOIN cuentas_db c ON c.id_cuenta = lb.id_cuenta
    LEFT JOIN agentes_db a ON a.id_agente = lb.id_agente
    WHERE lb.id_linea_banco = $1
  `, [idLineaBanco]);
  return rows[0] ? normalizeLineaBanco(rows[0]) : null;
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

export async function reconcileLineasBanco(banco, sourceLineas = []) {
  if (!BANK_CODES[banco]) throw new Error("Banco no válido");
  if (!sourceLineas.length) return { lineas: [], creadas: 0, existentes: 0 };

  const pool = getPgPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("LOCK TABLE lineas_bancos IN EXCLUSIVE MODE");
    const { rows: storedRows } = await client.query("SELECT * FROM lineas_bancos WHERE banco = $1 ORDER BY id_linea_banco ASC", [banco]);
    const existing = storedRows.map(normalizeLineaBanco);
    const incoming = chronologicalRows(sourceLineas.map((linea) => ({
      banco,
      fecha_operativa: linea.fecha_operativa,
      fecha_valor: linea.fecha_valor,
      concepto: String(linea.concepto || "").trim(),
      importe: Number(linea.importe),
      saldo: Number(linea.saldo),
    })));
    const merged = mergeMovementSequences(existing, incoming);
    const serialByYear = new Map();
    const renumbered = merged.map((linea) => {
      const year = String(linea.fecha_operativa || "").slice(-2);
      const serial = (serialByYear.get(year) || 0) + 1;
      serialByYear.set(year, serial);
      return { ...linea, id_linea_banco: ordinalId(banco, linea.fecha_operativa, serial), banco };
    });

    await client.query("DELETE FROM lineas_bancos WHERE banco = $1", [banco]);
    for (const linea of renumbered) {
      await client.query(
        `INSERT INTO lineas_bancos
          (id_linea_banco, banco, fecha_operativa, fecha_valor, concepto, importe, saldo, estado_revision, comentarios, id_proveedor, id_cuenta, id_orden, id_pago, id_cargo_recurrente, created_at, updated_at, id_agente, duplicado_descartado)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,COALESCE($15,NOW()),COALESCE($16,NOW()),$17,$18)`,
        [linea.id_linea_banco, banco, linea.fecha_operativa, linea.fecha_valor, linea.concepto, linea.importe, linea.saldo,
          Boolean(linea.estado_revision), linea.comentarios || "", linea.id_proveedor || null, linea.id_cuenta || null,
          linea.id_orden || null, linea.id_pago || null, linea.id_cargo_recurrente || null, linea.created_at || null, linea.updated_at || null,
          linea.id_agente || null, Boolean(linea.duplicado_descartado)],
      );
    }
    await client.query("COMMIT");
    return { lineas: renumbered.map(normalizeLineaBanco), creadas: renumbered.length - existing.length, existentes: existing.length };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateLineaBanco(idLineaBanco, data = {}) {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `
      UPDATE lineas_bancos
      SET estado_revision = $1,
          comentarios = $2,
          id_proveedor = CASE WHEN $3 THEN $4 ELSE id_proveedor END,
          id_cuenta = CASE WHEN $5 THEN $6 ELSE id_cuenta END,
          id_agente = CASE WHEN $7 THEN $8 ELSE id_agente END,
          id_orden = CASE WHEN $9 THEN $10 ELSE id_orden END,
          id_pago = CASE WHEN $11 THEN $12 ELSE id_pago END,
          id_cargo_recurrente = CASE WHEN $13 THEN $14 ELSE id_cargo_recurrente END,
          updated_at = NOW()
      WHERE id_linea_banco = $15
      RETURNING *
    `,
    [Boolean(data.estado_revision), data.comentarios ?? "", data.id_proveedor !== undefined, data.id_proveedor || null,
      data.id_cuenta !== undefined, data.id_cuenta || null, data.id_agente !== undefined, data.id_agente || null,
      data.id_orden !== undefined, data.id_orden || null, data.id_pago !== undefined, data.id_pago || null,
      data.id_cargo_recurrente !== undefined, data.id_cargo_recurrente || null, idLineaBanco],
  );

  return rows[0] ? normalizeLineaBanco(rows[0]) : null;
}
