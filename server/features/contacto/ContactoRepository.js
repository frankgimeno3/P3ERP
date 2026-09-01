import { getPgPool } from "../../database/pgClient.js";
import { randomUUID } from "node:crypto";
import { addCuentaEvento, addContactoEvento, formatChangeDetail } from "../registroEventos/RegistroEventosRepository.js";

function normalizeContacto(row) {
  return {
    id_contacto: row.id_contacto,
    id_cuenta: row.id_cuenta ?? "",
    nombre_contacto: row.nombre_contacto ?? "",
    apellidos_contacto: row.apellidos_contacto ?? "",
    nombre_completo_contacto: row.nombre_completo_contacto ?? "",
    nombre_empresa: row.nombre_empresa ?? "",
    telefono_contacto: row.telefono_contacto ?? "",
    email_contacto: row.email_contacto ?? "",
    cargo_contacto: row.cargo_contacto ?? "",
    idiomas: row.idiomas ?? "",
    conocido_en: row.conocido_en ?? "",
    contactado_en_feria: row.contactado_en_feria ?? "",
    suscripciones: row.suscripciones ?? [],
    otros_datos_interes: row.otros_datos_interes ?? "",
    pais_contacto: row.pais_contacto ?? "",
    linkedin_cuenta: row.linkedin_cuenta ?? "",
    url_contacto: row.url_contacto ?? "",
  };
}

function createContactoId() {
  return `cont_${new Date().getFullYear().toString().slice(-2)}_${randomUUID().slice(0, 8)}`;
}

export async function getContactos(filters = {}) {
  const pool = getPgPool();
  const values = [];
  const where = [];

  if (filters.idCuenta) {
    values.push(filters.idCuenta);
    where.push(`id_cuenta = $${values.length}`);
  }

  const { rows } = await pool.query(
    `
      SELECT *
      FROM contactos_db
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY nombre_completo_contacto ASC
    `,
    values,
  );

  return rows.map(normalizeContacto);
}

