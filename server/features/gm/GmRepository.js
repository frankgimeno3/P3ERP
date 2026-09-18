import { getPgPool } from "../../database/pgClient.js";

const text = (value) => value ?? "";

function splitName(fullName = "") {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { nombre: parts[0] || "", apellidos: "" };
  return { nombre: parts[0], apellidos: parts.slice(1).join(" ") };
}

function toDateInput(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
}

function mapCuenta(row, contactos = []) {
  const datos = row.datos_comerciales ?? {};
  const primaryContact = contactos[0];

  return {
    codigo: row.id_cuenta,
    nombre: text(row.nombre_empresa),
    razonSocial: text(row.nombre_fiscal || row.nombre_empresa),
    tipoCliente: text(row.tipo_cuenta),
    nombreFiscal: text(row.nombre_fiscal),
    nCial: text(row.vat_code || row.id_edisoft),
    nCialPFisica: text(datos.nCialPFisica || row.vat_code),
    nFiscal: text(row.nombre_fiscal),
    nComercial: text(row.nombre_empresa),
    departamento: text(datos.departamento),
    direccion: text(row.direccion_facturacion || datos.domicilio),
    domicilio: text(row.direccion_facturacion || datos.domicilio),
    codigoPostal: text(row.cp_facturacion),
    ciudad: text(row.poblacion_facturacion),
    poblacion: text(row.poblacion_facturacion),
    prefijo: text(datos.prefijo),
    telefono: text(datos.telefono1 || datos.telefono || primaryContact?.telefono_contacto),
    telefono1: text(datos.telefono1 || primaryContact?.telefono_contacto),
    telefono2: text(datos.telefono2),
    fax: text(datos.fax),
    movil: text(datos.movil),
    nif: text(row.vat_code),
    nifCif: text(row.vat_code),
    pais: text(row.pais_facturacion || row.pais_cuenta),
    web: text(datos.web),
    email: text(row.correo_principal || primaryContact?.email_contacto),
    telefonoPrincipal: text(datos.telefonoPrincipal || datos.telefono1 || primaryContact?.telefono_contacto),
    responsable: text(datos.responsable || primaryContact?.nombre_completo_contacto),
    estado: text(row.potencial_actual_relacion || datos.estado),
    sector: text(row.actividades_cuenta || datos.sector),
    canal: text(datos.canal),
    observaciones: text(row.descripcion_cuenta),
    fechaAlta: toDateInput(row.created_at),
    fechaUltimaModificacion: toDateInput(row.updated_at),
    riesgo: text(datos.riesgo),
    formaPago: text(datos.formaPago),
    actividad: text(row.descripcion_actividad || datos.actividad),
    contactoPrincipal: text(primaryContact?.nombre_completo_contacto || datos.contactoPrincipal),
    codigoAgente: text(row.id_agente),
    nombreAgente: text(row.nombre_completo_agente),
    agente: text(row.nombre_completo_agente || row.id_agente),
    comentarios_gm: text(row.comentarios_gm),
  };
}

function mapContacto(row) {
  return {
    contactId: row.id_contacto,
    codigo: row.id_cuenta ?? "",
    name: row.nombre_completo_contacto ?? "",
    charge: row.cargo_contacto ?? "",
    email: row.email_contacto ?? "",
    phone: row.telefono_contacto ?? "",
  };
}

function mapAgente(row) {
  return {
    codigo: row.id_agente,
    nombre: row.nombre_completo_agente || row.id_agente,
  };
}

function cuentaPayload(account) {
  const datos = {
    departamento: account.departamento ?? "",
    prefijo: account.prefijo ?? "",
    telefono: account.telefono ?? "",
    telefono1: account.telefono1 ?? account.telefono ?? "",
    telefono2: account.telefono2 ?? "",
    fax: account.fax ?? "",
    movil: account.movil ?? "",
    web: account.web ?? "",
    telefonoPrincipal: account.telefonoPrincipal ?? "",
    responsable: account.responsable ?? "",
    estado: account.estado ?? "",
    canal: account.canal ?? "",
    riesgo: account.riesgo ?? "",
    formaPago: account.formaPago ?? "",
    actividad: account.actividad ?? "",
    contactoPrincipal: account.contactoPrincipal ?? "",
    nCialPFisica: account.nCialPFisica ?? "",
  };

  return {
    id_cuenta: account.codigo,
    nombre_empresa: account.nComercial || account.nombre || "",
    pais_cuenta: account.pais || "",
    id_agente: account.codigoAgente || "",
    id_edisoft: account.nCial || "",
    tipo_cuenta: account.tipoCliente || "",
    descripcion_cuenta: account.observaciones || "",
    actividades_cuenta: account.sector || "",
    descripcion_actividad: account.actividad || "",
    correo_principal: account.email || "",
    vat_code: account.nifCif || account.nif || "",
    nombre_fiscal: account.nombreFiscal || account.nFiscal || account.razonSocial || "",
    pais_facturacion: account.pais || "",
    direccion_facturacion: account.domicilio || account.direccion || "",
    poblacion_facturacion: account.poblacion || account.ciudad || "",
    cp_facturacion: account.codigoPostal || "",
    potencial_actual_relacion: account.estado || "",
    detalles_facturacion: account.observaciones || "",
    datos_comerciales: datos,
    comentarios_gm: account.comentarios_gm || "",
  };
}

