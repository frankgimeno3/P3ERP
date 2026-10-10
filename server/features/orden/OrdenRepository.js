import {resolveIdentifier} from '../identifiers/IdentifierAliases.js';
import { getPgPool } from "../../database/pgClient.js";

function numberOrZero(value) {
  return value === null || value === undefined ? 0 : Number(value);
}

function normalizeOrden(row) {
  return {
    id_orden: row.id_orden,
    updated_at: row.updated_at,
    cobro_cerrado: Boolean(row.datos_importacion?.cierre_cobro?.activo),
    cierre_cobro: row.datos_importacion?.cierre_cobro || null,
    cancelada: Boolean(row.cancelada),
    estado: row.cancelada ? 'Cancelada' : row.datos_importacion?.cierre_cobro?.activo ? 'Cerrada por acuerdo' : row.datos_importacion?.sin_cobro_monetario ? 'Sin cobro monetario' : row.cobrada ? 'Cobrada' : 'Pendiente de cobro',
    cancelada_at: row.cancelada_at,
    cancelacion_detalle: row.cancelacion_detalle || {},
    id_agente: row.agente_orden_id || '',
    id_contacto_cobro: row.id_contacto_cobro || '',
    comentarios: row.comentarios || '',
    con_iva: row.con_iva !== false,
    numero_orden: row.numero_orden || `${row.numero_cobro || 1}/${row.total_ordenes || 1}`,
    id_propuesta: row.id_propuesta || '',
    nombre_propuesta: row.nombre_propuesta || '',
    fecha_firma_propuesta: row.fecha_firma_contrato || '',
    agente_propuesta: row.agente_propuesta || '',
    id_agente_propuesta: row.id_agente_propuesta || '',
    contacto_propuesta: row.contacto_propuesta || '',
    id_contacto_propuesta: row.id_contacto_propuesta || '',
    id_cuenta: row.id_cuenta || row.id_cuenta_contrato || row.id_cuenta_factura || '',
    tipo_factura: row.id_factura ? (row.verifactu_estado_envio==='factura emitida' || row.estado_factura==='enviada' ? 'Definitiva' : 'Previa') : '',
    numero_factura: row.numero_factura || row.id_factura || '',
    numero_recibo: row.numero_recibo || '',
    id_remesa: row.id_remesa || '',
    datos_importacion: row.datos_importacion || {},
    numero_cobro: row.numero_cobro,
    etiqueta_cobro: row.etiqueta_cobro ?? "",
    fecha_teorica_cobro: row.fecha_teorica_cobro ?? "",
    fecha_real_cobro: row.fecha_real_cobro ?? "",
    forma_cobro: row.forma_cobro ?? "",
    banco_cobro: row.banco_cobro ?? "",
    cobrada: Boolean(row.cobrada),
    cobro_revision_bancaria: Boolean(row.cobro_revision_bancaria),
    ya_contabilizada: Boolean(row.ya_contabilizada),
    base_imponible: numberOrZero(row.base_imponible),
    cobro_total: numberOrZero(row.cobro_total),
    importe_pendiente: row.cobrada || row.cancelada || row.datos_importacion?.cierre_cobro?.activo ? 0 : Math.max(0, Math.round((numberOrZero(row.cobro_total) - numberOrZero(row.importe_aplicado)) * 100) / 100),
    id_contrato: row.id_contrato ?? "",
    id_factura: row.id_factura ?? "",
    cliente: row.nombre_empresa || row.cliente_recibo || row.datos_importacion?.cliente || row.id_cuenta || row.id_cuenta_contrato || "",
    agente: row.nombre_completo_agente || row.datos_importacion?.agente || row.id_agente_contrato || "",
  };
}

