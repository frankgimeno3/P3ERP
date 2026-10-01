import { syncInvoiceOrders } from './InvoiceOrders.js';
import crypto from "node:crypto";
import { accountActivity, orderActivity } from "../comentario/AccountActivity.js";
import { ensureOrderReceipt, lockIncome, syncOrderCollections, syncInvoiceCollection } from "../prevision/IncomeReconciliation.js";
import { parseImportDate } from "../prevision/ReceiptExcel.js";
import { getPgPool } from "../../database/pgClient.js";
import { calculateVerifactuHash, formatSpainTimestamp, VERIFACTU_HASH_VERSION } from "./verifactuHash.mjs";
import { buildVerifactuRegistroAltaXml } from "./verifactuXml.mjs";

const id = (prefix) => `${prefix}_${crypto.randomUUID().slice(0, 12)}`;
const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

async function ensureSchema(db) {
  await db.query(`
    ALTER TABLE comercial_contratos ADD COLUMN IF NOT EXISTS id_factura TEXT;
    ALTER TABLE administracion_facturas_clientes
      ADD COLUMN IF NOT EXISTS id_contrato TEXT, ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'en proceso',
      ADD COLUMN IF NOT EXISTS ya_contabilizada BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS numero_factura TEXT NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS moneda TEXT NOT NULL DEFAULT 'EUR',
      ADD COLUMN IF NOT EXISTS datos_fiscales JSONB NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS datos_verifactu JSONB NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS fecha_emision DATE, ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE,
      ADD COLUMN IF NOT EXISTS iva_porcentaje NUMERIC NOT NULL DEFAULT 21,
      ADD COLUMN IF NOT EXISTS id_orden_origen TEXT,
      ADD COLUMN IF NOT EXISTS factura_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;
    CREATE TABLE IF NOT EXISTS administracion_lineas_factura (
      id_linea_factura TEXT PRIMARY KEY,id_factura_cliente TEXT NOT NULL,id_linea_contrato TEXT,posicion INTEGER NOT NULL,
      concepto TEXT NOT NULL DEFAULT '',descripcion TEXT NOT NULL DEFAULT '',cantidad NUMERIC NOT NULL DEFAULT 1,
      precio_unitario NUMERIC NOT NULL DEFAULT 0,descuento NUMERIC NOT NULL DEFAULT 0,
      tipo_descuento TEXT NOT NULL DEFAULT 'porcentaje',base_imponible NUMERIC NOT NULL DEFAULT 0,
      iva_porcentaje NUMERIC NOT NULL DEFAULT 21,importe_total NUMERIC NOT NULL DEFAULT 0,
      personalizada BOOLEAN NOT NULL DEFAULT FALSE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(id_factura_cliente,posicion));
    ALTER TABLE tesoreria_ordenes ADD COLUMN IF NOT EXISTS id_cuenta TEXT, ADD COLUMN IF NOT EXISTS cobrada BOOLEAN NOT NULL DEFAULT FALSE;
  `);
}

function normalize(row) {
  return {
    ...row,
    fecha_factura: row.fecha_emision || row.fecha_factura || "",
    base_imponible: number(row.base_imponible),
    importe_total: number(row.importe_total),
    iva_porcentaje: number(row.iva_porcentaje),
    ya_contabilizada: Boolean(row.ya_contabilizada),
  };
}

export async function getEligibleContracts() {
  const pool = getPgPool();
  await ensureSchema(pool);
  const { rows } = await pool.query(`
    SELECT c.*,cu.nombre_empresa
    FROM comercial_contratos c LEFT JOIN comercial_cuentas cu ON cu.id_cuenta=c.id_cuenta_contrato
    LEFT JOIN administracion_facturas_clientes f ON f.id_factura_cliente=c.id_factura
    WHERE COALESCE(c.id_factura,'')='' OR (f.estado='en proceso' AND NOT COALESCE(f.ya_contabilizada,false) AND COALESCE(f.verifactu_estado_envio,'')<>'factura emitida')
    ORDER BY c.created_at DESC
  `);
  return rows;
}

export async function getUninvoicedContracts() {
  const {rows}=await getPgPool().query(`SELECT c.*,cu.nombre_empresa FROM comercial_contratos c
    LEFT JOIN comercial_cuentas cu ON cu.id_cuenta=c.id_cuenta_contrato
    WHERE NOT EXISTS(SELECT 1 FROM administracion_facturas_clientes f WHERE f.id_contrato=c.id_contrato OR f.id_factura_cliente=c.id_factura
      OR EXISTS(SELECT 1 FROM tesoreria_ordenes o WHERE o.id_contrato=c.id_contrato AND o.id_factura=f.id_factura_cliente))
    ORDER BY c.id_contrato DESC`);
  return rows;
}

export async function getEligibleOrders() {
  const pool=getPgPool();
  await ensureSchema(pool);
  const {rows}=await pool.query(`SELECT o.id_orden,o.id_contrato,COALESCE(NULLIF(o.id_cuenta,''),c.id_cuenta_contrato) AS id_cuenta,o.cobro_total,o.base_imponible,o.fecha_teorica_cobro,cu.nombre_empresa
    FROM tesoreria_ordenes o LEFT JOIN comercial_contratos c ON c.id_contrato=o.id_contrato
    LEFT JOIN comercial_cuentas cu ON cu.id_cuenta=COALESCE(NULLIF(o.id_cuenta,''),c.id_cuenta_contrato)
    WHERE NOT COALESCE(o.cancelada,false) AND COALESCE(o.id_factura,'')=''
      AND COALESCE(NULLIF(o.id_cuenta,''),c.id_cuenta_contrato) IS NOT NULL
    ORDER BY o.fecha_teorica_cobro NULLS LAST,o.id_orden`);
  return rows;
}

