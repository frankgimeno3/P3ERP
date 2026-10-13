import { addCuentaEvento } from '../registroEventos/RegistroEventosRepository.js';

// This header is overwritten by the authenticated middleware, never taken from a JSON body.
export const requestActor = request => request.headers.get('x-p3-actor-id') || '';

export async function accountActivity(db, idCuenta, actorId, detail) {
  if (!idCuenta || !detail) return;
  const actor = actorId ? (await db.query('SELECT nombre_completo_agente FROM agentes_db WHERE id_agente=$1', [actorId])).rows[0] : null;
  const text = `${actorId?`El usuario ${actor?.nombre_completo_agente || actorId}`:'ACCIÓN AUTOMÁTIZADA'} ${detail}`;
  await addCuentaEvento({ idCuenta, idAgente: actorId, detalles: text, eventType: actorId ? 'Cambio por agente' : 'Acción automatizada' }, db);
}

export async function orderActivity(db, orderId, actorId, detail) {
  const row = (await db.query(`SELECT COALESCE(NULLIF(o.id_cuenta,''),c.id_cuenta_contrato,f.id_cuenta) id_cuenta,
    o.id_factura FROM tesoreria_ordenes o LEFT JOIN comercial_contratos c ON c.id_contrato=o.id_contrato
    LEFT JOIN administracion_facturas_clientes f ON f.id_factura_cliente=o.id_factura WHERE o.id_orden=$1`, [orderId])).rows[0];
  if (row) await accountActivity(db, row.id_cuenta, actorId, `${detail} Orden ${orderId}; factura ${row.id_factura || 'pendiente de asignar'}.`);
}
