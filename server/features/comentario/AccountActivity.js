import { randomUUID } from 'node:crypto';
import { addCuentaEvento } from '../registroEventos/RegistroEventosRepository.js';

// This header is overwritten by the authenticated middleware, never taken from a JSON body.
export const requestActor = request => request.headers.get('x-p3-actor-id') || '';

export async function accountActivity(db, idCuenta, actorId, detail) {
  if (!idCuenta || !detail) return;
  const actor = actorId ? (await db.query('SELECT nombre_completo_agente FROM agentes_db WHERE id_agente=$1', [actorId])).rows[0] : null;
  const text = `El usuario ${actor?.nombre_completo_agente || actorId || 'sistema'} ${detail}`;
  await db.query(`INSERT INTO comentarios_db
    (id_comentario,id_original_autor,id_last_editor,tipo_entidad,id_entidad,contenido_comentario)
    VALUES($1,$2,$2,'cuenta',$3,$4)`, [`com_${randomUUID()}`, actorId || '', idCuenta, text]);
  await addCuentaEvento({ idCuenta, idAgente: actorId, detalles: text, eventType: actorId ? 'Cambio por agente' : 'Acción automatizada' }, db);
}

export async function orderActivity(db, orderId, actorId, detail) {
  const row = (await db.query(`SELECT COALESCE(NULLIF(o.id_cuenta,''),c.id_cuenta_contrato,f.id_cuenta) id_cuenta,
    o.id_factura FROM ordenes_db o LEFT JOIN contratos_db c ON c.id_contrato=o.id_contrato
    LEFT JOIN facturas_clientes_db f ON f.id_factura_cliente=o.id_factura WHERE o.id_orden=$1`, [orderId])).rows[0];
  if (row) await accountActivity(db, row.id_cuenta, actorId, `${detail} Orden ${orderId}; factura ${row.id_factura || 'pendiente de asignar'}.`);
}
