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
      INSERT INTO general_eventos (id, event_type, id_agente, tipo_entidad, id_entidad, detalles)
      VALUES ($1, $2, $3, 'cuenta', $4, $5)
      RETURNING id, created_at, event_type, id_agente, id_entidad AS id_cuenta, detalles
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
      INSERT INTO general_eventos (id, event_type, id_agente, tipo_entidad, id_entidad, detalles)
      VALUES ($1, $2, $3, 'contacto', $4, $5)
      RETURNING id, created_at, event_type, id_agente, id_entidad AS id_contacto, detalles
    `,
    [`evt_contacto_${randomUUID().slice(0, 12)}`, eventType, idAgente || "", idContacto, detalles],
  );
  return rows[0] || null;
}

export async function getCuentaEventos(idCuenta) {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `
      SELECT id, created_at, event_type, id_agente, id_entidad AS id_cuenta, detalles
      FROM general_eventos
      WHERE tipo_entidad = 'cuenta' AND id_entidad = $1
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
      SELECT id, created_at, event_type, id_agente, id_entidad AS id_contacto, detalles
      FROM general_eventos
      WHERE tipo_entidad = 'contacto' AND id_entidad = $1
      ORDER BY created_at DESC
    `,
    [idContacto],
  );
  return rows;
}
