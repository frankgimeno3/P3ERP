import { randomUUID } from 'node:crypto';
import { ensureOrderReceipt, incomeCents, syncOrderCollections } from '../prevision/IncomeReconciliation.js';
import { parseImportDate } from '../prevision/ReceiptExcel.js';
import { orderActivity } from '../comentario/AccountActivity.js';

// Called inside the invoice transaction, with the income lock already held.
export async function syncInvoiceOrders(db, invoiceId, actorId = '') {
  const invoice = (await db.query('SELECT * FROM facturas_clientes_db WHERE id_factura_cliente=$1', [invoiceId])).rows[0];
  if (!invoice?.id_contrato || invoice.factura_origen_id) return;
  const payments = (await db.query('SELECT * FROM cobros_contratos_db WHERE id_contrato=$1 ORDER BY numero_cobro', [invoice.id_contrato])).rows;
  const orderIds = [];
  for (const payment of payments) {
    const matches = (await db.query(`SELECT * FROM ordenes_db WHERE id_contrato=$1
      AND (id_cobro_contrato=$2 OR numero_cobro=$3) ORDER BY id_orden FOR UPDATE`,
    [invoice.id_contrato, payment.id_cobro_contrato, payment.numero_cobro])).rows;
    if (matches.length > 1) throw new Error('Varias órdenes coinciden con el cobro ' + payment.numero_cobro);
    const previous = matches[0];
    const total = Number(payment.importe_cobro);
    if (!Number.isFinite(total) || total < 0) throw new Error('Importe de cobro no válido');
    const patch = {
      id_factura: invoiceId, id_cuenta: invoice.id_cuenta, id_cobro_contrato: payment.id_cobro_contrato,
      fecha_teorica_cobro: payment.fecha_cobro ? parseImportDate(payment.fecha_cobro) : '',
      forma_cobro: payment.forma_cobro || '', banco_cobro: payment.banco_cobro || '',
      cobro_total: total,
      base_imponible: Number(invoice.importe_total) ? Math.round(total * Number(invoice.base_imponible) / Number(invoice.importe_total) * 100) / 100 : total,
    };
    const changed = Object.keys(patch).filter(key => ['cobro_total','base_imponible'].includes(key)
      ? incomeCents(previous?.[key]) !== incomeCents(patch[key])
      : String(previous?.[key] || '') !== String(patch[key] || ''));
    const receipt = previous && (await db.query('SELECT * FROM prevision_recibos_excel WHERE id_orden=$1 FOR UPDATE', [previous.id_orden])).rows[0];
    if (previous && changed.some(key => ['cobro_total','forma_cobro','banco_cobro'].includes(key))) {
      const reviewed = (await db.query(`SELECT 1 FROM banco_cobros_ordenes a JOIN lineas_bancos b USING(id_linea_banco)
        WHERE a.id_orden=$1 AND b.estado_revision LIMIT 1`, [previous.id_orden])).rowCount;
      if (previous.cobrada || reviewed) throw new Error('Desmarca primero el cobro de la orden ' + previous.id_orden + ' antes de cambiar sus datos de pago.');
    }
    if (receipt?.id_remesa && !/recibo/i.test(patch.forma_cobro)) throw new Error('Retira primero el recibo de su remesa antes de cambiarlo a otra forma de cobro.');
    const orderId = previous?.id_orden || 'ord_' + randomUUID().replaceAll('-', '').slice(0, 24);
    if (!previous) {
      const row = {id_orden: orderId, id_contrato: invoice.id_contrato, numero_cobro: payment.numero_cobro, etiqueta_cobro: 'Cobro ' + payment.numero_cobro, ...patch};
      const keys = Object.keys(row);
      await db.query('INSERT INTO ordenes_db(' + keys.join(',') + ') VALUES(' + keys.map((_,i) => '$' + (i+1)).join(',') + ')', keys.map(key => row[key]));
    } else if (changed.length) {
      await db.query('UPDATE ordenes_db SET ' + changed.map((key,i) => key + '=$' + (i+1)).join(',') + ',updated_at=now() WHERE id_orden=$' + (changed.length+1), [...changed.map(key => patch[key]), orderId]);
    }
    if (!previous || changed.length) await orderActivity(db, orderId, actorId, 'ha actualizado los datos de pago desde la factura: ' + changed.map(key => key + '=' + patch[key]).join(', ') + '.');
    if (receipt && !/recibo/i.test(patch.forma_cobro)) {
      await db.query('DELETE FROM prevision_recibos_excel WHERE numero_recibo=$1', [receipt.numero_recibo]);
      await orderActivity(db, orderId, actorId, 'ha sustituido el recibo ' + receipt.numero_recibo + ' por ' + patch.forma_cobro + '.');
    }
    await ensureOrderReceipt(db, orderId, actorId);
    orderIds.push(orderId);
  }
  await syncOrderCollections(db, orderIds, actorId);
}
