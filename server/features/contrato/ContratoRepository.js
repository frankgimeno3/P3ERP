import { assertCommercialAgent } from "../agente/CommercialAgent.js";
import { getPgPool } from "../../database/pgClient.js";

function numberOrZero(value) {
  return value === null || value === undefined ? 0 : Number(value);
}

function normalizeOrden(row) {
  return {
    ...row,
    id_orden: row.id_orden,
    id_contrato: row.id_contrato ?? "",
    forma_cobro: row.forma_cobro ?? "",
    id_factura: row.id_factura ?? "",
    numero_cobro: row.numero_cobro ?? null,
    etiqueta_cobro: row.etiqueta_cobro ?? "",
    fecha_teorica_cobro: row.fecha_teorica_cobro ?? "",
    fecha_real_cobro: row.fecha_real_cobro ?? "",
    banco_cobro: row.banco_cobro ?? "",
    base_imponible: numberOrZero(row.base_imponible),
    cobro_total: numberOrZero(row.cobro_total),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function normalizeLinea(row) {
  return {
    ...row,
    id_linea_contrato: row.id_linea_contrato,
    numero_linea_contrato: row.numero_linea_contrato,
    id_publicacion: row.id_publicacion ?? "",
    medio: row.medio ?? "",
    publicacion: row.publicacion ?? "",
    producto: row.producto ?? "",
    precio_producto: numberOrZero(row.precio_producto),
    deadline_publicacion: row.deadline_publicacion ?? "",
    fecha_publicacion_publicacion: row.fecha_publicacion_publicacion ?? "",
    estado_material_contrato: row.estado_material_contrato ?? "",
    url_contenido: row.url_contenido ?? "",
    array_id_contenidos: row.array_id_contenidos ?? [],
  };
}

function normalizeContrato(row) {
  return {
    ...row,
    id_contrato: row.id_contrato,
    id_agente_contrato: row.id_agente_contrato ?? "",
    nombre_agente_contrato: row.nombre_agente_contrato ?? "",
    fecha_cobro_prevista_contrato: row.fecha_cobro_prevista_contrato ?? "",
    forma_cobro_contrato: row.forma_cobro_contrato ?? "",
    fecha_firma_contrato: row.fecha_firma_contrato ?? "",
    fecha_fin_contrato: row.fecha_fin_contrato ?? "",
    id_propuesta: row.id_propuesta ?? "",
    descuento_final_contrato: numberOrZero(row.descuento_final_contrato),
    importe_total_bi_contrato: numberOrZero(row.importe_total_bi_contrato),
    iva_aplicable: Boolean(row.iva_aplicable),
    importe_contrato_con_iva: numberOrZero(row.importe_contrato_con_iva),
    id_cuenta_contrato: row.id_cuenta_contrato ?? "",
    nombre_empresa: row.nombre_empresa ?? "",
    id_contacto_contrato: row.id_contacto_contrato ?? "",
    nombre_contacto: row.nombre_contacto ?? "",
    cargo_contacto_contrato: row.cargo_contacto_contrato ?? "",
    array_contenidos: row.array_contenidos ?? [],
    array_id_ordenes: row.array_id_ordenes ?? [],
    lineas_contrato: row.lineas_contrato ?? [],
    ordenes: row.ordenes ?? [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const baseSelect = `
  SELECT
    c.*,
    origin_agent.nombre_completo_agente AS nombre_agente_propuesta_contrato,
    a.nombre_completo_agente AS nombre_agente_contrato,
    COALESCE(cu.nombre_empresa,(SELECT string_agg(shared.nombre_empresa, ' / ' ORDER BY shared.nombre_empresa)
      FROM comercial_cuentas shared WHERE shared.id_cuenta IN
      (SELECT jsonb_array_elements_text(COALESCE(to_jsonb(c)->'datos_importacion'->'cuentas','[]'::jsonb))))) AS nombre_empresa,
    co.nombre_completo_contacto AS nombre_contacto
  FROM comercial_contratos c
  LEFT JOIN agentes_db a ON a.id_agente = c.id_agente_contrato
  LEFT JOIN agentes_db origin_agent ON origin_agent.id_agente=c.id_agente_propuesta_contrato
  LEFT JOIN comercial_cuentas cu ON cu.id_cuenta = c.id_cuenta_contrato
  LEFT JOIN comercial_contactos co ON co.id_contacto = c.id_contacto_contrato
`;

export async function getContratos() {
  const pool = getPgPool();
  const { rows } = await pool.query(`
    ${baseSelect}
    ORDER BY to_date(NULLIF(c.fecha_firma_contrato, ''), 'DD/MM/YYYY') DESC NULLS LAST, c.created_at DESC
  `);

  return rows.map(normalizeContrato);
}

export async function getContratoById(idContrato) {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `
      ${baseSelect}
      WHERE c.id_contrato = $1
      LIMIT 1
    `,
    [idContrato],
  );

  if (!rows[0]) return null;

  const [lineas, facturas, ordenes, extras] = await Promise.all([
    pool.query(
      `
        SELECT l.*,s.nombre_servicio_es AS producto_documento_es
        FROM comercial_contratos_lineas l
        LEFT JOIN servicios_db s ON s.id_servicio=l.id_servicio
        WHERE l.id_contrato = $1
        ORDER BY l.numero_linea_contrato ASC NULLS LAST, l.id_linea_contrato ASC
      `,
      [idContrato],
    ),
    pool.query(`SELECT f.* FROM administracion_facturas_clientes f WHERE f.id_contrato=$1
      OR f.id_factura_cliente=$2 OR f.id_factura_cliente IN(SELECT id_factura FROM tesoreria_ordenes WHERE id_contrato=$1)
      ORDER BY f.created_at DESC,f.id_factura_cliente`,[idContrato,rows[0].id_factura || null]),
    pool.query(
      `
        SELECT *
        FROM tesoreria_ordenes
        WHERE id_contrato = $1
        ORDER BY numero_cobro ASC NULLS LAST,id_orden ASC
      `,
      [idContrato],
    ),
    pool.query(`SELECT c.id_contenido,c.nombre_contenido,c.cliente_hoja,c.estado_contenido FROM produccion_contenidos c WHERE c.id_contenido IN (SELECT jsonb_array_elements_text(COALESCE(to_jsonb(con)->'agregados_extra_post_contrato','[]'::jsonb)) FROM comercial_contratos con WHERE con.id_contrato=$1) ORDER BY c.id_contenido`,[idContrato]),
  ]);

  return normalizeContrato({
    ...rows[0],
    lineas_contrato: lineas.rows.map(normalizeLinea),
    ordenes: ordenes.rows.map(normalizeOrden),
    facturas: facturas.rows,
    contenidos_extra: extras.rows,
  });
}

export async function updateContrato(idContrato, data = {}) {
  const db=await getPgPool().connect();
  try{
    await db.query('BEGIN');
    const current=(await db.query('SELECT * FROM comercial_contratos WHERE id_contrato=$1 FOR UPDATE',[idContrato])).rows[0];
    if(!current){await db.query('ROLLBACK');return null;}
    if(data.id_agente_propuesta_contrato!==undefined&&data.id_agente_propuesta_contrato!==current.id_agente_propuesta_contrato)throw Error('El agente de la propuesta es inalterable.');
    const agentId=String(data.id_agente_contrato??current.id_agente_contrato??'').trim();
    if(data.id_agente_contrato!==undefined&&!agentId)throw Error('Selecciona un agente gestor.');
    if(data.id_agente_contrato!==undefined)await assertCommercialAgent(db,agentId,current.id_agente_contrato);
    const contactId=String(data.id_contacto_contrato??current.id_contacto_contrato??'').trim();
    if(data.id_contacto_contrato!==undefined&&contactId&&!(await db.query('SELECT 1 FROM comercial_contactos WHERE id_contacto=$1 AND id_cuenta=$2',[contactId,current.id_cuenta_contrato])).rowCount)throw Error('El contacto debe pertenecer a la cuenta del contrato.');
    await db.query('UPDATE comercial_contratos SET id_agente_contrato=$2,id_contacto_contrato=$3,updated_at=now() WHERE id_contrato=$1',[idContrato,agentId,contactId]);
    if(agentId!==current.id_agente_contrato)await db.query("UPDATE produccion_contenidos SET id_agente=$2,updated_at=now() WHERE id_contrato=$1 AND lower(btrim(COALESCE(estado_contenido,''))) NOT IN ('publicado','publicada','publicados','publicadas')",[idContrato,agentId]);
    await db.query('COMMIT');return getContratoById(idContrato);
  }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
