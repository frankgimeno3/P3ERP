import { createHash } from 'node:crypto';
import { orderActivity } from '../comentario/AccountActivity.js';

export const incomeError = message => { const error = new Error(message); error.status = 409; throw error; };
export const incomeCents = value => Math.round(Number(value || 0) * 100);
export const lockIncome = db => db.query("SELECT pg_advisory_xact_lock(hashtext('ingresos:conciliacion'))");
export const receiptOrderId = number => `ord_rec_${createHash('sha256').update(number).digest('hex').slice(0, 24)}`;

export async function ensureOrderReceipt(db, orderId, actorId = '') {
  const order = (await db.query(`SELECT o.*,COALESCE(NULLIF(f.numero_factura,''),o.id_factura,o.id_orden) numero_factura,
    cu.nombre_empresa FROM ordenes_db o LEFT JOIN facturas_clientes_db f ON f.id_factura_cliente=o.id_factura
    LEFT JOIN contratos_db c ON c.id_contrato=o.id_contrato
    LEFT JOIN cuentas_db cu ON cu.id_cuenta=COALESCE(NULLIF(o.id_cuenta,''),c.id_cuenta_contrato,f.id_cuenta)
    WHERE o.id_orden=$1`, [orderId])).rows[0];
  if (!order || !/recibo/i.test(order.forma_cobro || '') || !(order.numero_cobro > 0)) return;
  const existing = (await db.query('SELECT * FROM prevision_recibos_excel WHERE id_orden=$1', [orderId])).rows[0];
  if (existing) {
    const changed = incomeCents(existing.importe_recibo) !== incomeCents(order.cobro_total) || (existing.fecha_teorica || '') !== (order.fecha_teorica_cobro || '');
    if (changed) {
      await db.query('UPDATE prevision_recibos_excel SET importe_recibo=$2,fecha_teorica=$3,updated_at=now() WHERE numero_recibo=$1', [existing.numero_recibo,order.cobro_total,order.fecha_teorica_cobro]);
      await orderActivity(db,orderId,actorId,`ha actualizado el importe y vencimiento del recibo ${existing.numero_recibo} desde su orden.`);
    }
    return {...existing,importe_recibo:order.cobro_total,fecha_teorica:order.fecha_teorica_cobro};
  }
  const number = `${order.numero_factura}-${String(order.numero_cobro).padStart(3, '0')}`;
  const result = await db.query(`INSERT INTO prevision_recibos_excel
    (numero_recibo,numero_factura,numero_cobro,id_orden,cliente,importe_recibo,fecha_teorica)
    VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(numero_recibo) DO UPDATE SET id_orden=EXCLUDED.id_orden
    WHERE prevision_recibos_excel.id_orden IS NULL RETURNING *`,
  [number,order.numero_factura,order.numero_cobro,orderId,order.nombre_empresa || '',order.cobro_total,order.fecha_teorica_cobro]);
  if (!result.rows[0]) incomeError(`El recibo ${number} ya pertenece a otra orden.`);
  await orderActivity(db, orderId, actorId, `ha generado el recibo ${number}.`);
  return result.rows[0];
}

export async function syncInvoiceCollection(db, invoiceIds) {
  for (const id of [...new Set(invoiceIds.filter(Boolean))].sort()) {
    await db.query(`UPDATE facturas_clientes_db f SET
      cobrada=s.cobrada,importe_cobrado=s.importe,fecha_real_cobro=s.fecha
      FROM (SELECT COALESCE(bool_and(o.cobrada),false) cobrada,
        COALESCE(sum(CASE WHEN o.cobro_revision_bancaria THEN COALESCE(payments.importe,0) WHEN o.cobrada THEN COALESCE(o.cobro_total,0) ELSE 0 END),0) importe,
        CASE WHEN bool_and(o.cobrada) THEN to_char(max(p3_income_date(o.fecha_real_cobro)),'DD/MM/YYYY') END fecha
        FROM ordenes_db o LEFT JOIN LATERAL(SELECT sum(a.importe) importe FROM banco_cobros_ordenes a
          JOIN lineas_bancos b USING(id_linea_banco) WHERE a.id_orden=o.id_orden AND b.estado_revision) payments ON TRUE
        WHERE o.id_factura=$1) s WHERE f.id_factura_cliente=$1`, [id]);
  }
}

