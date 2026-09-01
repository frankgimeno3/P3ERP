import { randomUUID } from "node:crypto";
import { getPgPool } from "../../database/pgClient.js";

export function formatChangeDetail(actor, field, beforeValue, afterValue) {
  const before = beforeValue === null || beforeValue === undefined || beforeValue === "" ? "vacío" : String(beforeValue);
  const after = afterValue === null || afterValue === undefined || afterValue === "" ? "vacío" : String(afterValue);
  return `el usuario ${actor || "sistema"}, ha realizado un cambio en el campo ${field}, pasando de valor ${before} a valor ${after}`;
}

export async function addCuentaEvento({ idCuenta, idAgente = "", eventType = "Acción automatizada", detalles = "" }, client = getPgPool()) {
  if (!idCuenta || !detalles) return null;
  const { rows } = await client.query(
    `
      INSERT INTO cuentas_registro_eventos (id, event_type, id_agente, id_cuenta, detalles)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [`evt_cuenta_${randomUUID().slice(0, 12)}`, eventType, idAgente || "", idCuenta, detalles],
  );
  return rows[0] || null;
}

export async function addCuentaEntityEvent({
  idCuenta,
  idAgente = "",
  entity = "elemento",
  entityId = "",
  action = "modificado",
  details = "",
}, client = getPgPool()) {
  if (!idCuenta) return null;
  const actor = idAgente || "sistema";
  const text = details || `el usuario ${actor}, ha ${action} ${entity}${entityId ? ` ${entityId}` : ""} asociado a esta cuenta`;
  return addCuentaEvento({
    idCuenta,
    idAgente,
    eventType: idAgente ? "Cambio por agente" : "Acción automatizada",
    detalles: text,
  }, client);
}

export async function addContactoEvento({ idContacto, idAgente = "", eventType = "Acción automatizada", detalles = "" }, client = getPgPool()) {
  if (!idContacto || !detalles) return null;
  const { rows } = await client.query(
    `
      INSERT INTO comentarios_registro_eventos (id, event_type, id_agente, id_contacto, detalles)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [`evt_contacto_${randomUUID().slice(0, 12)}`, eventType, idAgente || "", idContacto, detalles],
  );
  return rows[0] || null;
}

export async function getCuentaEventos(idCuenta) {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `
      SELECT *
      FROM cuentas_registro_eventos
      WHERE id_cuenta = $1
      ORDER BY created_at DESC
    `,
    [idCuenta],
  );
  return rows;
}

export async function getContactoEventos(idContacto) {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `
      SELECT *
      FROM comentarios_registro_eventos
      WHERE id_contacto = $1
      ORDER BY created_at DESC
    `,
    [idContacto],
  );
  return rows;
}
