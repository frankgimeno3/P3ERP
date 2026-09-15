import { randomUUID } from "node:crypto";
import { getPgPool } from "../../database/pgClient.js";
import { ensureOrderReceipt, lockIncome, incomeError } from './IncomeReconciliation.js';
import { orderActivity } from '../comentario/AccountActivity.js';

export async function getIngresosAdicionales(tipo = "") {
  const pool = getPgPool();
  const values = [];
  const where = "WHERE NOT EXISTS(SELECT 1 FROM ordenes_db o WHERE o.id_orden=ia.id_ingreso_adicional)" + (tipo && tipo !== "todos" ? " AND ia.tipo_ingreso = $1" : "");
  if (tipo && tipo !== "todos") values.push(tipo === "transfers" ? "transferencia" : "recibo");
  const { rows } = await pool.query(`
    SELECT ia.*, c.nombre_empresa
    FROM ingresos_adicionales_db ia
    LEFT JOIN cuentas_db c ON c.id_cuenta = ia.id_cuenta
    ${where}
    ORDER BY to_date(ia.fecha_teorica, 'DD/MM/YYYY') ASC, ia.created_at ASC
  `, values);
  return rows.map((row) => ({
    id_orden: row.id_ingreso_adicional,
    cliente: row.nombre_empresa || row.cliente_manual || "Sin cliente",
    id_cuenta: row.id_cuenta || "",
    id_contrato: "",
    id_factura: row.asociado_factura ? row.numero_factura : "",
    numero_cobro: "",
    etiqueta_cobro: "Ingreso adicional sin contrato",
    fecha_teorica_cobro: row.fecha_teorica,
    fecha_real_cobro: "",
    forma_cobro: row.forma_cobro,
    banco_cobro: row.banco,
    base_imponible: Number(row.base_imponible),
    cobro_total: Number(row.base_imponible),
    tipo_ingreso: row.tipo_ingreso,
    es_adicional: true,
  }));
}

export async function ensureAdditionalOrder(db, row, actorId='') {
  if((await db.query('SELECT 1 FROM ordenes_db WHERE id_orden=$1',[row.id_ingreso_adicional])).rowCount)return;
  let invoice=null;
  if(row.asociado_factura && row.numero_factura){
    const matches=(await db.query('SELECT * FROM facturas_clientes_db WHERE id_factura_cliente=$1 OR numero_factura=$1',[row.numero_factura])).rows;
    if(matches.length>1)incomeError('Varias facturas coinciden con '+row.numero_factura);
    invoice=matches[0] || (await db.query("INSERT INTO facturas_clientes_db(id_factura_cliente,numero_factura,id_cuenta,estado) VALUES($1,$2,$3,'en proceso') RETURNING *",['fac_excel_'+row.numero_factura,row.numero_factura,row.id_cuenta || null])).rows[0];
  }
  const next=invoice?Number((await db.query('SELECT COALESCE(max(numero_cobro),0)+1 n FROM ordenes_db WHERE id_factura=$1',[invoice.id_factura_cliente])).rows[0].n):1;
  await db.query(`INSERT INTO ordenes_db(id_orden,id_cuenta,id_factura,numero_cobro,etiqueta_cobro,fecha_teorica_cobro,forma_cobro,banco_cobro,base_imponible,cobro_total,datos_importacion)
    VALUES($1,$2,$3,$4,'Ingreso adicional sin contrato',$5,$6,$7,$8,$8,$9::jsonb)`,[row.id_ingreso_adicional,row.id_cuenta || invoice?.id_cuenta || null,invoice?.id_factura_cliente || null,next,row.fecha_teorica,row.forma_cobro,row.banco,row.base_imponible,JSON.stringify({cliente:row.cliente_manual || '',tipo_ingreso:row.tipo_ingreso})]);
  await orderActivity(db,row.id_ingreso_adicional,actorId,'ha creado un ingreso adicional sin contrato.');
  await ensureOrderReceipt(db,row.id_ingreso_adicional,actorId);
}

export async function createIngresoAdicional(data = {}, actorId='') {
  const pool = getPgPool();
  const db=await pool.connect();
  try{
  await db.query('BEGIN');await lockIncome(db);
  const id = `ing_ad_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
  const { rows } = await db.query(`
    INSERT INTO ingresos_adicionales_db
      (id_ingreso_adicional,id_cuenta,cliente_manual,tipo_ingreso,asociado_factura,numero_factura,fecha_teorica,forma_cobro,banco,base_imponible)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *
  `, [id, data.id_cuenta || null, data.cliente_manual || "", data.tipo_ingreso, Boolean(data.asociado_factura),
    data.asociado_factura ? data.numero_factura : "", data.fecha_teorica, data.forma_cobro, data.banco, Number(data.base_imponible)]);
  await ensureAdditionalOrder(db,rows[0],actorId);
  await db.query('COMMIT');return rows[0];
  }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