const ordenesSelect = `
  SELECT
    o.id_orden,o.updated_at,
    o.cancelada,o.cancelada_at,o.cancelacion_detalle,o.id_contacto_cobro,o.comentarios,o.con_iva,
    COALESCE(NULLIF(o.id_agente,''),aceptacion.id_agente,c.id_agente_contrato) agente_orden_id,
    substring(o.id_orden from '(\\d+/\\d+)$') numero_orden,
    (SELECT count(*) FROM tesoreria_ordenes sibling WHERE sibling.id_contrato=o.id_contrato) total_ordenes,
    c.id_propuesta,c.fecha_firma_contrato,p.nombre_propuesta,p.id_agente_propuesta,p.id_contacto_propuesta,
    ap.nombre_completo_agente agente_propuesta,
    COALESCE(NULLIF(cp.nombre_completo_contacto,''),NULLIF(concat_ws(' ',cp.nombre_contacto,cp.apellidos_contacto),''),'') contacto_propuesta,
    o.id_cuenta,
    o.datos_importacion,
    o.numero_cobro,
    o.etiqueta_cobro,
    o.fecha_teorica_cobro,
    o.fecha_real_cobro,
    o.forma_cobro,
    o.banco_cobro,
    o.cobrada,
    o.cobro_revision_bancaria,
    COALESCE(o.base_imponible, c.importe_total_bi_contrato) AS base_imponible,
    COALESCE(o.cobro_total, c.importe_contrato_con_iva) AS cobro_total,
    COALESCE((SELECT sum(ac.importe) FROM tesoreria_aplicaciones_cobro ac JOIN tesoreria_movimientos_bancarios mb USING(id_linea_banco) WHERE ac.id_orden=o.id_orden AND mb.estado_revision AND NOT COALESCE(mb.duplicado_descartado,false)),0) AS importe_aplicado,
    o.id_contrato,
    o.id_factura,
    c.id_cuenta_contrato,
    c.id_agente_contrato,
    cu.nombre_empresa,
    a.nombre_completo_agente,
    f.estado AS estado_factura,f.verifactu_estado_envio,f.ya_contabilizada
    ,f.id_cuenta AS id_cuenta_factura,f.numero_factura,r.numero_recibo,r.id_remesa,r.cliente AS cliente_recibo
  FROM tesoreria_ordenes o
  LEFT JOIN comercial_contratos c ON c.id_contrato = o.id_contrato
  LEFT JOIN administracion_facturas_clientes f ON f.id_factura_cliente = o.id_factura
  LEFT JOIN comercial_cuentas cu ON cu.id_cuenta = COALESCE(NULLIF(o.id_cuenta,''),c.id_cuenta_contrato,f.id_cuenta)
  LEFT JOIN comercial_propuestas_db p ON p.id_propuesta=c.id_propuesta
  LEFT JOIN agentes_db ap ON ap.id_agente=p.id_agente_propuesta
  LEFT JOIN comercial_contactos cp ON cp.id_contacto=p.id_contacto_propuesta
  LEFT JOIN LATERAL (SELECT e.id_agente FROM cuentas_registro_eventos e
    WHERE e.id_cuenta=c.id_cuenta_contrato AND NULLIF(e.id_agente,'') IS NOT NULL
      AND strpos(e.detalles,'ha confirmado la propuesta ' || c.id_propuesta || ';')>0
    ORDER BY e.created_at ASC LIMIT 1) aceptacion ON TRUE
  LEFT JOIN agentes_db a ON a.id_agente = COALESCE(NULLIF(o.id_agente,''),aceptacion.id_agente,c.id_agente_contrato)
  LEFT JOIN LATERAL (SELECT r.* FROM tesoreria_recibos_importados r WHERE r.id_orden=o.id_orden ORDER BY r.numero_recibo LIMIT 1) r ON TRUE
`;