export async function syncOrderCollections(db, orderIds, actorId = '') {
  const invoices = [];
  for (const id of [...new Set(orderIds.filter(Boolean))].sort()) {
    const order = (await db.query('SELECT * FROM ordenes_db WHERE id_orden=$1 FOR UPDATE', [id])).rows[0];
    if (!order) continue;
    const totals = (await db.query(`SELECT count(*)::int records,
      COALESCE(sum(a.importe) FILTER(WHERE b.estado_revision),0) total,
      to_char(max(p3_income_date(COALESCE(NULLIF(b.fecha_valor,''),b.fecha_operativa))) FILTER(WHERE b.estado_revision),'DD/MM/YYYY') fecha,
      string_agg(DISTINCT b.banco,',') FILTER(WHERE b.estado_revision) banco
      FROM banco_cobros_ordenes a JOIN lineas_bancos b ON b.id_linea_banco=a.id_linea_banco WHERE a.id_orden=$1`, [id])).rows[0];
    if (!totals.records && !order.cobro_revision_bancaria) { invoices.push(order.id_factura); continue; }
    const paid = incomeCents(order.cobro_total) > 0 && incomeCents(totals.total) === incomeCents(order.cobro_total);
    const date = paid ? totals.fecha || '' : '';
    await db.query(`UPDATE ordenes_db SET cobrada=$2,fecha_real_cobro=$3,cobro_revision_bancaria=TRUE,
      banco_cobro=CASE WHEN $4 IN ('Sabadell','Santander') THEN $4 ELSE banco_cobro END,
      updated_at=CASE WHEN cobrada IS DISTINCT FROM $2 OR fecha_real_cobro IS DISTINCT FROM $3 THEN now() ELSE updated_at END WHERE id_orden=$1`, [id,paid,date,totals.banco]);
    if (paid !== order.cobrada || date !== (order.fecha_real_cobro || '')) await orderActivity(db,id,actorId,
      paid ? `ha confirmado el cobro de ${Number(totals.total).toFixed(2)} EUR con fecha ${date} mediante revisión bancaria.` : 'ha dejado pendiente el cobro al modificar o desmarcar la revisión bancaria.');
    invoices.push(order.id_factura);
  }
  await syncInvoiceCollection(db, invoices);
}