export async function createContacto(data = {}) {
  const pool = getPgPool();
  const idContacto = data.id_contacto?.trim() || createContactoId();
  const nombre = data.nombre_contacto?.trim() || "";
  const apellidos = data.apellidos_contacto?.trim() || "";
  const nombreCompleto = data.nombre_completo_contacto?.trim() || `${nombre} ${apellidos}`.trim();
  const idCuenta = data.id_cuenta?.trim() || null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      ALTER TABLE contactos_db
        ADD COLUMN IF NOT EXISTS linkedin_cuenta TEXT NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS url_contacto TEXT NOT NULL DEFAULT '';
    `);

    let nombreEmpresa = data.nombre_empresa || "";
    if (idCuenta && !nombreEmpresa) {
      const { rows } = await client.query(`SELECT nombre_empresa FROM cuentas_db WHERE id_cuenta = $1 LIMIT 1`, [idCuenta]);
      nombreEmpresa = rows[0]?.nombre_empresa || "";
    }

    const { rows } = await client.query(
      `
        INSERT INTO contactos_db (
          id_contacto,
          id_cuenta,
          nombre_contacto,
          apellidos_contacto,
          nombre_completo_contacto,
          nombre_empresa,
          telefono_contacto,
          email_contacto,
          cargo_contacto,
          idiomas,
          conocido_en,
          contactado_en_feria,
          suscripciones,
          otros_datos_interes,
          pais_contacto,
          linkedin_cuenta,
          url_contacto
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '', '', '', '[]'::jsonb, '', $10, $11, $12)
        RETURNING *
      `,
      [
        idContacto,
        idCuenta,
        nombre,
        apellidos,
        nombreCompleto,
        nombreEmpresa,
        data.telefono_contacto || "",
        data.email_contacto || "",
        data.cargo_contacto || "",
        data.pais_contacto || "",
        data.linkedin_cuenta || "",
        data.url_contacto || "",
      ],
    );

    if (idCuenta) {
      await client.query(
        `
          UPDATE cuentas_db
          SET array_contactos_cuenta = (
                SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
                FROM (
                  SELECT DISTINCT ON (elem->>'id_contacto') elem AS item
                  FROM jsonb_array_elements(array_contactos_cuenta || $1::jsonb) AS elem
                  WHERE COALESCE(elem->>'id_contacto', '') <> ''
                ) dedup
              ),
              updated_at = NOW()
          WHERE id_cuenta = $2
        `,
        [JSON.stringify([{ id_contacto: idContacto }]), idCuenta],
      );
      await addCuentaEvento({
        idCuenta,
        idAgente: data.id_agente || "",
        eventType: data.id_agente ? "Cambio por agente" : "Acción automatizada",
        detalles: `el usuario ${data.id_agente || "sistema"}, ha creado el contacto ${idContacto} asociado a esta cuenta`,
      }, client);
    }

    await addContactoEvento({
      idContacto,
      idAgente: data.id_agente || "",
      eventType: data.id_agente ? "Cambio por agente" : "Acción automatizada",
      detalles: `el usuario ${data.id_agente || "sistema"}, ha creado este contacto`,
    }, client);

    await client.query("COMMIT");
    return normalizeContacto(rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function unlinkContactoFromCuenta(idContacto, idCuenta) {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `
      UPDATE contactos_db
      SET id_cuenta = NULL,
          nombre_empresa = COALESCE(NULLIF(nombre_empresa, ''), nombre_empresa),
          updated_at = NOW()
      WHERE id_contacto = $1
        AND ($2::text = '' OR id_cuenta = $2)
      RETURNING *
    `,
    [idContacto, idCuenta || ""],
  );

  const contacto = rows[0] ? normalizeContacto(rows[0]) : null;
  if (contacto && idCuenta) {
    await Promise.allSettled([
      addCuentaEvento({
        idCuenta,
        eventType: "Cambio por agente",
        detalles: `el usuario sistema, ha desvinculado el contacto ${idContacto} de esta cuenta`,
      }),
      addContactoEvento({
        idContacto,
        eventType: "Cambio por agente",
        detalles: `el usuario sistema, ha desvinculado este contacto de la cuenta ${idCuenta}`,
      }),
    ]);
  }
  return contacto;
}

export async function updateContacto(idContacto, data = {}) {
  const pool = getPgPool();
  const client = await pool.connect();
  const writable = [
    "id_cuenta",
    "nombre_contacto",
    "apellidos_contacto",
    "nombre_completo_contacto",
    "nombre_empresa",
    "telefono_contacto",
    "email_contacto",
    "cargo_contacto",
    "idiomas",
    "conocido_en",
    "contactado_en_feria",
    "suscripciones",
    "otros_datos_interes",
    "pais_contacto",
    "linkedin_cuenta",
    "url_contacto",
  ];

  try {
    await client.query("BEGIN");
    const { rows: beforeRows } = await client.query("SELECT * FROM contactos_db WHERE id_contacto=$1 LIMIT 1", [idContacto]);
    const before = beforeRows[0];
    if (!before) {
      await client.query("ROLLBACK");
      return null;
    }

    const columns = writable.filter((column) => data[column] !== undefined);
    if (!columns.length) {
      await client.query("COMMIT");
      return normalizeContacto(before);
    }

    if ((data.nombre_contacto !== undefined || data.apellidos_contacto !== undefined) && data.nombre_completo_contacto === undefined) {
      data.nombre_completo_contacto = `${data.nombre_contacto ?? before.nombre_contacto ?? ""} ${data.apellidos_contacto ?? before.apellidos_contacto ?? ""}`.trim();
      if (!columns.includes("nombre_completo_contacto")) columns.push("nombre_completo_contacto");
    }

    const values = columns.map((column) => (column === "suscripciones" ? JSON.stringify(Array.isArray(data[column]) ? data[column] : []) : data[column] ?? ""));
    values.push(idContacto);
    const assignments = columns.map((column, index) => `${column} = ${column === "suscripciones" ? `$${index + 1}::jsonb` : `$${index + 1}`}`);
    const { rows } = await client.query(
      `
        UPDATE contactos_db
        SET ${assignments.join(", ")}, updated_at=NOW()
        WHERE id_contacto=$${values.length}
        RETURNING *
      `,
      values,
    );
    const updated = rows[0];
    const idAgente = data.id_agente || "";
    for (const column of columns) {
      if (JSON.stringify(before[column] ?? "") !== JSON.stringify(updated[column] ?? "")) {
        const detail = formatChangeDetail(idAgente, `contacto.${column}`, before[column], updated[column]);
        await addContactoEvento({
          idContacto,
          idAgente,
          eventType: idAgente ? "Cambio por agente" : "Acción automatizada",
          detalles: detail,
        }, client);
        const idCuenta = updated.id_cuenta || before.id_cuenta;
        if (idCuenta) {
          await addCuentaEvento({
            idCuenta,
            idAgente,
            eventType: idAgente ? "Cambio por agente" : "Acción automatizada",
            detalles: `${detail} en el contacto ${idContacto}`,
          }, client);
        }
      }
    }
    await client.query("COMMIT");
    return normalizeContacto(updated);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteContacto(idContacto) {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `
      DELETE FROM contactos_db
      WHERE id_contacto = $1
      RETURNING *
    `,
    [idContacto],
  );

  const contacto = rows[0] ? normalizeContacto(rows[0]) : null;
  if (contacto) {
    await Promise.allSettled([
      contacto.id_cuenta ? addCuentaEvento({
        idCuenta: contacto.id_cuenta,
        eventType: "Cambio por agente",
        detalles: `el usuario sistema, ha eliminado el contacto ${idContacto} asociado a esta cuenta`,
      }) : null,
      addContactoEvento({
        idContacto,
        eventType: "Cambio por agente",
        detalles: `el usuario sistema, ha eliminado este contacto`,
      }),
    ]);
  }
  return contacto;
}