export async function createOrderInvoiceDraft(idOrden,actorId='') {
  const pool=getPgPool(),client=await pool.connect();
  try {
    await client.query('BEGIN');
    await lockIncome(client);
    await ensureSchema(client);
    const {rows}=await client.query(`SELECT o.*,COALESCE(NULLIF(o.id_cuenta,''),c.id_cuenta_contrato) AS invoice_account_id,cu.nombre_empresa,cu.nombre_fiscal,cu.vat_code,cu.pais_facturacion,cu.direccion_facturacion,
      cu.poblacion_facturacion,cu.cp_facturacion,cu.mail_contabilidad
      FROM tesoreria_ordenes o LEFT JOIN comercial_contratos c ON c.id_contrato=o.id_contrato
      LEFT JOIN comercial_cuentas cu ON cu.id_cuenta=COALESCE(NULLIF(o.id_cuenta,''),c.id_cuenta_contrato) WHERE o.id_orden=$1 FOR UPDATE OF o`,[idOrden]);
    const o=rows[0];
    if(!o || o.cancelada || o.id_factura || !o.invoice_account_id)throw new Error('La orden no está disponible para facturar');
    const invoiceId=id('fac');
    const gross=number(o.cobro_total),base=number(o.base_imponible)||Math.round(gross/(o.con_iva===false?1:1.21)*100)/100;
    const fiscal={nombre_fiscal:o.nombre_fiscal||o.nombre_empresa||'',vat_code:o.vat_code||'',pais:o.pais_facturacion||'',direccion:o.direccion_facturacion||'',poblacion:o.poblacion_facturacion||'',cp:o.cp_facturacion||'',email:o.mail_contabilidad||''};
    await client.query(`INSERT INTO administracion_facturas_clientes(id_factura_cliente,id_orden_origen,id_cuenta,base_imponible,importe_total,estado,datos_fiscales,forma_cobro)
      VALUES($1,$2,$3,$4,$5,'en proceso',$6::jsonb,$7)`,[invoiceId,idOrden,o.invoice_account_id,base,gross,JSON.stringify(fiscal),o.forma_cobro||'']);
    await client.query(`INSERT INTO administracion_lineas_factura(id_linea_factura,id_factura_cliente,posicion,concepto,descripcion,cantidad,precio_unitario,base_imponible,iva_porcentaje,importe_total,personalizada)
      VALUES($1,$2,1,$3,$4,1,$5,$6,$7,$8,true)`,[id('lfac'),invoiceId,`Orden ${idOrden}`,'',base,base,base>0?Math.round((gross/base-1)*10000)/100:0,gross]);
    await client.query('UPDATE tesoreria_ordenes SET id_factura=$1,updated_at=NOW() WHERE id_orden=$2',[invoiceId,idOrden]);
    await ensureOrderReceipt(client,idOrden,actorId);
    await client.query('COMMIT');
    return getCustomerInvoice(invoiceId);
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}

export async function getUnassignedInvoices(idCuenta) {
  const pool=getPgPool();await ensureSchema(pool);
  const {rows}=await pool.query(`SELECT f.id_factura_cliente,f.numero_factura,f.importe_total,f.estado
    FROM administracion_facturas_clientes f WHERE f.id_cuenta=$1 AND COALESCE(f.id_contrato,'')='' AND COALESCE(f.id_orden_origen,'')=''
    AND NOT EXISTS(SELECT 1 FROM tesoreria_ordenes o WHERE o.id_factura=f.id_factura_cliente)
    AND f.estado='en proceso' AND COALESCE(f.verifactu_estado_envio,'')<>'factura emitida' AND NOT COALESCE(f.ya_contabilizada,false)
    ORDER BY f.created_at DESC`,[idCuenta]);return rows;
}

export async function linkOrderToInvoice(idOrden,idFactura,actorId='') {
  const client=await getPgPool().connect();
  try{await client.query('BEGIN');await lockIncome(client);await ensureSchema(client);
    const order=(await client.query(`SELECT o.*,COALESCE(NULLIF(o.id_cuenta,''),c.id_cuenta_contrato) AS invoice_account_id
      FROM tesoreria_ordenes o LEFT JOIN comercial_contratos c ON c.id_contrato=o.id_contrato WHERE o.id_orden=$1 FOR UPDATE OF o`,[idOrden])).rows[0];
    const invoice=(await client.query('SELECT * FROM administracion_facturas_clientes WHERE id_factura_cliente=$1 FOR UPDATE',[idFactura])).rows[0];
    if(!order||order.cancelada||order.id_factura)throw new Error('La orden ya no está disponible');
    if(!invoice||invoice.id_cuenta!==order.invoice_account_id||invoice.id_contrato||invoice.id_orden_origen||invoice.estado!=='en proceso'||invoice.ya_contabilizada||invoice.verifactu_estado_envio==='factura emitida')throw new Error('La factura no está disponible para esta cuenta');
    if((await client.query('SELECT 1 FROM tesoreria_ordenes WHERE id_factura=$1 LIMIT 1',[idFactura])).rowCount)throw new Error('La factura ya tiene una orden asignada');
    if(Math.abs(Number(invoice.importe_total)-Number(order.cobro_total))>0.01)throw new Error('El importe de la factura debe coincidir con el de la orden');
    await client.query('UPDATE administracion_facturas_clientes SET id_orden_origen=$1,updated_at=NOW() WHERE id_factura_cliente=$2',[idOrden,idFactura]);
    await client.query('UPDATE tesoreria_ordenes SET id_factura=$1,updated_at=NOW() WHERE id_orden=$2',[idFactura,idOrden]);
    await ensureOrderReceipt(client,idOrden,actorId);
    await client.query('COMMIT');return getCustomerInvoice(idFactura);
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}

export async function getCustomerInvoices(filters = {}) {
  const pool = getPgPool();
  await ensureSchema(pool);
  const values = [];
  const where = [];
  if (filters.estado) { values.push(filters.estado); where.push(`f.estado=$${values.length}`); }
  const { rows } = await pool.query(`
    SELECT f.*,cu.nombre_empresa
    FROM administracion_facturas_clientes f LEFT JOIN comercial_cuentas cu ON cu.id_cuenta=f.id_cuenta
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY f.created_at DESC
  `, values);
  return rows.map(normalize);
}

export async function getCustomerInvoice(idFactura) {
  const pool = getPgPool();
  await ensureSchema(pool);
  const { rows } = await pool.query(`
    SELECT f.*,cu.nombre_empresa,c.id_agente_contrato,cu.id_edisoft AS codigo_cliente,
      jsonb_build_object('nombre_fiscal',cu.nombre_fiscal,'vat_code',cu.vat_code,
        'direccion_facturacion',cu.direccion_facturacion,'poblacion_facturacion',cu.poblacion_facturacion,
        'cp_facturacion',cu.cp_facturacion,'pais_facturacion',cu.pais_facturacion) AS cuenta_documento
    FROM administracion_facturas_clientes f
    LEFT JOIN comercial_cuentas cu ON cu.id_cuenta=f.id_cuenta
    LEFT JOIN comercial_contratos c ON c.id_contrato=f.id_contrato
    WHERE f.id_factura_cliente=$1 LIMIT 1`, [idFactura]);
  if (!rows[0]) return null;
  const [lines, payments, orders] = await Promise.all([
    pool.query(`SELECT * FROM administracion_lineas_factura WHERE id_factura_cliente=$1 ORDER BY posicion`, [idFactura]),
    pool.query(`SELECT * FROM comercial_contratos_cobros WHERE id_contrato=$1 ORDER BY numero_cobro`, [rows[0].id_contrato]),
    pool.query(`SELECT * FROM tesoreria_ordenes WHERE id_factura=$1 ORDER BY numero_cobro`, [idFactura]),
  ]);
  return normalize({ ...rows[0], lineas: lines.rows, cobros: payments.rows, ordenes: orders.rows });
}

export async function createInvoiceDraft(idContrato, actorId = "", transaction = null) {
  const pool = getPgPool();
  const client = transaction || await pool.connect();
  try {
    if (!transaction) await client.query("BEGIN");
    await lockIncome(client);
    await ensureSchema(client);
    const contract = await client.query(`
      SELECT c.*,cu.nombre_empresa,cu.vat_code,cu.nombre_fiscal,cu.pais_facturacion,cu.direccion_facturacion,
        cu.poblacion_facturacion,cu.cp_facturacion,cu.mail_contabilidad
      FROM comercial_contratos c LEFT JOIN comercial_cuentas cu ON cu.id_cuenta=c.id_cuenta_contrato
      WHERE c.id_contrato=$1 FOR UPDATE OF c`, [idContrato]);
    if (!contract.rows[0]) throw new Error("El contrato no está disponible para facturar");
    const c = contract.rows[0];
    if (c.id_factura) {
      const draft=(await client.query('SELECT * FROM administracion_facturas_clientes WHERE id_factura_cliente=$1 FOR UPDATE',[c.id_factura])).rows[0];
      if (!draft || draft.estado!=='en proceso' || draft.ya_contabilizada || draft.verifactu_estado_envio==='factura emitida') throw new Error('El contrato ya tiene una factura finalizada');
      if (!transaction) await client.query('COMMIT');
      return transaction ? {id_factura_cliente:c.id_factura} : getCustomerInvoice(c.id_factura);
    }
    if((await client.query('SELECT 1 FROM administracion_facturas_clientes f WHERE f.id_contrato=$1 OR EXISTS (SELECT 1 FROM tesoreria_ordenes o WHERE o.id_contrato=$1 AND o.id_factura=f.id_factura_cliente) LIMIT 1',[idContrato])).rowCount) throw new Error('Este contrato ya tiene facturas. Selecciona una orden pendiente para facturar solo su importe.');
    if(c.importe_total_bi_contrato==null||c.importe_contrato_con_iva==null||!c.id_cuenta_contrato) throw new Error('Completa la cuenta y el importe del contrato antes de crear la factura.');
    const idFactura = id("fac");
    const fiscal = {
      nombre_fiscal: c.nombre_fiscal || c.nombre_empresa || "", vat_code: c.vat_code || "",
      pais: c.pais_facturacion || "", direccion: c.direccion_facturacion || "",
      poblacion: c.poblacion_facturacion || "", cp: c.cp_facturacion || "", email: c.mail_contabilidad || "",
    };
    await client.query(`INSERT INTO administracion_facturas_clientes (
      id_factura_cliente,id_contrato,id_cuenta,base_imponible,importe_total,estado,moneda,datos_fiscales,forma_cobro
    ) VALUES ($1,$2,$3,$4,$5,'en proceso',$6,$7::jsonb,$8)`,
    [idFactura,idContrato,c.id_cuenta_contrato,c.importe_total_bi_contrato,c.importe_contrato_con_iva,c.moneda || "EUR",JSON.stringify(fiscal),c.forma_cobro_contrato || ""]);
    const lines = await client.query(`SELECT * FROM comercial_contratos_lineas WHERE id_contrato=$1 ORDER BY numero_linea_contrato`, [idContrato]);
    for (let i = 0; i < lines.rows.length; i += 1) {
      const line = lines.rows[i];
      const quantity = number(line.unidades) || 1;
      let unit = number(line.precio_unitario || line.precio_producto);
      const base = ['gratis','tachado'].includes(line.modo_precio) ? 0 : line.precio_total_personalizado == null ? quantity * unit : number(line.precio_total_personalizado);
      const specialPrice=['gratis','tachado','personalizado'].includes(line.modo_precio);
      if(specialPrice)unit=base/quantity;
      if(line.precio_no_desglosado)unit=0;
      const vat = number(line.linea_snapshot?.iva_porcentaje ?? c.datos_importacion?.iva_porcentaje ?? (c.iva_aplicable?21:0));
      await client.query(`INSERT INTO administracion_lineas_factura (
        id_linea_factura,id_factura_cliente,id_linea_contrato,posicion,concepto,descripcion,cantidad,
        precio_unitario,descuento,tipo_descuento,base_imponible,iva_porcentaje,importe_total,precio_no_desglosado
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [id("lfac"),idFactura,line.id_linea_contrato,i+1,line.producto || line.medio || "",line.descripcion_linea || "",
        quantity,unit,specialPrice?0:number(line.descuento_producto),line.tipo_descuento_producto || "porcentaje",base,vat,Math.round(base*(1+vat/100)*100)/100,Boolean(line.precio_no_desglosado)]);
    }
    await client.query(`UPDATE comercial_contratos SET id_factura=$1,updated_at=NOW() WHERE id_contrato=$2`, [idFactura,idContrato]);
    if(lines.rows.some(line=>line.precio_no_desglosado))await client.query(`UPDATE administracion_facturas_clientes SET datos_importacion=jsonb_build_object('importe_global_sin_desglose',true,'origen','creacion_manual_desde_contrato') WHERE id_factura_cliente=$1`,[idFactura]);
    const orders=(await client.query("UPDATE tesoreria_ordenes SET id_factura=$1,updated_at=now() WHERE id_contrato=$2 AND (id_factura IS NULL OR id_factura='') RETURNING id_orden",[idFactura,idContrato])).rows;
    for (const order of orders) await ensureOrderReceipt(client,order.id_orden,actorId);
    await accountActivity(client,c.id_cuenta_contrato,actorId,'ha creado la factura en proceso '+idFactura+' para el contrato '+idContrato+', con las órdenes '+orders.map(o=>o.id_orden).join(', ')+'.');
    if (!transaction) await client.query("COMMIT");
    return transaction ? {id_factura_cliente:idFactura} : getCustomerInvoice(idFactura);
  } catch (error) {
    if (!transaction) await client.query("ROLLBACK");
    throw error;
  } finally { if (!transaction) client.release(); }
}

export async function createRectifyingInvoiceDraft(sourceInvoiceId, invoiceType) {
  const pool = getPgPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await ensureSchema(client);
    const source = await client.query(`SELECT * FROM administracion_facturas_clientes WHERE id_factura_cliente=$1`, [sourceInvoiceId]);
    if (!source.rows[0]) throw new Error("La factura de origen no existe");
    if (!["rectificativa", "abono"].includes(invoiceType)) throw new Error("Tipo de factura rectificativa no válido");
    const original = source.rows[0];
    const idFactura = id("fac");
    await client.query(`INSERT INTO administracion_facturas_clientes (
      id_factura_cliente,id_cuenta,base_imponible,importe_total,estado,moneda,datos_fiscales,forma_cobro,
      factura_origen_id,factura_tipo,verifactu_estado_envio
    ) VALUES ($1,$2,$3,$4,'en proceso',$5,$6::jsonb,$7,$8,$9,'borrador')`,
    [idFactura,original.id_cuenta,invoiceType==="abono"?-Math.abs(number(original.base_imponible)):original.base_imponible,
      invoiceType==="abono"?-Math.abs(number(original.importe_total)):original.importe_total,original.moneda || "EUR",
      JSON.stringify(original.datos_fiscales || {}),original.forma_cobro || "",sourceInvoiceId,invoiceType]);
    const lines = await client.query(`SELECT * FROM administracion_lineas_factura WHERE id_factura_cliente=$1 ORDER BY posicion`, [sourceInvoiceId]);
    for (const line of lines.rows) {
      const sign = invoiceType === "abono" ? -1 : 1;
      await client.query(`INSERT INTO administracion_lineas_factura (
        id_linea_factura,id_factura_cliente,id_linea_contrato,posicion,concepto,descripcion,cantidad,
        precio_unitario,descuento,tipo_descuento,base_imponible,iva_porcentaje,importe_total,personalizada
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [id("lfac"),idFactura,line.id_linea_contrato,line.posicion,line.concepto,line.descripcion,line.cantidad,
        number(line.precio_unitario)*sign,line.descuento,line.tipo_descuento,number(line.base_imponible)*sign,
        line.iva_porcentaje,number(line.importe_total)*sign,line.personalizada]);
    }
    await client.query("COMMIT");
    return getCustomerInvoice(idFactura);
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

export async function getVerifactuRecords() {
  const pool = getPgPool();
  const { rows } = await pool.query(`SELECT * FROM fiscal_verifactu_registros ORDER BY generated_at DESC, created_at DESC`);
  return rows;
}

export async function getVerifactuInstallation() {
  const pool = getPgPool();
  const installationId = process.env.VERIFACTU_INSTALLATION_ID || "P3ERP-PRODUCCION-01";
  const { rows } = await pool.query(`SELECT * FROM fiscal_verifactu_instalaciones WHERE installation_id=$1`, [installationId]);
  return rows[0] || null;
}

export async function emitCustomerInvoice(idFactura, data = {}, actorId = "") {
  const pool = getPgPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await lockIncome(client);
    const result = await client.query(`SELECT * FROM administracion_facturas_clientes WHERE id_factura_cliente=$1 FOR UPDATE`, [idFactura]);
    const invoice = result.rows[0];
    if (!invoice) throw new Error("Factura no encontrada");
    if (invoice.verifactu_estado_envio === "factura emitida") throw new Error("La factura ya está emitida");
    if (invoice.datos_importacion?.requiere_revision_importe) throw new Error("Revisa primero la discrepancia entre base e importe del Excel de origen.");
    const issuerNif = String(data.issuer_nif || data.verifactu_emisor || "").trim().toUpperCase();
    const issuerName = String(data.issuer_name || data.verifactu_emisor || "").trim();
    const series = String(data.serie || data.verifactu_serie || "").trim();
    const invoiceDate = String(data.fecha_expedicion || data.verifactu_fecha_expedicion || "").slice(0, 10);
    if (!/^[A-Z0-9][A-Z0-9]{7,8}$/.test(issuerNif) || !issuerName || !series || !/^\d{4}-\d{2}-\d{2}$/.test(invoiceDate)) {
      throw new Error("Emisor, NIF, serie y fecha de expedición son obligatorios");
    }
    const fiscal = invoice.datos_fiscales || {};
    const customerNif = String(fiscal.vat_code || "").trim().toUpperCase();
    const customerName = String(fiscal.nombre_fiscal || "").trim();
    if (!customerNif || !customerName) throw new Error("El NIF y la razón social del destinatario son obligatorios");
    const foreignCountry = String(fiscal.pais || "").trim().toUpperCase();
    if (foreignCountry && !["ES","ESPAÑA","SPAIN"].includes(foreignCountry) && !customerNif) {
      throw new Error("Las operaciones extranjeras requieren país e identificador fiscal");
    }
    const invoiceType = invoice.factura_tipo === "ordinaria"
      ? "F1"
      : String(data.invoice_type_aeat || "").toUpperCase();
    if (invoice.factura_tipo === "ordinaria" ? invoiceType !== "F1" : !/^R[1-5]$/.test(invoiceType)) {
      throw new Error("Selecciona un tipo AEAT válido: F1 para ordinaria o R1-R5 para rectificativa");
    }
    const sourceLines = await client.query(`SELECT * FROM administracion_lineas_factura WHERE id_factura_cliente=$1 ORDER BY posicion`, [idFactura]);
    if (!sourceLines.rows.length) throw new Error("La factura debe tener al menos una línea");
    for (const line of sourceLines.rows) {
      if (!String(line.concepto || line.descripcion || "").trim()) throw new Error(`La línea ${line.posicion} necesita una descripción fiscal`);
      if (number(line.base_imponible) === 0 && invoice.factura_tipo !== "abono") throw new Error(`La línea ${line.posicion} necesita base imponible`);
      if (line.operacion_fiscal === "exenta" && !line.causa_exencion) throw new Error(`La línea ${line.posicion} necesita causa de exención`);
    }
    const currency = String(invoice.moneda || "EUR").toUpperCase();
    const exchangeRate = currency === "EUR" ? 1 : number(data.tipo_cambio_eur || invoice.tipo_cambio_eur);
    if (currency !== "EUR" && exchangeRate <= 0) throw new Error("Indica un tipo de cambio válido para expresar el registro en euros");
    const installationId = process.env.VERIFACTU_INSTALLATION_ID || "P3ERP-PRODUCCION-01";
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [installationId]);
    const installationResult = await client.query(`SELECT * FROM fiscal_verifactu_instalaciones WHERE installation_id=$1 FOR UPDATE`, [installationId]);
    if (!installationResult.rows[0]) throw new Error("La instalación VERI*FACTU no está configurada");
    const installation = installationResult.rows[0];
    if (!installation.producer_nif) {
      await client.query(`UPDATE fiscal_verifactu_instalaciones SET producer_nif=$1,updated_at=NOW() WHERE installation_id=$2`, [issuerNif,installationId]);
      installation.producer_nif = issuerNif;
    }
    await client.query(`INSERT INTO fiscal_verifactu_contadores (issuer_nif,invoice_series,next_number) VALUES ($1,$2,1) ON CONFLICT DO NOTHING`, [issuerNif,series]);
    const counter = await client.query(`SELECT next_number FROM fiscal_verifactu_contadores WHERE issuer_nif=$1 AND invoice_series=$2 FOR UPDATE`, [issuerNif,series]);
    const invoiceNumber = Number(counter.rows[0].next_number);
    await client.query(`UPDATE fiscal_verifactu_contadores SET next_number=next_number+1,updated_at=NOW() WHERE issuer_nif=$1 AND invoice_series=$2`, [issuerNif,series]);
    const previousResult = await client.query(`SELECT * FROM fiscal_verifactu_registros WHERE installation_id=$1 ORDER BY generated_at DESC,created_at DESC LIMIT 1`, [installationId]);
    const previous = previousResult.rows[0] || null;
    const lines = sourceLines;
    const taxBreakdown = {};
    let totalBase = 0;
    let totalVat = 0;
    let calculatedTotal = 0;
    for (const line of lines.rows) {
      const rate = String(number(line.iva_porcentaje));
      const operation = line.operacion_fiscal || "sujeta_no_exenta";
      const surchargeRate = number(line.recargo_equivalencia_porcentaje);
      const withholdingRate = number(line.retencion_porcentaje);
      const breakdownKey = `${rate}|${operation}|${line.causa_exencion || ""}|${surchargeRate}`;
      const baseEur = number(line.base_imponible) * exchangeRate;
      const vatEur = ["exenta","no_sujeta","inversion_sujeto_pasivo"].includes(operation) ? 0 : baseEur*number(rate)/100;
      const surchargeEur = baseEur*surchargeRate/100;
      const withholdingEur = baseEur*withholdingRate/100;
      const current = taxBreakdown[breakdownKey] || {
        tipo_impositivo: number(rate), base_imponible_eur: 0, cuota_iva_eur: 0,
        operacion_fiscal: operation, causa_exencion: line.causa_exencion || "",
        tipo_recargo_equivalencia: surchargeRate, cuota_recargo_equivalencia_eur: 0,
      };
      current.base_imponible_eur += baseEur;
      current.cuota_iva_eur += vatEur;
      current.cuota_recargo_equivalencia_eur += surchargeEur;
      taxBreakdown[breakdownKey] = current;
      totalBase += baseEur;
      totalVat += vatEur+surchargeEur;
      calculatedTotal += baseEur+vatEur+surchargeEur-withholdingEur;
    }
    const totalEur = number(invoice.importe_total) * exchangeRate;
    if (Math.abs(totalEur-calculatedTotal)>0.02) throw new Error("El total no coincide con bases, IVA, recargos y retenciones");
    const operationDescription = lines.rows.map((line) => String(line.concepto || line.descripcion).trim()).filter(Boolean).join("; ");
    let rectifiedInvoice = null;
    if (invoice.factura_tipo !== "ordinaria") {
      if (!invoice.factura_origen_id) throw new Error("La factura rectificativa debe indicar la factura de origen");
      const source = await client.query(`SELECT verifactu_issuer_nif,verifactu_invoice_number,verifactu_invoice_date FROM administracion_facturas_clientes WHERE id_factura_cliente=$1`, [invoice.factura_origen_id]);
      rectifiedInvoice = source.rows[0];
      if (!rectifiedInvoice?.verifactu_invoice_number) throw new Error("La factura de origen debe estar emitida");
    }
    const generatedAt = formatSpainTimestamp();
    const recordId = id("vf");
    const invoiceNumberText = String(invoiceNumber);
    const fullInvoiceNumber = `${series}-${invoiceNumberText}`;
    const hashInvoiceDate = invoiceDate.split("-").reverse().join("-");
    const currentHash = calculateVerifactuHash({
      issuerNif, invoiceNumber: fullInvoiceNumber, invoiceDate: hashInvoiceDate, invoiceType,
      vatAmount: totalVat, totalAmount: totalEur, previousHash: previous?.current_hash || "", generatedAt,
    });
    const recordPayload = {
      RegistroAlta: {
        IDVersion: "1.0",
        IDFactura: { IDEmisorFactura: issuerNif, NumSerieFactura: fullInvoiceNumber, FechaExpedicionFactura: hashInvoiceDate },
        NombreRazonEmisor: issuerName, TipoFactura: invoiceType,
        ...(rectifiedInvoice?{
          TipoRectificativa:"I",
          FacturasRectificadas:{IDFacturaRectificada:[{
            IDEmisorFactura:rectifiedInvoice.verifactu_issuer_nif,
            NumSerieFactura:rectifiedInvoice.verifactu_invoice_number,
            FechaExpedicionFactura:String(rectifiedInvoice.verifactu_invoice_date).slice(0,10).split("-").reverse().join("-"),
          }]},
        }:{}),
        DescripcionOperacion: operationDescription,
        Destinatarios: { IDDestinatario: [{ NombreRazon: customerName, NIF: customerNif }] },
        Desglose: { DetalleDesglose: Object.values(taxBreakdown).map((detail) => ({
          Impuesto: "01", ClaveRegimen: "01",
          ...(detail.operacion_fiscal === "exenta"
            ? { OperacionExenta: detail.causa_exencion }
            : { CalificacionOperacion: detail.operacion_fiscal === "inversion_sujeto_pasivo" ? "S2" : detail.operacion_fiscal === "no_sujeta" ? "N1" : "S1" }),
          BaseImponibleOimporteNoSujeto: detail.base_imponible_eur,
          ...(["sujeta_no_exenta","inversion_sujeto_pasivo"].includes(detail.operacion_fiscal)
            ? { TipoImpositivo: detail.tipo_impositivo, CuotaRepercutida: detail.cuota_iva_eur }
            : {}),
          ...(detail.tipo_recargo_equivalencia>0?{
            TipoRecargoEquivalencia:detail.tipo_recargo_equivalencia,
            CuotaRecargoEquivalencia:detail.cuota_recargo_equivalencia_eur,
          }:{}),
        })) },
        CuotaTotal: totalVat, ImporteTotal: totalEur,
        Encadenamiento: previous ? { RegistroAnterior: {
          IDEmisorFactura: previous.issuer_nif, NumSerieFactura: previous.invoice_number,
          FechaExpedicionFactura: previous.invoice_date, Huella: previous.current_hash,
        } } : { PrimerRegistro: "S" },
        SistemaInformatico: {
          NombreRazon: installation.producer_name, NIF: installation.producer_nif,
          NombreSistemaInformatico: installation.software_name, IdSistemaInformatico: installation.software_id,
          Version: installation.software_version, NumeroInstalacion: installationId,
          TipoUsoPosibleSoloVerifactu: installation.exclusive_use ? "S" : "N",
          TipoUsoPosibleMultiOT: installation.multi_entity ? "S" : "N",
          IndicadorMultiplesOT: installation.multi_entity ? "S" : "N",
        },
        FechaHoraHusoGenRegistro: generatedAt, TipoHuella: "01", Huella: currentHash,
      },
      referencias_oficiales: {
        xsd: "https://prewww2.aeat.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/SuministroInformacion.xsd",
        wsdl: "https://prewww2.aeat.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/SistemaFacturacion.wsdl",
        hash_version: VERIFACTU_HASH_VERSION,
      },
    };
    const recordXml = buildVerifactuRegistroAltaXml(recordPayload.RegistroAlta);
    const softwareVersion = installation.software_version;
    await client.query(`SELECT set_config('app.billing_service','on',true)`);
    await client.query(`INSERT INTO fiscal_verifactu_registros (
      id,invoice_id,record_type,issuer_nif,issuer_name,invoice_series,invoice_number,invoice_date,
      customer_nif,customer_name,invoice_type,tax_breakdown_json,total_amount,previous_record_id,
      previous_invoice_number,previous_invoice_date,previous_hash,current_hash,generated_at,aeat_status,
      software_version,installation_id,operation_description,taxable_base,vat_rate,vat_amount,is_rectifying,
      software_producer_nif,software_producer_name,software_name,software_id,obligated_issuer_nif,
      exclusive_use,multi_entity,xsd_version,record_payload_json
    ) VALUES ($1,$2,'ALTA',$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14,$15,$16,$17,$18,'pendiente',$19,$20,
      $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,'1.0',$33::jsonb)`,
    [recordId,idFactura,issuerNif,issuerName,series,fullInvoiceNumber,invoiceDate,fiscal.vat_code || "",
      fiscal.nombre_fiscal || "",invoiceType,JSON.stringify(taxBreakdown),totalEur,
      previous?.id || null,previous?.invoice_number || null,previous?.invoice_date || null,previous?.current_hash || null,
      currentHash,generatedAt,softwareVersion,installationId,operationDescription,totalBase,
      lines.rows.length === 1 ? number(lines.rows[0].iva_porcentaje) : 0,totalVat,invoice.factura_tipo !== "ordinaria",
      installation.producer_nif,installation.producer_name,installation.software_name,installation.software_id,
      issuerNif,installation.exclusive_use,installation.multi_entity,JSON.stringify(recordPayload)]);
    await client.query(`UPDATE administracion_facturas_clientes SET
      verifactu_estado_envio='factura emitida',verifactu_emisor=$1,verifactu_serie=$2,verifactu_numero=$3,
      verifactu_fecha_expedicion=$4,verifactu_id=$5,verifactu_invoice_id=$6,verifactu_record_type='ALTA',
      verifactu_issuer_nif=$7,verifactu_issuer_name=$8,verifactu_invoice_series=$2,
      verifactu_invoice_number=$9,verifactu_invoice_date=$4,verifactu_customer_nif=$10,
      verifactu_customer_name=$11,verifactu_invoice_type=$12,verifactu_tax_breakdown_json=$13::jsonb,
      verifactu_total_amount=$14,verifactu_previous_record_id=$15,verifactu_previous_invoice_number=$16,
      verifactu_previous_invoice_date=$17,verifactu_previous_hash=$18,verifactu_current_hash=$19,
      verifactu_generated_at=$20,verifactu_aeat_status='pendiente',verifactu_software_version=$21,
      verifactu_installation_id=$22,verifactu_created_at=NOW(),numero_factura=$23,fecha_emision=$4,
      verifactu_operation_description=$24,verifactu_taxable_base=$25,verifactu_vat_rate=$26,
      verifactu_vat_amount=$27,verifactu_is_rectifying=$28,verifactu_software_producer_nif=$29,
      verifactu_software_producer_name=$30,verifactu_software_name=$31,verifactu_software_id=$32,
      verifactu_obligated_issuer_nif=$7,verifactu_exclusive_use=$33,verifactu_multi_entity=$34,
      verifactu_xsd_version='1.0',verifactu_record_payload_json=$35::jsonb,tipo_cambio_eur=$36,
      ya_contabilizada=TRUE,updated_at=NOW() WHERE id_factura_cliente=$6`,
    [issuerName,series,invoiceNumber,invoiceDate,recordId,idFactura,issuerNif,issuerName,fullInvoiceNumber,
      fiscal.vat_code || "",fiscal.nombre_fiscal || "",invoiceType,JSON.stringify(taxBreakdown),
      totalEur,previous?.id || null,previous?.invoice_number || null,previous?.invoice_date || null,
      previous?.current_hash || null,currentHash,generatedAt,softwareVersion,installationId,fullInvoiceNumber,
      operationDescription,totalBase,lines.rows.length===1?number(lines.rows[0].iva_porcentaje):0,totalVat,
      invoice.factura_tipo!=="ordinaria",installation.producer_nif,installation.producer_name,
      installation.software_name,installation.software_id,installation.exclusive_use,installation.multi_entity,
      JSON.stringify(recordPayload),exchangeRate]);
    await syncInvoiceOrders(client,idFactura,actorId);
    await client.query(`INSERT INTO fiscal_verifactu_envios (id,record_id,status,request_xml) VALUES ($1,$2,'PENDING',$3)`,
      [id("vfout"),recordId,recordXml]);
    await client.query("COMMIT");
    return getCustomerInvoice(idFactura);
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

export async function updateCustomerInvoice(idFactura, data = {}, actorId = "") {
  const pool = getPgPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await lockIncome(client);
    await ensureSchema(client);
    const current = await client.query(`SELECT * FROM administracion_facturas_clientes WHERE id_factura_cliente=$1 FOR UPDATE`, [idFactura]);
    if (!current.rows[0]) { await client.query("ROLLBACK"); return null; }
    if (current.rows[0].verifactu_estado_envio === "factura emitida") {
      await client.query(`UPDATE administracion_facturas_clientes SET comentarios_internos=$1,updated_at=NOW() WHERE id_factura_cliente=$2`,
        [data.comentarios_internos ?? current.rows[0].comentarios_internos ?? "", idFactura]);
      await client.query("COMMIT");
      return getCustomerInvoice(idFactura);
    }
    const locked = Boolean(current.rows[0].ya_contabilizada);
    if (locked && Object.keys(data).some((key) => !["ya_contabilizada"].includes(key))) {
      throw new Error("La factura contabilizada ya no admite modificaciones");
    }
    if (Array.isArray(data.lineas) && !locked && current.rows[0].datos_importacion?.importe_global_sin_desglose) {
      for (const line of data.lineas) await client.query('UPDATE administracion_lineas_factura SET concepto=$3,descripcion=$4,updated_at=now() WHERE id_factura_cliente=$1 AND id_linea_factura=$2', [idFactura,line.id_linea_factura,String(line.concepto || ''),String(line.descripcion || '')]);
    }
    if (Array.isArray(data.lineas) && !locked && !current.rows[0].datos_importacion?.importe_global_sin_desglose) {
      await client.query(`DELETE FROM administracion_lineas_factura WHERE id_factura_cliente=$1`, [idFactura]);
      const sorted = [...data.lineas].sort((a,b) => number(a.posicion)-number(b.posicion));
      for (let i=0;i<sorted.length;i+=1) {
        const line=sorted[i]; const qty=number(line.cantidad); const unit=number(line.precio_unitario);
        const base=number(line.base_imponible ?? qty*unit); const iva=number(line.iva_porcentaje);
        const operation=line.operacion_fiscal || "sujeta_no_exenta";
        const appliedVat=["exenta","no_sujeta","inversion_sujeto_pasivo"].includes(operation)?0:iva;
        const surcharge=number(line.recargo_equivalencia_porcentaje);
        const withholding=number(line.retencion_porcentaje);
        const calculatedTotal=base*(1+(appliedVat+surcharge-withholding)/100);
        await client.query(`INSERT INTO administracion_lineas_factura (
          id_linea_factura,id_factura_cliente,id_linea_contrato,posicion,concepto,descripcion,cantidad,precio_unitario,
          descuento,tipo_descuento,base_imponible,iva_porcentaje,importe_total,personalizada,
          operacion_fiscal,causa_exencion,inversion_sujeto_pasivo,recargo_equivalencia_porcentaje,retencion_porcentaje
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
        [line.id_linea_factura || id("lfac"),idFactura,line.id_linea_contrato || null,i+1,line.concepto || "",line.descripcion || "",
          qty,unit,number(line.descuento),line.tipo_descuento || "porcentaje",base,iva,
          calculatedTotal,Boolean(line.personalizada),
          operation,line.causa_exencion || "",
          Boolean(line.inversion_sujeto_pasivo),number(line.recargo_equivalencia_porcentaje),
          number(line.retencion_porcentaje)]);
      }
    }
    if (Array.isArray(data.cobros) && !locked) {
      for (const cobro of data.cobros) {
        await client.query(`UPDATE comercial_contratos_cobros SET
          fecha_cobro=$1,importe_cobro=$2,forma_cobro=$3,banco_cobro=$4,observaciones_cobro=$5,updated_at=NOW()
          WHERE id_cobro_contrato=$6 AND id_contrato=$7`,
        [cobro.fecha_cobro || "",number(cobro.importe_cobro),cobro.forma_cobro || "",cobro.banco_cobro || "",
          cobro.observaciones_cobro || "",cobro.id_cobro_contrato,current.rows[0].id_contrato]);
      }
    }
    const lines = await client.query(`SELECT COALESCE(SUM(base_imponible),0) base,COALESCE(SUM(importe_total),0) total FROM administracion_lineas_factura WHERE id_factura_cliente=$1`, [idFactura]);
    if(current.rows[0].id_orden_origen){
      const linked=(await client.query('SELECT cobro_total FROM tesoreria_ordenes WHERE id_orden=$1 FOR UPDATE',[current.rows[0].id_orden_origen])).rows[0];
      if(!linked || Math.abs(number(lines.rows[0].total)-number(linked.cobro_total))>0.01)throw new Error('El total de la factura de esta orden debe coincidir con su importe de cobro.');
    }
    const patch = { ...current.rows[0], ...data };
    await client.query(`UPDATE administracion_facturas_clientes SET
      numero_factura=$1,fecha_emision=$2,fecha_vencimiento=$3,estado=$4,datos_fiscales=$5::jsonb,
      datos_verifactu=$6::jsonb,comentarios=$7,forma_cobro=$8,base_imponible=$9,importe_total=$10,
      ya_contabilizada=$11,factura_snapshot=$12::jsonb,updated_at=NOW()
      WHERE id_factura_cliente=$13`,
    [patch.numero_factura || "",patch.fecha_emision || null,patch.fecha_vencimiento || null,patch.estado || "en proceso",
      JSON.stringify(patch.datos_fiscales || {}),JSON.stringify(patch.datos_verifactu || {}),patch.comentarios || "",
      patch.forma_cobro || "",lines.rows[0].base,lines.rows[0].total,Boolean(patch.ya_contabilizada),
      JSON.stringify(data),idFactura]);
    if (!locked && (Array.isArray(data.cobros) || Array.isArray(data.lineas) || data.estado === "enviada")) {
      await syncInvoiceOrders(client,idFactura,actorId);
    }
    await client.query("COMMIT");
    return getCustomerInvoice(idFactura);
  } catch(error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

export async function updateAdministrativeOrder(idOrden, data = {}, actorId = "") {
  data={...data};
  // Read-only in this editor: derive the base from the gross amount and VAT switch.
  delete data.base_imponible;
  for (const key of ['fecha_teorica_cobro','fecha_real_cobro']) if(data[key]) data[key]=parseImportDate(data[key]);
  const db = await getPgPool().connect();
  try {
    await db.query('BEGIN');
    await lockIncome(db);
    const row = (await db.query('SELECT o.*,f.ya_contabilizada FROM tesoreria_ordenes o LEFT JOIN administracion_facturas_clientes f ON f.id_factura_cliente=o.id_factura WHERE o.id_orden=$1 FOR UPDATE OF o',[idOrden])).rows[0];
    if (!row) { await db.query('COMMIT'); return null; }
    if(row.cancelada)throw new Error('La orden está cancelada y se conserva solo para consulta.');
    const locked=Boolean(row.ya_contabilizada);
    if(data.cobro_total!==undefined && (!Number.isFinite(Number(data.cobro_total)) || Number(data.cobro_total)<0))throw new Error('Indica un importe válido, igual o superior a cero.');
    if(data.con_iva!==undefined && typeof data.con_iva!=='boolean')throw new Error('Indica si el importe incluye IVA.');
    if(!locked && (data.con_iva!==undefined && data.con_iva!==row.con_iva || data.cobro_total!==undefined && Number(data.cobro_total)!==Number(row.cobro_total))){
      data.base_imponible=Math.round(Number(data.cobro_total ?? row.cobro_total)/((data.con_iva ?? row.con_iva)?1.21:1)*100)/100;
    }
    if(data.cobrada!==undefined && typeof data.cobrada!=='boolean')throw new Error('Indica un estado de cobro válido.');
    if(data.cobrada===false)data.fecha_real_cobro='';
    if((data.cobrada ?? row.cobrada) && !(data.fecha_real_cobro ?? row.fecha_real_cobro))throw new Error('Indica la fecha real de cobro.');
    if(!(data.cobrada ?? row.cobrada) && data.fecha_real_cobro)throw new Error('Marca la orden como cobrada para indicar una fecha real.');
    if(data.id_agente!==undefined && data.id_agente!==row.id_agente){
      if(!data.id_agente || !(await db.query('SELECT 1 FROM agentes_db WHERE id_agente=$1',[data.id_agente])).rowCount)throw new Error('Selecciona un agente válido.');
    }
    if(data.id_contacto_cobro && data.id_contacto_cobro!==row.id_contacto_cobro){
      const contact=(await db.query(`SELECT 1 FROM comercial_contactos ct WHERE ct.id_contacto=$1 AND ct.id_cuenta=(SELECT COALESCE(NULLIF(o.id_cuenta,''),c.id_cuenta_contrato,f.id_cuenta) FROM tesoreria_ordenes o LEFT JOIN comercial_contratos c ON c.id_contrato=o.id_contrato LEFT JOIN administracion_facturas_clientes f ON f.id_factura_cliente=o.id_factura WHERE o.id_orden=$2)`,[data.id_contacto_cobro,idOrden])).rowCount;
      if(!contact)throw new Error('El contacto de seguimiento debe pertenecer a la cuenta de la orden.');
    }
    const fields=['fecha_teorica_cobro','fecha_real_cobro','cobrada','id_agente','id_contacto_cobro','comentarios',...(!locked?['base_imponible','cobro_total','con_iva','forma_cobro','banco_cobro']:[])];
    const changes=fields.filter(key=>data[key]!==undefined && String(data[key] ?? '')!==String(row[key] ?? ''));
    if(row.cobro_revision_bancaria && changes.some(key=>['cobrada','fecha_real_cobro'].includes(key)))throw new Error('El estado y la fecha de este cobro se modifican desde su revisión bancaria.');
    if(changes.includes('forma_cobro') && !/recibo/i.test(data.forma_cobro) && (await db.query('SELECT 1 FROM tesoreria_recibos_importados WHERE id_orden=$1 AND id_remesa IS NOT NULL',[idOrden])).rowCount)throw new Error('Retira primero el recibo de su remesa antes de cambiar la forma de cobro.');
    if(changes.length){
      await db.query('UPDATE tesoreria_ordenes SET '+changes.map((key,i)=>key+'=$'+(i+1)).join(',')+',updated_at=now() WHERE id_orden=$'+(changes.length+1),[...changes.map(key=>data[key]),idOrden]);
      await orderActivity(db,idOrden,actorId,'ha modificado '+changes.map(key=>key+': '+String(row[key] ?? 'vacío')+' → '+String(data[key] ?? 'vacío')).join('; ')+'.');
      if(data.cobrada===true && !row.cobrada)await orderActivity(db,idOrden,actorId,'ha marcado la orden como cobrada con fecha '+(data.fecha_real_cobro || row.fecha_real_cobro || 'sin indicar')+'.');
    }
    if(row.id_cobro_contrato && changes.some(k=>['cobro_total','forma_cobro','banco_cobro','fecha_teorica_cobro'].includes(k))){
      const payment={...row,...Object.fromEntries(changes.map(k=>[k,data[k]]))};
      await db.query('UPDATE comercial_contratos_cobros SET importe_cobro=$2,forma_cobro=$3,banco_cobro=$4,fecha_cobro=$5,updated_at=now() WHERE id_cobro_contrato=$1',[row.id_cobro_contrato,payment.cobro_total,payment.forma_cobro,payment.banco_cobro,payment.fecha_teorica_cobro]);
    }
    if(changes.includes('forma_cobro') && !/recibo/i.test(data.forma_cobro))await db.query('DELETE FROM tesoreria_recibos_importados WHERE id_orden=$1',[idOrden]);
    await ensureOrderReceipt(db,idOrden,actorId);
    await syncOrderCollections(db,[idOrden],actorId);
    await syncInvoiceCollection(db,[row.id_factura]);
    const saved=(await db.query('SELECT * FROM tesoreria_ordenes WHERE id_orden=$1',[idOrden])).rows[0];
    await db.query('COMMIT');
    return {...saved,ya_contabilizada:locked};
  }catch(error){await db.query('ROLLBACK');throw error;}
  finally{db.release();}
}
