import { getPgPool } from '../../database/pgClient.js';
import { orderActivity } from '../comentario/AccountActivity.js';
import { incomeError, lockIncome, receiptOrderId, syncOrderCollections } from './IncomeReconciliation.js';

export async function getImportedReceipts() {
  return (await getPgPool().query("SELECT r.*,m.importe_total,COALESCE(m.remesa_en_carpeta,r.remesa_en_carpeta) remesa_en_carpeta FROM tesoreria_recibos_importados r LEFT JOIN prevision_remesas_resumen m ON m.id_remesa=r.id_remesa ORDER BY r.numero_factura,r.numero_cobro")).rows;
}
export async function getRemesas() {
  return (await getPgPool().query('SELECT * FROM prevision_remesas_resumen ORDER BY created_at DESC,id_remesa')).rows;
}

export async function saveReceipt(db, row, actorId = '') {
  const previous = (await db.query('SELECT * FROM tesoreria_recibos_importados WHERE numero_recibo=$1 FOR UPDATE', [row.numero_recibo])).rows[0];
  let invoice = (await db.query('SELECT * FROM administracion_facturas_clientes WHERE id_factura_cliente=$1 OR numero_factura=$1', [row.numero_factura])).rows;
  if (invoice.length > 1) incomeError('Hay varias facturas con número ' + row.numero_factura + '. Resuelve la coincidencia antes de importar.');
  const accounts = row.cliente ? (await db.query("SELECT id_cuenta FROM comercial_cuentas WHERE id_cuenta=$1 OR lower(btrim(nombre_empresa))=lower($1) OR lower(btrim(nombre_fiscal))=lower($1)", [row.cliente])).rows : [];
  const account = accounts.length === 1 ? accounts[0].id_cuenta : null;
  if (!invoice.length) invoice = (await db.query("INSERT INTO administracion_facturas_clientes(id_factura_cliente,numero_factura,id_cuenta,estado) VALUES($1,$2,$3,'en proceso') RETURNING *", ['fac_excel_' + row.numero_factura,row.numero_factura,account])).rows;
  const fact = invoice[0];
  const candidates = previous?.id_orden ? (await db.query('SELECT * FROM tesoreria_ordenes WHERE id_orden=$1 FOR UPDATE', [previous.id_orden])).rows
    : (await db.query('SELECT * FROM tesoreria_ordenes WHERE (id_factura=$1 OR id_factura=$2) AND numero_cobro=$3 ORDER BY id_orden FOR UPDATE', [fact.id_factura_cliente,row.numero_factura,row.numero_cobro])).rows;
  if (candidates.length > 1) incomeError('La factura ' + row.numero_factura + ' tiene varias órdenes con número de cobro ' + row.numero_cobro + '.');
  let order = candidates[0];
  if (order && order.forma_cobro && !/recibo/i.test(order.forma_cobro)) incomeError('La orden ' + order.id_orden + ' no es de recibo. Corrige su forma de cobro antes de importar.');
  if (!order) order = (await db.query("INSERT INTO tesoreria_ordenes(id_orden,id_factura,numero_cobro,id_cuenta,forma_cobro,cobro_total,fecha_teorica_cobro,etiqueta_cobro) VALUES($1,$2,$3,$4,'recibo',$5,$6,$7) RETURNING *",
    [receiptOrderId(row.numero_recibo),fact.id_factura_cliente,row.numero_cobro,fact.id_cuenta || account,row.importe_recibo,row.fecha_teorica,'Recibo ' + row.numero_recibo])).rows[0];
  const linked = previous || (await db.query('SELECT * FROM tesoreria_recibos_importados WHERE id_orden=$1 FOR UPDATE', [order.id_orden])).rows[0];
  const remesaId = row.numero_remesa || linked?.id_remesa || null;
  if (linked?.id_remesa && remesaId !== linked.id_remesa && (await db.query('SELECT 1 FROM tesoreria_aplicaciones_cobro a JOIN tesoreria_movimientos_bancarios b USING(id_linea_banco) WHERE a.id_orden=$1 AND b.estado_revision LIMIT 1', [order.id_orden])).rowCount) incomeError('Desmarca primero la revisión bancaria para cambiar la remesa del recibo ' + row.numero_recibo + '.');
  if (remesaId) await db.query("INSERT INTO tesoreria_remesas(id_remesa,remesa_en_carpeta,importe_declarado) VALUES($1,$2,$3) ON CONFLICT(id_remesa) DO UPDATE SET remesa_en_carpeta=COALESCE(NULLIF(EXCLUDED.remesa_en_carpeta,''),tesoreria_remesas.remesa_en_carpeta),importe_declarado=COALESCE(EXCLUDED.importe_declarado,tesoreria_remesas.importe_declarado),updated_at=now() WHERE (NULLIF(EXCLUDED.remesa_en_carpeta,'') IS NOT NULL AND EXCLUDED.remesa_en_carpeta IS DISTINCT FROM tesoreria_remesas.remesa_en_carpeta) OR (EXCLUDED.importe_declarado IS NOT NULL AND EXCLUDED.importe_declarado IS DISTINCT FROM tesoreria_remesas.importe_declarado)",
    [remesaId,row.remesa_en_carpeta || '',row.importe_remesa]);
  const merged = {
    ...row, id_orden: order.id_orden, id_remesa: remesaId,
    numero_remesa: remesaId || '',
    remesa_en_carpeta: row.remesa_en_carpeta || linked?.remesa_en_carpeta || '',
    cliente: row.cliente || linked?.cliente || '',
    importe_recibo: row.importe_recibo ?? linked?.importe_recibo ?? order.cobro_total,
    importe_remesa: row.importe_remesa ?? linked?.importe_remesa ?? null,
    fecha_creacion: row.fecha_creacion || linked?.fecha_creacion || null,
    fecha_teorica: row.fecha_teorica || linked?.fecha_teorica || order.fecha_teorica_cobro,
  };
  if (linked) {
    const fields = ['numero_recibo','numero_factura','numero_cobro','numero_remesa','remesa_en_carpeta','cliente','importe_recibo','importe_remesa','fecha_creacion','fecha_teorica','id_orden','id_remesa'];
    const changed = fields.filter(key => String(merged[key] ?? '') !== String(linked[key] ?? ''));
    if (changed.length) {
      await db.query('UPDATE tesoreria_recibos_importados SET ' + changed.map((key,i)=>key+'=$'+(i+1)).join(',') + ',updated_at=now() WHERE numero_recibo=$' + (changed.length+1), [...changed.map(key=>merged[key]),linked.numero_recibo]);
      await orderActivity(db,order.id_orden,actorId,'ha modificado el recibo ' + row.numero_recibo + ' (' + changed.join(', ') + ').');
    }
  } else {
    const fields = Object.keys(merged);
    await db.query('INSERT INTO tesoreria_recibos_importados(' + fields.join(',') + ') VALUES(' + fields.map((_,i)=>'$'+(i+1)).join(',') + ')', fields.map(key=>merged[key]));
    await orderActivity(db,order.id_orden,actorId,'ha generado el recibo ' + row.numero_recibo + '.');
  }
  const changes = {
    id_factura: fact.id_factura_cliente, id_cuenta: order.id_cuenta || fact.id_cuenta || account,
    forma_cobro: 'recibo', cobro_total: row.importe_recibo ?? order.cobro_total,
    fecha_teorica_cobro: row.fecha_teorica || order.fecha_teorica_cobro,
  };
  const changed = Object.keys(changes).filter(key=>String(changes[key] ?? '') !== String(order[key] ?? ''));
  if (changed.length) {
    await db.query('UPDATE tesoreria_ordenes SET '+changed.map((key,i)=>key+'=$'+(i+1)).join(',')+',updated_at=now() WHERE id_orden=$'+(changed.length+1),[...changed.map(key=>changes[key]),order.id_orden]);
    await orderActivity(db,order.id_orden,actorId,'ha actualizado la orden desde el recibo ' + row.numero_recibo + ' (' + changed.join(', ') + ').');
  }
  if (remesaId && remesaId !== linked?.id_remesa) await orderActivity(db,order.id_orden,actorId,'ha incorporado el recibo ' + row.numero_recibo + ' a la remesa ' + remesaId + '.');
  await syncOrderCollections(db,[order.id_orden],actorId);
  return order.id_orden;
}

export async function importReceipts(rows, pool = getPgPool(), actorId = '') {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    await db.query("SET LOCAL lock_timeout='3s'");
    await lockIncome(db);
    for (const row of [...rows].sort((a,b)=>a.numero_recibo.localeCompare(b.numero_recibo))) await saveReceipt(db,row,actorId);
    await db.query('COMMIT');
    return { imported: rows.length };
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
}

export function mergeReceiptForecast(ordenes, receipts) {
  const byOrder = new Map(receipts.map(row=>[row.id_orden,row]));
  return ordenes.map(order=>{
    const row=byOrder.get(order.id_orden);
    return row ? {...order,numero_recibo:row.numero_recibo,numero_remesa:row.id_remesa || '',remesa_en_carpeta:row.remesa_en_carpeta,importe_remesa:row.importe_total,fecha_creacion:row.fecha_creacion,cliente:order.cliente || row.cliente} : order;
  });
}