async function getContactos(pool, idCuenta) {
  const { rows } = await pool.query(
    `
      SELECT *
      FROM comercial_contactos
      WHERE id_cuenta = $1
      ORDER BY nombre_completo_contacto ASC
    `,
    [idCuenta],
  );
  return rows;
}

async function getAgentes(pool) {
  const { rows } = await pool.query(`
    SELECT id_agente, nombre_completo_agente
    FROM agentes_db
    ORDER BY nombre_completo_agente ASC
  `);
  return rows.map(mapAgente);
}

export async function getGmCuentas() {
  const pool = getPgPool();
  const { rows } = await pool.query(`
    SELECT c.*, a.nombre_completo_agente
    FROM comercial_cuentas c
    LEFT JOIN agentes_db a ON a.id_agente = c.id_agente
    ORDER BY c.created_at DESC
  `);

  return rows.map((row) => mapCuenta(row));
}

export async function getGmCuentaByCodigo(codigo) {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `
      SELECT c.*, a.nombre_completo_agente
      FROM comercial_cuentas c
      LEFT JOIN agentes_db a ON a.id_agente = c.id_agente
      WHERE c.id_cuenta = $1
      LIMIT 1
    `,
    [codigo],
  );

  if (!rows[0]) return null;

  const contactos = await getContactos(pool, codigo);
  const agentes = await getAgentes(pool);

  return {
    cuenta: mapCuenta(rows[0], contactos),
    contactos: contactos.map(mapContacto),
    agentes,
  };
}

export async function getNextGmCodigo() {
  const pool = getPgPool();
  const { rows } = await pool.query(`
    SELECT id_cuenta
    FROM comercial_cuentas
    WHERE id_cuenta ~ '^[0-9]+$'
    ORDER BY id_cuenta::bigint DESC
    LIMIT 1
  `);

  const next = rows[0]?.id_cuenta ? Number(rows[0].id_cuenta) + 1 : 1;
  return String(next).padStart(3, "0");
}

export async function getGmAgentes() {
  return getAgentes(getPgPool());
}

export async function upsertGmCuenta(account, contactos = []) {
  const pool = getPgPool();
  const payload = cuentaPayload(account);
  const columns = Object.keys(payload);
  const values = columns.map((column) => payload[column]);
  const placeholders = columns.map((_, index) => `$${index + 1}`);
  const updates = columns
    .filter((column) => column !== "id_cuenta")
    .map((column) => `${column} = EXCLUDED.${column}`);

  await pool.query(
    `
      INSERT INTO comercial_cuentas (${columns.join(", ")})
      VALUES (${placeholders.join(", ")})
      ON CONFLICT (id_cuenta) DO UPDATE
      SET ${updates.join(", ")}, updated_at = NOW()
    `,
    values,
  );

  for (const contact of contactos) {
    const idContacto = contact.contactId && !String(contact.contactId).startsWith("nuevo-")
      ? String(contact.contactId)
      : `gm_${payload.id_cuenta}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const { nombre, apellidos } = splitName(contact.name);

    await pool.query(
      `
        INSERT INTO comercial_contactos (
          id_contacto,
          id_cuenta,
          nombre_contacto,
          apellidos_contacto,
          nombre_completo_contacto,
          nombre_empresa,
          telefono_contacto,
          email_contacto,
          cargo_contacto
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id_contacto) DO UPDATE
        SET id_cuenta = EXCLUDED.id_cuenta,
            nombre_contacto = EXCLUDED.nombre_contacto,
            apellidos_contacto = EXCLUDED.apellidos_contacto,
            nombre_completo_contacto = EXCLUDED.nombre_completo_contacto,
            nombre_empresa = EXCLUDED.nombre_empresa,
            telefono_contacto = EXCLUDED.telefono_contacto,
            email_contacto = EXCLUDED.email_contacto,
            cargo_contacto = EXCLUDED.cargo_contacto,
            updated_at = NOW()
      `,
      [
        idContacto,
        payload.id_cuenta,
        nombre,
        apellidos,
        contact.name || "",
        payload.nombre_empresa,
        contact.phone || "",
        contact.email || "",
        contact.charge || "",
      ],
    );
  }

  return getGmCuentaByCodigo(payload.id_cuenta);
}

export async function deleteGmContacto(idContacto, idCuenta) {
  const pool = getPgPool();
  await pool.query(
    `
      DELETE FROM comercial_contactos
      WHERE id_contacto = $1
        AND id_cuenta = $2
    `,
    [idContacto, idCuenta],
  );
}