export async function reconcileBankIncome(db, line, item, actorId = '') {
  if (!(Number(line.importe) > 0)) incomeError('Solo se pueden conciliar ingresos positivos.');
  if (!(await db.query('SELECT p3_income_date($1) fecha',[line.fecha_valor || line.fecha_operativa])).rows[0].fecha) incomeError('El movimiento necesita una fecha bancaria válida.');
  if (!['transferencia','remesa','otro'].includes(item.incomeType)) incomeError('Indica si el ingreso es transferencia, remesa u otro.');
  const old = (await db.query('SELECT id_orden FROM banco_cobros_ordenes WHERE id_linea_banco=$1', [line.id_linea_banco])).rows;
  let orders = [];
  if (item.incomeType === 'remesa') {
    const ids = [...new Set(Array.isArray(item.remesaIds) ? item.remesaIds : [])];
    if (!ids.length) incomeError('Selecciona al menos una remesa registrada.');
    await db.query('SELECT id_remesa FROM remesas_db WHERE id_remesa=ANY($1::text[]) ORDER BY id_remesa FOR UPDATE', [ids]);
    const remesas = (await db.query('SELECT * FROM prevision_remesas_resumen WHERE id_remesa=ANY($1::text[])', [ids])).rows;
    if (remesas.length !== ids.length || remesas.some(r => !r.numero_recibos || r.recibos_sin_orden)) incomeError('Las remesas deben tener recibos vinculados a sus órdenes.');
    orders = (await db.query(`SELECT o.*,r.id_remesa FROM prevision_recibos_excel r JOIN ordenes_db o ON o.id_orden=r.id_orden
      WHERE r.id_remesa=ANY($1::text[]) ORDER BY o.id_orden FOR UPDATE OF o`, [ids])).rows;
  } else if (item.incomeType === 'transferencia') {
    if (!item.orderId) incomeError('Selecciona la orden de transferencia.');
    orders = (await db.query('SELECT * FROM ordenes_db WHERE id_orden=$1 FOR UPDATE', [item.orderId])).rows;
    if (!orders.length || !/transf/i.test(orders[0].forma_cobro || '')) incomeError('Selecciona una orden de transferencia, no un recibo.');
    const owner = (await db.query(`SELECT COALESCE(NULLIF(o.id_cuenta,''),c.id_cuenta_contrato,f.id_cuenta) id_cuenta FROM ordenes_db o
      LEFT JOIN contratos_db c ON c.id_contrato=o.id_contrato LEFT JOIN facturas_clientes_db f ON f.id_factura_cliente=o.id_factura WHERE o.id_orden=$1`, [item.orderId])).rows[0];
    if (!owner?.id_cuenta || item.entityId !== owner.id_cuenta) incomeError('La transferencia debe corresponder a la cuenta de la orden.');
  } else if (item.orderId || item.remesaIds?.length) incomeError('Otros ingresos no admiten órdenes ni remesas asociadas.');
  for (const order of orders) {
    if (!(Number(order.cobro_total) > 0)) incomeError(`La orden ${order.id_orden} no tiene un importe positivo.`);
    const existing = (await db.query(`SELECT a.id_linea_banco FROM banco_cobros_ordenes a JOIN lineas_bancos b USING(id_linea_banco)
      WHERE a.id_orden=$1 AND b.estado_revision AND a.id_linea_banco<>$2 LIMIT 1`, [order.id_orden,line.id_linea_banco])).rows;
    if (existing.length || order.cobrada && !old.some(o => o.id_orden === order.id_orden)) incomeError(`La orden ${order.id_orden} ya está cobrada o vinculada a otro ingreso revisado.`);
  }
  if (orders.length && orders.reduce((sum,o) => sum + incomeCents(o.cobro_total),0) !== incomeCents(line.importe)) incomeError('El importe del movimiento no coincide con la suma de las órdenes de las remesas o transferencia seleccionadas.');
  await db.query('DELETE FROM banco_cobros_ordenes WHERE id_linea_banco=$1', [line.id_linea_banco]);
  for (const order of orders) await db.query('INSERT INTO banco_cobros_ordenes(id_linea_banco,id_orden,id_remesa,importe) VALUES($1,$2,$3,$4)', [line.id_linea_banco,order.id_orden,order.id_remesa || null,order.cobro_total]);
  await db.query(`UPDATE lineas_bancos SET tipo_ingreso=$2,id_orden=$3,id_cuenta=$4,id_proveedor=NULL,id_agente=NULL,
    id_pago=NULL,id_cargo_recurrente=NULL,nomina_revision=NULL,estado_revision=TRUE,updated_at=now() WHERE id_linea_banco=$1`,
  [line.id_linea_banco,item.incomeType,item.incomeType === 'transferencia' ? item.orderId : null,item.incomeType === 'remesa' ? null : item.entityId || null]);
  await syncOrderCollections(db,[...old.map(o=>o.id_orden),...orders.map(o=>o.id_orden)],actorId);
  return (await db.query('SELECT * FROM lineas_bancos WHERE id_linea_banco=$1', [line.id_linea_banco])).rows[0];
}
