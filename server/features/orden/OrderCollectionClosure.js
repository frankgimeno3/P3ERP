import { getPgPool } from '../../database/pgClient.js';
import { lockIncome, syncInvoiceCollection } from '../prevision/IncomeReconciliation.js';
import { orderActivity } from '../comentario/AccountActivity.js';

export const collectionClosed = order => Boolean(order.datos_importacion?.cierre_cobro?.activo);

// A management closure removes the residual from forecasts, without inventing a
// collection, changing the invoice total, or marking a bank movement as paid.
export async function closeOrderCollection(db, order, { reason, actor = '', type = 'diferencia_asumida' }) {
  if (typeof reason !== 'string' || !reason.trim() || reason.length > 3000) throw new Error('Indica el motivo del cierre (máximo 3000 caracteres).');
  if (collectionClosed(order)) return order;
  if (order.cancelada) throw new Error('La orden está cancelada.');
  const paid = Number((await db.query(`SELECT COALESCE(sum(a.importe),0) amount
    FROM tesoreria_aplicaciones_cobro a JOIN tesoreria_movimientos_bancarios m USING(id_linea_banco)
    WHERE a.id_orden=$1 AND m.estado_revision AND NOT COALESCE(m.duplicado_descartado,false)`, [order.id_orden])).rows[0].amount);
  const closure = { activo: true, tipo: type, motivo: reason.trim(), actor, fecha: new Date().toISOString(),
    importe_previsto: Number(order.cobro_total || 0), importe_aplicado: paid,
    diferencia_asumida: order.cobrada ? 0 : Math.max(0, Math.round((Number(order.cobro_total || 0) - paid) * 100) / 100) };
  const result = (await db.query(`UPDATE tesoreria_ordenes SET datos_importacion=COALESCE(datos_importacion,'{}'::jsonb)
    || jsonb_build_object('cierre_cobro',$2::jsonb),updated_at=now() WHERE id_orden=$1 RETURNING *`, [order.id_orden, JSON.stringify(closure)])).rows[0];
  await orderActivity(db, order.id_orden, actor, `ha cerrado la gestión del cobro: ${closure.motivo} Diferencia asumida: ${closure.diferencia_asumida.toFixed(2)} EUR. Se conservan los importes y cobros reales.`);
  await syncInvoiceCollection(db, [order.id_factura]);
  return result;
}

export async function changeOrderCollectionClosure(id, body, actor = '') {
  if (!['cerrar_cobro','reabrir_cobro'].includes(body.action)) throw new Error('Acción de cierre no válida.');
  if (!body.version || !Number.isFinite(new Date(body.version).getTime())) throw new Error('Recarga la orden antes de continuar.');
  const db = await getPgPool().connect();
  try {
    await db.query('BEGIN');
    await lockIncome(db);
    const order = (await db.query('SELECT * FROM tesoreria_ordenes WHERE id_orden=$1 FOR UPDATE', [id])).rows[0];
    if (!order) throw new Error('Orden no encontrada.');
    if (new Date(order.updated_at).getTime() !== new Date(body.version).getTime()) throw new Error('La orden ha cambiado. Recárgala antes de confirmar.');
    if (body.action === 'cerrar_cobro') await closeOrderCollection(db, order, { reason: body.reason, actor });
    else {
      if (!collectionClosed(order)) throw new Error('La gestión de cobro ya está abierta.');
      await db.query(`UPDATE tesoreria_ordenes SET datos_importacion=jsonb_set(datos_importacion,'{cierre_cobro}',
        (datos_importacion->'cierre_cobro') || jsonb_build_object('activo',false,'reabierto_at',now(),'reabierto_por',$2::text)),updated_at=now() WHERE id_orden=$1`, [id, actor]);
      await orderActivity(db, id, actor, 'ha reabierto la gestión del cobro; el saldo pendiente vuelve a las previsiones.');
      await syncInvoiceCollection(db, [order.id_factura]);
    }
    await db.query('COMMIT');
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
}
