import { randomUUID } from "node:crypto";
import { getPgPool } from "../../database/pgClient.js";
import { addContactoEvento, addCuentaEvento } from "../registroEventos/RegistroEventosRepository.js";

function normalize(row) {
  return {
    id_comentario: row.id_comentario,
    created_at: row.created_at,
    updated_at: row.updated_at,
    id_original_autor: row.id_original_autor ?? "",
    id_last_editor: row.id_last_editor ?? "",
    tipo_entidad: row.tipo_entidad,
    id_entidad: row.id_entidad,
    contenido_comentario: row.contenido_comentario ?? "",
  };
}

async function getCuentaForContacto(idContacto, client) {
  const { rows } = await client.query(`SELECT id_cuenta FROM comercial_contactos WHERE id_contacto = $1 LIMIT 1`, [idContacto]);
  return rows[0]?.id_cuenta || "";
}

async function logComentarioEvent({ tipoEntidad, idEntidad, accion, idAgente, contenido }, client) {
  const detalles = `el usuario ${idAgente || "sistema"}, ha ${accion} un comentario${contenido ? `: ${contenido}` : ""}`;
  if (tipoEntidad === "cuenta") {
    await addCuentaEvento({ idCuenta: idEntidad, idAgente, eventType: idAgente ? "Cambio por agente" : "Acción automatizada", detalles }, client);
  }
  if (tipoEntidad === "contacto") {
    await addContactoEvento({ idContacto: idEntidad, idAgente, eventType: idAgente ? "Cambio por agente" : "Acción automatizada", detalles }, client);
    const idCuenta = await getCuentaForContacto(idEntidad, client);
    if (idCuenta) {
      await addCuentaEvento({ idCuenta, idAgente, eventType: idAgente ? "Cambio por agente" : "Acción automatizada", detalles: `${detalles} en el contacto ${idEntidad}` }, client);
    }
  }
}

export async function getComentarios({ tipoEntidad, idEntidad }) {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `
      SELECT *
      FROM general_comentarios
      WHERE tipo_entidad = $1 AND id_entidad = $2
      ORDER BY created_at DESC
    `,
    [tipoEntidad, idEntidad],
  );
  return rows.map(normalize);
}

export async function createComentario(data = {}) {
  const pool = getPgPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const idComentario = data.id_comentario || `com_${randomUUID().slice(0, 12)}`;
    const { rows } = await client.query(
      `
        INSERT INTO general_comentarios (
          id_comentario,
          id_original_autor,
          id_last_editor,
          tipo_entidad,
          id_entidad,
          contenido_comentario
        )
        VALUES ($1, $2, $2, $3, $4, $5)
        RETURNING *
      `,
      [idComentario, data.id_agente || "", data.tipo_entidad, data.id_entidad, data.contenido_comentario || ""],
    );
    await logComentarioEvent({
      tipoEntidad: data.tipo_entidad,
      idEntidad: data.id_entidad,
      accion: "añadido",
      idAgente: data.id_agente || "",
      contenido: data.contenido_comentario || "",
    }, client);
    await client.query("COMMIT");
    return normalize(rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateComentario(idComentario, data = {}) {
  const pool = getPgPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `
        UPDATE general_comentarios
        SET contenido_comentario = $2,
            id_last_editor = $3,
            updated_at = now()
        WHERE id_comentario = $1
        RETURNING *
      `,
      [idComentario, data.contenido_comentario || "", data.id_agente || ""],
    );
    if (rows[0]) {
      await logComentarioEvent({
        tipoEntidad: rows[0].tipo_entidad,
        idEntidad: rows[0].id_entidad,
        accion: "editado",
        idAgente: data.id_agente || "",
        contenido: data.contenido_comentario || "",
      }, client);
    }
    await client.query("COMMIT");
    return rows[0] ? normalize(rows[0]) : null;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteComentario(idComentario, data = {}) {
  const pool = getPgPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(`DELETE FROM general_comentarios WHERE id_comentario = $1 RETURNING *`, [idComentario]);
    if (rows[0]) {
      await logComentarioEvent({
        tipoEntidad: rows[0].tipo_entidad,
        idEntidad: rows[0].id_entidad,
        accion: "eliminado",
        idAgente: data.id_agente || "",
        contenido: rows[0].contenido_comentario || "",
      }, client);
    }
    await client.query("COMMIT");
    return rows[0] ? normalize(rows[0]) : null;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
