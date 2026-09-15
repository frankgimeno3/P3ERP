import crypto from "node:crypto";
import { getPgPool } from "../../database/pgClient.js";
import { addCuentaEntityEvent, formatChangeDetail } from "../registroEventos/RegistroEventosRepository.js";
import { accountActivity } from "../comentario/AccountActivity.js";
import { createInvoiceDraft } from "../factura/FacturaClienteRepository.js";
import { lockIncome, ensureOrderReceipt, syncOrderCollections } from "../prevision/IncomeReconciliation.js";

const propuestaColumns = [
  "id_propuesta",
  "id_agente_propuesta",
  "estado_propuesta",
  "fase_propuesta",
  "fecha_envio_propuesta",
  "fecha_validez_propuesta",
  "nombre_propuesta",
  "comentarios_adicionales",
  "forma_cobro_propuesta",
  "descuento_final_propuesta",
  "importe_total_bi_propuesta",
  "iva_aplicable",
  "importe_propuesta_con_iva",
  "id_cuenta_propuesta",
  "id_contacto_propuesta",
  "cargo_contacto_propuesta",
  "datos_facturacion",
  "contacto_personalizado",
  "base_imponible_personalizada",
  "importe_base_personalizada",
  "es_intercambio",
  "condiciones_intercambio",
  "intercambio_precio_final",
  "intercambio_transferencias",
  "fecha_pago_proporcion3",
  "fecha_pago_contraparte",
  "importe_intercambio",
  "idioma_propuesta",
  "tipo_descuento_final",
  "transferencias_intercambio",
  "moneda",
  "comentarios_seguimiento",
  "acciones_proxima_gestion",
  "fecha_proxima_gestion",
];

const jsonColumns = new Set(["datos_facturacion", "contacto_personalizado", "transferencias_intercambio"]);

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function publicationYear(value) {
  const parts = String(value || "").trim().split(/[/-]/);
  const rawYear = parts.length >= 3 ? parts[2] : "";
  if (/^\d{4}$/.test(rawYear)) return rawYear;
  if (/^\d{2}$/.test(rawYear)) return `20${rawYear}`;
  return String(new Date().getFullYear());
}

function asJson(value, fallback) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