export async function getOrdenesAdministrativas(filters = {}) {
  const pool = getPgPool();
  const values = [];
  const where = [];

  if (filters.canceladas !== undefined) { values.push(Boolean(filters.canceladas)); where.push(`o.cancelada=$${values.length}`); }

  if (filters.search) {
    values.push(`%${String(filters.search).trim()}%`);
    where.push(`
      (
        o.id_orden ILIKE $${values.length}
        OR o.id_factura ILIKE $${values.length}
        OR o.id_contrato ILIKE $${values.length}
        OR cu.nombre_empresa ILIKE $${values.length}
        OR a.nombre_completo_agente ILIKE $${values.length}
        OR o.forma_cobro ILIKE $${values.length}
        OR o.banco_cobro ILIKE $${values.length}
      )
    `);
  }

  const { rows } = await pool.query(
    `
      ${ordenesSelect}
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY o.created_at DESC, o.id_orden ASC
    `,
    values,
  );

  return rows.map(normalizeOrden);
}

export async function getOrdenAdministrativaById(idOrden) {
  idOrden=await resolveIdentifier('orden',idOrden);
  const pool = getPgPool();
  const { rows } = await pool.query(`${ordenesSelect} WHERE o.id_orden = $1 LIMIT 1`, [idOrden]);
  if (!rows[0]) return null;
  const order=normalizeOrden(rows[0]);
  const [invoice,contacts,receipts]=await Promise.all([
    order.id_factura ? pool.query('SELECT * FROM administracion_facturas_clientes WHERE id_factura_cliente=$1',[order.id_factura]) : {rows:[]},
    pool.query('SELECT id_contacto,nombre_completo_contacto,nombre_contacto,apellidos_contacto,email_contacto FROM comercial_contactos WHERE id_cuenta=$1 ORDER BY nombre_completo_contacto',[order.id_cuenta]),
    pool.query('SELECT numero_recibo,id_remesa,importe_recibo FROM tesoreria_recibos_importados WHERE id_orden=$1 ORDER BY numero_recibo',[idOrden]),
  ]);
  let factura=invoice.rows[0] || null;
  if(factura){
    const [lines,otherOrders]=await Promise.all([
      pool.query('SELECT * FROM administracion_lineas_factura WHERE id_factura_cliente=$1 ORDER BY posicion',[order.id_factura]),
      pool.query('SELECT id_orden,numero_cobro,cobro_total,cancelada FROM tesoreria_ordenes WHERE id_factura=$1 AND id_orden<>$2 ORDER BY numero_cobro,id_orden',[order.id_factura,idOrden]),
    ]);
    factura={...factura,lineas:lines.rows,otras_ordenes:otherOrders.rows};
  }else if(order.cancelacion_detalle.factura_eliminada) factura={...order.cancelacion_detalle.factura_eliminada,eliminada:true,otras_ordenes:[]};
  return {...order,factura,contactos_cuenta:contacts.rows,recibos:receipts.rows};
}

export async function getPrevisionIngresosOrdenes(tipo) {
  const pool = getPgPool();
  const normalizedTipo = String(tipo || "").toLowerCase();
  const values = [];
  const where = ['NOT o.cancelada'];

  if (normalizedTipo === "recibos") {
    where.push("(o.forma_cobro ILIKE '%recibo%' OR o.datos_importacion->>'tipo_ingreso'='recibo')");
  }

  if (normalizedTipo === "transfers") {
    where.push("(o.forma_cobro ILIKE '%transfer%' OR o.forma_cobro ILIKE '%transf%' OR o.datos_importacion->>'tipo_ingreso'='transferencia')");
  }

  if (normalizedTipo === "todos") {
    where.push("(o.forma_cobro ILIKE '%recibo%' OR o.forma_cobro ILIKE '%transfer%' OR o.forma_cobro ILIKE '%transf%' OR o.datos_importacion->>'tipo_ingreso' IN ('recibo','transferencia'))");
  }

  const { rows } = await pool.query(
    `
      ${ordenesSelect}
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY
        p3_income_date(o.fecha_teorica_cobro) ASC NULLS LAST,
        o.id_orden ASC
    `,
    values,
  );

  return rows.map(normalizeOrden);
}