function normalizePropuesta(row, lineas = [], cobros = [], cuenta = null, contacto = null) {
  return {
    id_propuesta: row.id_propuesta,
    id_agente_propuesta: row.id_agente_propuesta ?? "",
    estado_propuesta: row.estado_propuesta ?? "",
    fase_propuesta: row.fase_propuesta ?? "1",
    fecha_envio_propuesta: row.fecha_envio_propuesta ?? "",
    fecha_validez_propuesta: row.fecha_validez_propuesta ?? "",
    nombre_propuesta: row.nombre_propuesta ?? "",
    comentarios_adicionales: row.comentarios_adicionales ?? "",
    forma_cobro_propuesta: row.forma_cobro_propuesta ?? "",
    descuento_final_propuesta: asNumber(row.descuento_final_propuesta),
    importe_total_bi_propuesta: asNumber(row.importe_total_bi_propuesta),
    iva_aplicable: Boolean(row.iva_aplicable),
    importe_propuesta_con_iva: asNumber(row.importe_propuesta_con_iva),
    id_cuenta_propuesta: row.id_cuenta_propuesta ?? "",
    id_contacto_propuesta: row.id_contacto_propuesta ?? "",
    cargo_contacto_propuesta: row.cargo_contacto_propuesta ?? "",
    datos_facturacion: asJson(row.datos_facturacion, {}),
    contacto_personalizado: asJson(row.contacto_personalizado, null),
    base_imponible_personalizada: Boolean(row.base_imponible_personalizada),
    importe_base_personalizada: asNumber(row.importe_base_personalizada),
    es_intercambio: Boolean(row.es_intercambio),
    condiciones_intercambio: row.condiciones_intercambio ?? "",
    intercambio_precio_final: Boolean(row.intercambio_precio_final),
    intercambio_transferencias: Boolean(row.intercambio_transferencias),
    fecha_pago_proporcion3: row.fecha_pago_proporcion3 ?? "",
    fecha_pago_contraparte: row.fecha_pago_contraparte ?? "",
    importe_intercambio: asNumber(row.importe_intercambio),
    idioma_propuesta: row.idioma_propuesta ?? "es",
    tipo_descuento_final: row.tipo_descuento_final ?? "porcentaje",
    transferencias_intercambio: asJson(row.transferencias_intercambio, []),
    moneda: row.moneda || "€",
    comentarios_seguimiento: row.comentarios_seguimiento ?? "",
    acciones_proxima_gestion: row.acciones_proxima_gestion ?? "",
    fecha_proxima_gestion: row.fecha_proxima_gestion ?? "",
    lineas,
    cobros,
    cuenta,
    contacto,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function normalizeLinea(row) {
  return {
    id_linea_propuesta: row.id_linea_propuesta,
    id_propuesta: row.id_propuesta ?? "",
    numero_linea_propuesta: row.numero_linea_propuesta ?? 0,
    id_servicio: row.id_servicio ?? "",
    id_publicacion: row.id_publicacion ?? "",
    medio: row.medio ?? "",
    publicacion: row.publicacion ?? "",
    producto: row.producto ?? "",
    precio_tarifa: asNumber(row.precio_tarifa),
    descuento_producto: asNumber(row.descuento_producto),
    tipo_descuento_producto: row.tipo_descuento_producto ?? "porcentaje",
    precio_unitario: asNumber(row.precio_unitario),
    unidades: asNumber(row.unidades, 1),
    descripcion_linea: row.descripcion_linea ?? "",
    deadline_publicacion: row.deadline_publicacion ?? "",
    fecha_publicacion_publicacion: row.fecha_publicacion_publicacion ?? "",
    especificaciones_linea: row.especificaciones_linea ?? "",
    modo_precio: row.modo_precio ?? "calculado",
    precio_total_personalizado: row.precio_total_personalizado == null ? null : asNumber(row.precio_total_personalizado),
    id_pagina_publicacion: row.id_pagina_publicacion ?? "",
  };
}

function normalizeCobro(row) {
  return {
    id_cobro_propuesta: row.id_cobro_propuesta,
    id_propuesta: row.id_propuesta ?? "",
    numero_cobro: row.numero_cobro ?? 0,
    fecha_cobro: row.fecha_cobro ?? "",
    importe_cobro: asNumber(row.importe_cobro),
    forma_cobro: row.forma_cobro ?? "",
    banco_cobro: row.banco_cobro ?? "",
    observaciones_cobro: row.observaciones_cobro ?? "",
  };
}

function normalizeCuenta(row) {
  if (!row) return null;
  return {
    id_cuenta: row.id_cuenta,
    nombre_empresa: row.nombre_empresa ?? "",
    pais_cuenta: row.pais_cuenta ?? "",
    id_agente: row.id_agente ?? "",
    vat_code: row.vat_code ?? "",
    nombre_fiscal: row.nombre_fiscal ?? "",
    pais_facturacion: row.pais_facturacion ?? "",
    direccion_facturacion: row.direccion_facturacion ?? "",
    mail_contabilidad: row.mail_contabilidad ?? "",
    poblacion_facturacion: row.poblacion_facturacion ?? "",
    cp_facturacion: row.cp_facturacion ?? "",
    detalles_facturacion: row.detalles_facturacion ?? "",
  };
}

function normalizeContacto(row) {
  if (!row) return null;
  return {
    id_contacto: row.id_contacto,
    id_cuenta: row.id_cuenta ?? "",
    nombre_completo_contacto: row.nombre_completo_contacto ?? "",
    email_contacto: row.email_contacto ?? "",
    cargo_contacto: row.cargo_contacto ?? "",
    telefono_contacto: row.telefono_contacto ?? "",
    nombre_empresa: row.nombre_empresa ?? "",
  };
}

function normalizeInputValue(column, value) {
  if (jsonColumns.has(column)) return JSON.stringify(value ?? (column === "contacto_personalizado" ? null : {}));
  if (column === "fecha_proxima_gestion") return value || null;
  if (["iva_aplicable", "base_imponible_personalizada", "es_intercambio", "intercambio_precio_final", "intercambio_transferencias"].includes(column)) return Boolean(value);
  if (["descuento_final_propuesta", "importe_total_bi_propuesta", "importe_propuesta_con_iva", "importe_base_personalizada", "importe_intercambio"].includes(column)) {
    return asNumber(value);
  }
  return value ?? "";
}

function generateId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

async function ensureWizardSchema(client) {
  await client.query(`ALTER TABLE propuestas_db
    ADD COLUMN IF NOT EXISTS base_imponible_personalizada BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS importe_base_personalizada NUMERIC,
    ADD COLUMN IF NOT EXISTS es_intercambio BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS condiciones_intercambio TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS intercambio_precio_final BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS intercambio_transferencias BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS fecha_pago_proporcion3 TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS fecha_pago_contraparte TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS importe_intercambio NUMERIC NOT NULL DEFAULT 0`);
  await client.query(`ALTER TABLE propuestas_db ADD COLUMN IF NOT EXISTS idioma_propuesta TEXT NOT NULL DEFAULT 'es', ADD COLUMN IF NOT EXISTS tipo_descuento_final TEXT NOT NULL DEFAULT 'porcentaje', ADD COLUMN IF NOT EXISTS transferencias_intercambio JSONB NOT NULL DEFAULT '[]'::jsonb`);
  await client.query(`ALTER TABLE propuestas_db ADD COLUMN IF NOT EXISTS moneda TEXT NOT NULL DEFAULT '€'`);
  await client.query(`ALTER TABLE propuestas_db
    ADD COLUMN IF NOT EXISTS comentarios_seguimiento TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS acciones_proxima_gestion TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS fecha_proxima_gestion DATE`);
}

async function addCuentaProposalComment(client, { idCuenta, idAgente, contenido }) {
  if (!idCuenta || !contenido) return;
  await client.query(
    `INSERT INTO comentarios_db (id_comentario, id_original_autor, id_last_editor, tipo_entidad, id_entidad, contenido_comentario)
     VALUES ($1, $2, $2, 'cuenta', $3, $4)`,
    [`com_${crypto.randomUUID().slice(0, 12)}`, idAgente || "", idCuenta, contenido],
  );
}

async function addProposalSummaryComment(client, propuesta, action = "creada", actorId = "") {
  const idCuenta = propuesta?.id_cuenta_propuesta;
  if (!idCuenta) return;
  const [agentResult, linesResult, paymentsResult] = await Promise.all([
    client.query(`SELECT nombre_completo_agente FROM agentes_db WHERE id_agente = $1 LIMIT 1`, [actorId || propuesta.id_agente_propuesta || ""]),
    client.query(`SELECT producto, medio, publicacion, descripcion_linea, especificaciones_linea, unidades FROM lineas_propuestas_db WHERE id_propuesta = $1 ORDER BY numero_linea_propuesta`, [propuesta.id_propuesta]),
    client.query(`SELECT fecha_cobro, importe_cobro, forma_cobro, banco_cobro FROM cobros_propuestas_db WHERE id_propuesta = $1 ORDER BY numero_cobro`, [propuesta.id_propuesta]),
  ]);
  const autor = agentResult.rows[0]?.nombre_completo_agente || propuesta.id_agente_propuesta || "sistema";
  const lineas = linesResult.rows.map((linea) => {
    const nombre = linea.producto || linea.medio || linea.publicacion || "Servicio";
    const detalle = [linea.descripcion_linea, linea.especificaciones_linea].filter(Boolean).join(" — ");
    return `${nombre}${detalle ? ` (${detalle})` : ""} x${Number(linea.unidades || 1)}`;
  });
  const pagos = paymentsResult.rows.map((pago) =>
    `${pago.fecha_cobro || "sin fecha"}: ${Number(pago.importe_cobro || 0).toFixed(2)} ${propuesta.moneda || "€"} mediante ${pago.forma_cobro || "método no indicado"}${pago.banco_cobro ? ` (${pago.banco_cobro})` : ""}`,
  );
  const importe = Number(propuesta.importe_propuesta_con_iva || propuesta.importe_total_bi_propuesta || 0).toFixed(2);
  const contenido = `Propuesta ${action} por ${autor}: ${propuesta.nombre_propuesta || propuesta.id_propuesta}. `
    + `Contenido: ${lineas.length ? lineas.join("; ") : "todavía sin líneas de servicio"}. `
    + `Importe: ${importe} ${propuesta.moneda || "€"}, con ${pagos.length} pago${pagos.length === 1 ? "" : "s"} que se desglosan así: ${pagos.length ? pagos.join("; ") : "todavía sin desglose"}.`;
  await addCuentaProposalComment(client, { idCuenta, idAgente: actorId || propuesta.id_agente_propuesta, contenido: `${contenido} Identificador: ${propuesta.id_propuesta}.` });
}

function todaySpanishWords() {
  const parts = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "2-digit", year: "numeric" }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  return `${get("day")} ${get("month")} ${get("year")}`;
}


function stableId(prefix, value) {
  return `${prefix}_${crypto.createHash("sha1").update(String(value)).digest("hex").slice(0, 16)}`;
}

async function assertProposalReadyForAcceptance(client, propuesta) {
  if (!propuesta?.id_propuesta) throw new Error("No se ha encontrado la propuesta que se quiere aceptar");
  const { rows } = await client.query(
    `SELECT
       (SELECT COUNT(*)::int FROM lineas_propuestas_db WHERE id_propuesta=$1) AS lineas,
       (SELECT COUNT(*)::int FROM cobros_propuestas_db WHERE id_propuesta=$1) AS cobros,
       (SELECT COUNT(*)::int FROM cobros_propuestas_db
        WHERE id_propuesta=$1 AND (fecha_cobro IS NULL OR btrim(fecha_cobro)='' OR importe_cobro IS NULL OR importe_cobro<=0)) AS cobros_incompletos`,
    [propuesta.id_propuesta],
  );
  if (!rows[0]?.lineas) throw new Error("No se puede aceptar la propuesta porque no tiene líneas de servicio");
  if (!rows[0]?.cobros) throw new Error("No se puede aceptar la propuesta porque no tiene cobros definidos");
  if (rows[0]?.cobros_incompletos) throw new Error("No se puede aceptar la propuesta porque tiene cobros incompletos");
  if (!propuesta.id_agente_propuesta || !propuesta.id_cuenta_propuesta) {
    throw new Error("No se puede aceptar la propuesta porque necesita agente y cuenta");
  }
}

async function finalizeProposal(client, propuesta, status, actorId = "") {
  await lockIncome(client);
  const accepted = status === "aceptada";
  const label = accepted ? "aceptada" : "rechazada";
  const note = `Propuesta ${label} en día ${todaySpanishWords()}`;
  const comments = [String(propuesta.comentarios_adicionales || "").trim(), note].filter(Boolean).join("\n");
  await client.query(`UPDATE propuestas_db SET comentarios_adicionales=$1, updated_at=NOW() WHERE id_propuesta=$2`, [comments, propuesta.id_propuesta]);
  await addCuentaProposalComment(client, {
    idCuenta: propuesta.id_cuenta_propuesta,
    idAgente: propuesta.id_agente_propuesta,
    contenido: `${note}: ${propuesta.nombre_propuesta || propuesta.id_propuesta}.`,
  });
  if (!accepted) { await accountActivity(client,propuesta.id_cuenta_propuesta,actorId,`ha rechazado la propuesta ${propuesta.id_propuesta}.`); return; }
  await assertProposalReadyForAcceptance(client, propuesta);

  const idContrato = `con_${propuesta.id_propuesta}`;
  await client.query(`
    ALTER TABLE contratos_db
      ADD COLUMN IF NOT EXISTS nombre_contrato TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS comentarios_adicionales TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS datos_facturacion JSONB NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS moneda TEXT NOT NULL DEFAULT 'EUR',
      ADD COLUMN IF NOT EXISTS propuesta_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS id_factura TEXT;
  `);
  await client.query(
    `INSERT INTO contratos_db (
      id_contrato,id_agente_contrato,fecha_cobro_prevista_contrato,forma_cobro_contrato,
      fecha_firma_contrato,fecha_fin_contrato,id_propuesta,descuento_final_contrato,
      importe_total_bi_contrato,iva_aplicable,importe_contrato_con_iva,id_cuenta_contrato,
      id_contacto_contrato,cargo_contacto_contrato,nombre_contrato,comentarios_adicionales,
      datos_facturacion,moneda,propuesta_snapshot
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18,$19::jsonb)
    ON CONFLICT (id_contrato) DO NOTHING`,
    [
      idContrato, propuesta.id_agente_propuesta || "", propuesta.fecha_pago_proporcion3 || "",
      propuesta.forma_cobro_propuesta || "", todaySpanishWords().replaceAll(" ", "/"),
      propuesta.fecha_validez_propuesta || "", propuesta.id_propuesta, propuesta.descuento_final_propuesta || 0,
      propuesta.importe_total_bi_propuesta || 0, Boolean(propuesta.iva_aplicable),
      propuesta.importe_propuesta_con_iva || 0, propuesta.id_cuenta_propuesta || "",
      propuesta.id_contacto_propuesta || "", propuesta.cargo_contacto_propuesta || "",
      propuesta.nombre_propuesta || "", comments, JSON.stringify(propuesta.datos_facturacion || {}),
      propuesta.moneda || "EUR", JSON.stringify(propuesta),
    ],
  );

  await client.query(`
    ALTER TABLE lineas_contratos_db
      ADD COLUMN IF NOT EXISTS id_linea_propuesta TEXT, ADD COLUMN IF NOT EXISTS id_servicio TEXT,
      ADD COLUMN IF NOT EXISTS id_publicacion TEXT, ADD COLUMN IF NOT EXISTS precio_tarifa NUMERIC NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS descuento_producto NUMERIC NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS tipo_descuento_producto TEXT NOT NULL DEFAULT 'porcentaje',
      ADD COLUMN IF NOT EXISTS precio_unitario NUMERIC NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS unidades NUMERIC NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS descripcion_linea TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS especificaciones_linea TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS modo_precio TEXT NOT NULL DEFAULT 'calculado',
      ADD COLUMN IF NOT EXISTS precio_total_personalizado NUMERIC,
      ADD COLUMN IF NOT EXISTS id_pagina_publicacion TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS linea_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE contenidos_db
      ADD COLUMN IF NOT EXISTS id_contrato TEXT, ADD COLUMN IF NOT EXISTS id_linea_contrato TEXT,
      ADD COLUMN IF NOT EXISTS nombre_contenido TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS tipo_contenido TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS fecha_publicacion TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS ano_publicacion TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS servicio TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS contenido_especifico_id TEXT NOT NULL DEFAULT '';
  `);
  const lineas = await client.query(`SELECT * FROM lineas_propuestas_db WHERE id_propuesta=$1 ORDER BY numero_linea_propuesta`, [propuesta.id_propuesta]);
  const contentIds = [];
  for (const linea of lineas.rows) {
    const idLinea = stableId("lcon", linea.id_linea_propuesta);
    const idContenido = stableId("cont", linea.id_linea_propuesta);
    contentIds.push(idContenido);
    await client.query(
      `INSERT INTO lineas_contratos_db (
        id_linea_contrato,id_contrato,numero_linea_contrato,id_linea_propuesta,id_servicio,id_publicacion,
        medio,publicacion,producto,precio_producto,precio_tarifa,descuento_producto,tipo_descuento_producto,
        precio_unitario,unidades,descripcion_linea,deadline_publicacion,fecha_publicacion_publicacion,
        estado_material_contrato,especificaciones_linea,modo_precio,precio_total_personalizado,
        id_pagina_publicacion,array_id_contenidos,linea_snapshot
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'pendiente de recibir materiales',$19,$20,$21,$22,$23::jsonb,$24::jsonb)
      ON CONFLICT (id_linea_contrato) DO UPDATE SET
        id_contrato=EXCLUDED.id_contrato,id_linea_propuesta=EXCLUDED.id_linea_propuesta,
        array_id_contenidos=EXCLUDED.array_id_contenidos,linea_snapshot=EXCLUDED.linea_snapshot,updated_at=NOW()`,
      [idLinea,idContrato,linea.numero_linea_propuesta,linea.id_linea_propuesta,linea.id_servicio,linea.id_publicacion,
        linea.medio,linea.publicacion,linea.producto,linea.precio_unitario,linea.precio_tarifa,linea.descuento_producto,
        linea.tipo_descuento_producto,linea.precio_unitario,linea.unidades,linea.descripcion_linea,linea.deadline_publicacion,
        linea.fecha_publicacion_publicacion,linea.especificaciones_linea,linea.modo_precio,linea.precio_total_personalizado,
        linea.id_pagina_publicacion,JSON.stringify([idContenido]),JSON.stringify(linea)],
    );
    const publicationDate = linea.fecha_publicacion_publicacion || "";
    await client.query(
      `INSERT INTO contenidos_db (
        id_contenido,id_publicacion,id_cuenta,especificaciones_contenido,id_agente,estado_contenido,
        deadline_contenido,hoja_prod,id_contrato,id_linea_contrato,nombre_contenido,
        tipo_contenido,fecha_publicacion,ano_publicacion,servicio,contenido_especifico_id
      ) VALUES ($1,$2,$3,$4,$5,'pendiente de recibir materiales',$6,TRUE,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (id_contenido) DO UPDATE SET
        id_cuenta=EXCLUDED.id_cuenta,id_agente=EXCLUDED.id_agente,
        id_contrato=EXCLUDED.id_contrato,id_linea_contrato=EXCLUDED.id_linea_contrato,
        ano_publicacion=EXCLUDED.ano_publicacion,updated_at=NOW()`,
      [idContenido,linea.id_publicacion,propuesta.id_cuenta_propuesta,linea.especificaciones_linea || linea.descripcion_linea,
        propuesta.id_agente_propuesta,linea.deadline_publicacion,idContrato,idLinea,
        linea.producto || linea.descripcion_linea || `Contenido ${linea.numero_linea_propuesta}`,
        linea.medio || linea.producto || "",publicationDate,publicationYear(publicationDate),
        linea.id_servicio || "",linea.id_publicacion || ""],
    );
  }
  await client.query(
    `UPDATE contratos_db SET array_contenidos=$1::jsonb WHERE id_contrato=$2`,
    [JSON.stringify(contentIds.map((idContenido) => ({ id_contenido: idContenido }))), idContrato],
  );

  const proposalPayments = await client.query(
    `SELECT * FROM cobros_propuestas_db WHERE id_propuesta=$1 ORDER BY numero_cobro,created_at`,
    [propuesta.id_propuesta],
  );
  const orderIds = [];
  for (const payment of proposalPayments.rows) {
    const idCobroContrato = stableId("ccon", payment.id_cobro_propuesta);
    const idOrden = stableId("ord", payment.id_cobro_propuesta);
    const bank = /santander/i.test(payment.banco_cobro || "") ? "Santander" : "Sabadell";
    const total = Number(propuesta.importe_propuesta_con_iva || 0);
    const base = Number(propuesta.importe_total_bi_propuesta || 0);
    const paymentBase = total > 0 ? Number(payment.importe_cobro || 0) * base / total : Number(payment.importe_cobro || 0);
    orderIds.push(idOrden);
    await client.query(
      `INSERT INTO cobros_contratos_db (
        id_cobro_contrato,id_contrato,id_cobro_propuesta,numero_cobro,fecha_cobro,
        importe_cobro,forma_cobro,banco_cobro,observaciones_cobro
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id_cobro_contrato) DO UPDATE SET
        id_contrato=EXCLUDED.id_contrato,id_cobro_propuesta=EXCLUDED.id_cobro_propuesta,
        numero_cobro=EXCLUDED.numero_cobro,fecha_cobro=EXCLUDED.fecha_cobro,
        importe_cobro=EXCLUDED.importe_cobro,forma_cobro=EXCLUDED.forma_cobro,
        banco_cobro=EXCLUDED.banco_cobro,observaciones_cobro=EXCLUDED.observaciones_cobro,updated_at=NOW()`,
      [idCobroContrato,idContrato,payment.id_cobro_propuesta,payment.numero_cobro,payment.fecha_cobro,
        payment.importe_cobro,payment.forma_cobro,bank,payment.observaciones_cobro],
    );
    await client.query(
      `INSERT INTO ordenes_db (
        id_orden,id_contrato,numero_cobro,etiqueta_cobro,fecha_teorica_cobro,forma_cobro,
        banco_cobro,base_imponible,cobro_total,id_cuenta,cobrada,id_cobro_contrato,id_cobro_propuesta
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,FALSE,$11,$12)
       ON CONFLICT (id_orden) DO UPDATE SET
        id_contrato=EXCLUDED.id_contrato,numero_cobro=EXCLUDED.numero_cobro,
        fecha_teorica_cobro=EXCLUDED.fecha_teorica_cobro,forma_cobro=EXCLUDED.forma_cobro,
        banco_cobro=EXCLUDED.banco_cobro,base_imponible=EXCLUDED.base_imponible,
        cobro_total=EXCLUDED.cobro_total,id_cuenta=EXCLUDED.id_cuenta,
        id_cobro_contrato=EXCLUDED.id_cobro_contrato,id_cobro_propuesta=EXCLUDED.id_cobro_propuesta,updated_at=NOW()`,
      [idOrden,idContrato,payment.numero_cobro,`Cobro ${payment.numero_cobro || orderIds.length}`,
        payment.fecha_cobro,payment.forma_cobro,bank,paymentBase,payment.importe_cobro,
        propuesta.id_cuenta_propuesta,idCobroContrato,payment.id_cobro_propuesta],
    );
  }
  await client.query(
    `UPDATE contratos_db SET array_id_ordenes=$1::jsonb,updated_at=NOW() WHERE id_contrato=$2`,
    [JSON.stringify(orderIds),idContrato],
  );
  const contract = (await client.query('SELECT id_factura FROM contratos_db WHERE id_contrato=$1', [idContrato])).rows[0];
  const invoiceId = contract.id_factura || (await createInvoiceDraft(idContrato,actorId,client)).id_factura_cliente;
  for (const orderId of orderIds) await ensureOrderReceipt(client,orderId,actorId);
  await syncOrderCollections(client,orderIds,actorId);
  await accountActivity(client,propuesta.id_cuenta_propuesta,actorId,`ha confirmado la propuesta ${propuesta.id_propuesta}; factura en proceso ${invoiceId}, con las órdenes ${orderIds.join(', ')}.`);
}

async function loadProposalExtras(client, proposalIds) {
  if (!proposalIds.length) return { lineasById: new Map(), cobrosById: new Map() };

  const [lineasResult, cobrosResult] = await Promise.all([
    client.query(
      `
        SELECT *
        FROM lineas_propuestas_db
        WHERE id_propuesta = ANY($1::text[])
        ORDER BY id_propuesta ASC, numero_linea_propuesta ASC, created_at ASC
      `,
      [proposalIds],
    ),
    client.query(
      `
        SELECT *
        FROM cobros_propuestas_db
        WHERE id_propuesta = ANY($1::text[])
        ORDER BY id_propuesta ASC, numero_cobro ASC, created_at ASC
      `,
      [proposalIds],
    ),
  ]);

  const lineasById = new Map(proposalIds.map((id) => [id, []]));
  for (const row of lineasResult.rows) {
    const id = row.id_propuesta;
    if (!lineasById.has(id)) lineasById.set(id, []);
    lineasById.get(id).push(normalizeLinea(row));
  }

  const cobrosById = new Map(proposalIds.map((id) => [id, []]));
  for (const row of cobrosResult.rows) {
    const id = row.id_propuesta;
    if (!cobrosById.has(id)) cobrosById.set(id, []);
    cobrosById.get(id).push(normalizeCobro(row));
  }

  return { lineasById, cobrosById };
}

export async function getPropuestas(filters = {}) {
  const pool = getPgPool();
  await ensureWizardSchema(pool);
  const values = [];
  const where = [];

  if (filters.idCuenta) {
    values.push(filters.idCuenta);
    where.push(`p.id_cuenta_propuesta = $${values.length}`);
  }

  if (filters.estado) {
    values.push(filters.estado);
    where.push(`p.estado_propuesta = $${values.length}`);
  }

  if (filters.agente) {
    values.push(filters.agente);
    where.push(`p.id_agente_propuesta = $${values.length}`);
  }

  if (filters.cliente) {
    values.push(`%${filters.cliente}%`);
    where.push(`c.nombre_empresa ILIKE $${values.length}`);
  }

  if (filters.codigoCrm) {
    values.push(`%${filters.codigoCrm}%`);
    where.push(`p.id_cuenta_propuesta ILIKE $${values.length}`);
  }

  const { rows } = await pool.query(
    `
      SELECT p.*, c.nombre_empresa
      FROM propuestas_db p
      LEFT JOIN cuentas_db c ON c.id_cuenta = p.id_cuenta_propuesta
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY
        NULLIF(p.fecha_envio_propuesta, '') DESC NULLS LAST,
        p.created_at DESC
    `,
    values,
  );

  const ids = rows.map((row) => row.id_propuesta);
  const { lineasById, cobrosById } = await loadProposalExtras(pool, ids);
  return rows.map((row) =>
    normalizePropuesta(row, lineasById.get(row.id_propuesta) ?? [], cobrosById.get(row.id_propuesta) ?? [], {
      id_cuenta: row.id_cuenta_propuesta ?? "",
      nombre_empresa: row.nombre_empresa ?? "",
    }),
  );
}

export async function getPropuestaById(idPropuesta) {
  const pool = getPgPool();
  await ensureWizardSchema(pool);
  const { rows } = await pool.query(
    `
      SELECT p.*, c.*, ct.id_contacto, ct.nombre_completo_contacto, ct.email_contacto, ct.cargo_contacto, ct.telefono_contacto,
             con.id_contrato AS contrato_creado_id
      FROM propuestas_db p
      LEFT JOIN cuentas_db c ON c.id_cuenta = p.id_cuenta_propuesta
      LEFT JOIN contactos_db ct ON ct.id_contacto = p.id_contacto_propuesta
      LEFT JOIN contratos_db con ON con.id_propuesta = p.id_propuesta
      WHERE p.id_propuesta = $1
      LIMIT 1
    `,
    [idPropuesta],
  );

  if (!rows[0]) return null;
  const { lineasById, cobrosById } = await loadProposalExtras(pool, [idPropuesta]);
  return {
    ...normalizePropuesta(
    rows[0],
    lineasById.get(idPropuesta) ?? [],
    cobrosById.get(idPropuesta) ?? [],
    normalizeCuenta(rows[0]),
    normalizeContacto(rows[0].id_contacto ? rows[0] : null),
    ),
    contrato_creado_id: rows[0].contrato_creado_id ?? "",
  };
}

async function replaceLineas(client, idPropuesta, lineas = []) {
  await client.query(`ALTER TABLE lineas_propuestas_db ADD COLUMN IF NOT EXISTS id_publicacion TEXT`);
  await client.query(`ALTER TABLE lineas_propuestas_db ADD COLUMN IF NOT EXISTS tipo_descuento_producto TEXT NOT NULL DEFAULT 'porcentaje'`);
  await client.query(`ALTER TABLE lineas_propuestas_db ADD COLUMN IF NOT EXISTS especificaciones_linea TEXT NOT NULL DEFAULT ''`);
  await client.query(`ALTER TABLE lineas_propuestas_db ADD COLUMN IF NOT EXISTS modo_precio TEXT NOT NULL DEFAULT 'calculado'`);
  await client.query(`ALTER TABLE lineas_propuestas_db ADD COLUMN IF NOT EXISTS precio_total_personalizado NUMERIC`);
  await client.query(`ALTER TABLE lineas_propuestas_db ADD COLUMN IF NOT EXISTS id_pagina_publicacion TEXT NOT NULL DEFAULT ''`);
  await client.query("DELETE FROM lineas_propuestas_db WHERE id_propuesta = $1", [idPropuesta]);
  for (let index = 0; index < lineas.length; index += 1) {
    const linea = lineas[index] ?? {};
    await client.query(
      `
        INSERT INTO lineas_propuestas_db (
          id_linea_propuesta,
          id_propuesta,
          numero_linea_propuesta,
          id_servicio,
          id_publicacion,
          medio,
          publicacion,
          producto,
          precio_tarifa,
          descuento_producto,
          tipo_descuento_producto,
          precio_unitario,
          unidades,
          descripcion_linea,
          deadline_publicacion,
          fecha_publicacion_publicacion,
          especificaciones_linea,
          modo_precio,
          precio_total_personalizado,
          id_pagina_publicacion
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      `,
      [
        linea.id_linea_propuesta || generateId("linprop"),
        idPropuesta,
        Number(linea.numero_linea_propuesta ?? index + 1),
        linea.id_servicio ?? "",
        linea.id_publicacion ?? linea.publicacion_id ?? "",
        linea.medio ?? "",
        linea.publicacion ?? "",
        linea.producto ?? "",
        asNumber(linea.precio_tarifa),
        asNumber(linea.descuento_producto),
        linea.tipo_descuento_producto ?? "porcentaje",
        asNumber(linea.precio_unitario),
        asNumber(linea.unidades, 1),
        linea.descripcion_linea ?? "",
        linea.deadline_publicacion ?? "",
        linea.fecha_publicacion_publicacion ?? "",
        linea.especificaciones_linea ?? "",
        linea.modo_precio ?? "calculado",
        linea.precio_total_personalizado == null ? null : asNumber(linea.precio_total_personalizado),
        linea.id_pagina_publicacion ?? "",
      ],
    );
  }
}

async function replaceCobros(client, idPropuesta, cobros = []) {
  await client.query("DELETE FROM cobros_propuestas_db WHERE id_propuesta = $1", [idPropuesta]);
  for (let index = 0; index < cobros.length; index += 1) {
    const cobro = cobros[index] ?? {};
    await client.query(
      `
        INSERT INTO cobros_propuestas_db (
          id_cobro_propuesta,
          id_propuesta,
          numero_cobro,
          fecha_cobro,
          importe_cobro,
          forma_cobro,
          banco_cobro,
          observaciones_cobro
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        cobro.id_cobro_propuesta || generateId("cobprop"),
        idPropuesta,
        Number(cobro.numero_cobro ?? index + 1),
        cobro.fecha_cobro ?? "",
        asNumber(cobro.importe_cobro),
        cobro.forma_cobro ?? "",
        cobro.banco_cobro ?? "",
        cobro.observaciones_cobro ?? "",
      ],
    );
  }
}

export async function createPropuesta(payload, actorId = "") {
  const pool = getPgPool();
  const client = await pool.connect();
  const idPropuesta = payload.id_propuesta || generateId("prop");

  try {
    await client.query("BEGIN");
    await ensureWizardSchema(client);
    const data = {
      id_propuesta: idPropuesta,
      estado_propuesta: "Borrador",
      fase_propuesta: "1",
      ...payload,
      id_propuesta: idPropuesta,
    };
    if (["pendiente", "aceptada", "rechazada"].includes(String(data.estado_propuesta).toLowerCase()) && String(data.fase_propuesta) !== "4") {
      throw new Error("Una propuesta debe completar la fase de revisión antes de pasar a pendiente, aceptada o rechazada");
    }
    const columns = propuestaColumns.filter((column) => data[column] !== undefined);
    const values = columns.map((column) => normalizeInputValue(column, data[column]));
    const placeholders = columns.map((column, index) => (jsonColumns.has(column) ? `$${index + 1}::jsonb` : `$${index + 1}`));

    await client.query(
      `
        INSERT INTO propuestas_db (${columns.join(", ")})
        VALUES (${placeholders.join(", ")})
      `,
      values,
    );
    await replaceLineas(client, idPropuesta, payload.lineas ?? []);
    await replaceCobros(client, idPropuesta, payload.cobros ?? []);
    await addProposalSummaryComment(client, data, "creada", actorId);
    if (["aceptada", "rechazada"].includes(String(data.estado_propuesta).toLowerCase())) await finalizeProposal(client,data,String(data.estado_propuesta).toLowerCase(),actorId);
    await addCuentaEntityEvent({
      idCuenta: data.id_cuenta_propuesta,
      idAgente: data.id_agente_propuesta || payload.id_agente || "",
      entity: "propuesta",
      entityId: idPropuesta,
      action: "creado",
    }, client);
    await client.query("COMMIT");
    return getPropuestaById(idPropuesta);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updatePropuesta(idPropuesta, payload, actorId = "") {
  const pool = getPgPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await ensureWizardSchema(client);
    const { rows: beforeRows } = await client.query("SELECT * FROM propuestas_db WHERE id_propuesta = $1 LIMIT 1", [idPropuesta]);
    const before = beforeRows[0] || null;
    const nextStatus = String(payload.estado_propuesta ?? before?.estado_propuesta ?? "").toLowerCase();
    const nextPhase = String(payload.fase_propuesta ?? before?.fase_propuesta ?? "1");
    const changesLifecycle = payload.estado_propuesta !== undefined || payload.fase_propuesta !== undefined;
    if (changesLifecycle && ["pendiente", "aceptada", "rechazada"].includes(nextStatus) && nextPhase !== "4") {
      throw new Error("Una propuesta debe completar la fase de revisión antes de pasar a pendiente, aceptada o rechazada");
    }
    const columns = propuestaColumns.filter((column) => column !== "id_propuesta" && payload[column] !== undefined);
    if (columns.length) {
      const values = columns.map((column) => normalizeInputValue(column, payload[column]));
      values.push(idPropuesta);
      const assignments = columns.map((column, index) => `${column} = ${jsonColumns.has(column) ? `$${index + 1}::jsonb` : `$${index + 1}`}`);
      await client.query(
        `
          UPDATE propuestas_db
          SET ${assignments.join(", ")}, updated_at = NOW()
          WHERE id_propuesta = $${values.length}
        `,
        values,
      );
    }
    if (Array.isArray(payload.lineas)) await replaceLineas(client, idPropuesta, payload.lineas);
    if (Array.isArray(payload.cobros)) await replaceCobros(client, idPropuesta, payload.cobros);
    const { rows: afterRows } = await client.query("SELECT * FROM propuestas_db WHERE id_propuesta = $1 LIMIT 1", [idPropuesta]);
    const after = afterRows[0] || before;
    const idCuenta = after?.id_cuenta_propuesta || before?.id_cuenta_propuesta;
    const idAgente = actorId || after?.id_agente_propuesta || before?.id_agente_propuesta || "";
    const changedColumns = columns.filter((column) => JSON.stringify(before?.[column] ?? "") !== JSON.stringify(after?.[column] ?? ""));
    const followUpLabels = {
      fecha_proxima_gestion: "fecha de próxima gestión",
      acciones_proxima_gestion: "acciones de próxima gestión",
      comentarios_seguimiento: "comentarios de seguimiento",
    };
    for (const column of changedColumns) {
      await addCuentaEntityEvent({
        idCuenta,
        idAgente,
        entity: "propuesta",
        entityId: idPropuesta,
        action: "modificado",
        details: formatChangeDetail(idAgente, `propuesta.${column}`, before?.[column], after?.[column]),
      }, client);
      if (followUpLabels[column]) {
        const value = after?.[column] === null || after?.[column] === undefined || after?.[column] === "" ? "vacío" : String(after[column]);
        await addCuentaProposalComment(client, {
          idCuenta,
          idAgente,
          contenido: `Seguimiento de la propuesta ${after?.nombre_propuesta || idPropuesta}: ${followUpLabels[column]} actualizado a «${value}».`,
        });
      }
    }
    if (Array.isArray(payload.lineas)) {
      await addCuentaEntityEvent({ idCuenta, idAgente, entity: "líneas de propuesta", entityId: idPropuesta, action: "modificado" }, client);
    }
    if (Array.isArray(payload.cobros)) {
      await addCuentaEntityEvent({ idCuenta, idAgente, entity: "cobros de propuesta", entityId: idPropuesta, action: "modificado" }, client);
    }
    const previousStatus = String(before?.estado_propuesta || "").toLowerCase();
    const finalizedStatus = String(after?.estado_propuesta || "").toLowerCase();
    if (["aceptada", "rechazada"].includes(finalizedStatus) && previousStatus !== finalizedStatus) {
      await finalizeProposal(client, after, finalizedStatus, actorId);
    }
    if (finalizedStatus === "aceptada" && payload.rechazar_otras_pendientes === true) {
      const otherPending = await client.query(
        `UPDATE propuestas_db
         SET estado_propuesta='Rechazada',updated_at=NOW()
         WHERE id_propuesta<>$1
           AND id_agente_propuesta=$2
           AND id_cuenta_propuesta=$3
           AND lower(estado_propuesta)='pendiente'
         RETURNING *`,
        [idPropuesta,after.id_agente_propuesta,after.id_cuenta_propuesta],
      );
      for (const rejectedProposal of otherPending.rows) {
        await finalizeProposal(client, rejectedProposal, "rechazada", actorId);
        await addCuentaEntityEvent({
          idCuenta: rejectedProposal.id_cuenta_propuesta,
          idAgente: rejectedProposal.id_agente_propuesta,
          entity: "propuesta",
          entityId: rejectedProposal.id_propuesta,
          action: "modificado",
          details: `Estado cambiado automáticamente de Pendiente a Rechazada al aceptar ${idPropuesta}.`,
        }, client);
      }
    }
    const wasFinal = String(before?.estado_propuesta || "").toLowerCase() === "pendiente";
    const isFinal = String(after?.estado_propuesta || "").toLowerCase() === "pendiente";
    if (!wasFinal && isFinal) await addProposalSummaryComment(client, after, "finalizada", actorId);
    if (changedColumns.length || Array.isArray(payload.lineas) || Array.isArray(payload.cobros)) await accountActivity(client,idCuenta,actorId,`ha modificado la propuesta ${idPropuesta} (${[...changedColumns,...(Array.isArray(payload.lineas)?['líneas']:[]),...(Array.isArray(payload.cobros)?['cobros']:[])].join(', ')}).`);
    await client.query("COMMIT");
    return getPropuestaById(idPropuesta);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deletePropuesta(idPropuesta, actorId = "") {
  const pool = getPgPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const { rows: beforeRows } = await client.query("SELECT * FROM propuestas_db WHERE id_propuesta = $1 LIMIT 1", [idPropuesta]);
    await client.query("DELETE FROM cobros_propuestas_db WHERE id_propuesta = $1", [idPropuesta]);
    await client.query("DELETE FROM lineas_propuestas_db WHERE id_propuesta = $1", [idPropuesta]);
    const { rows } = await client.query("DELETE FROM propuestas_db WHERE id_propuesta = $1 RETURNING *", [idPropuesta]);
    const before = rows[0] || beforeRows[0];
    if (before) await accountActivity(client,before.id_cuenta_propuesta,actorId,`ha eliminado la propuesta ${idPropuesta} (${before.nombre_propuesta || ''}).`);
    await addCuentaEntityEvent({
      idCuenta: before?.id_cuenta_propuesta,
      idAgente: before?.id_agente_propuesta || "",
      entity: "propuesta",
      entityId: idPropuesta,
      action: "eliminado",
    }, client);
    await client.query("COMMIT");
    return rows[0] ? normalizePropuesta(rows[0]) : null;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
