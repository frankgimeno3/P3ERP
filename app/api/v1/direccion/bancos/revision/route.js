import { NextResponse } from 'next/server';
import { getPgPool } from '../../../../../../server/database/pgClient.js';

export const runtime = 'nodejs';

export async function PUT(request) {
  try {
    const body = await request.json();
    const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
    if (!ids.length) return NextResponse.json({ message: 'Selecciona al menos una línea' }, { status: 400 });
    if (body.action === 'review') {
      const { rows } = await getPgPool().query(`UPDATE lineas_bancos SET estado_revision=TRUE,updated_at=NOW() WHERE id_linea_banco=ANY($1::text[]) RETURNING *`, [ids]);
      return NextResponse.json(rows);
    }
    if (['assign', 'validate-assignment'].includes(body.action) && ['proveedor', 'cliente'].includes(body.entityType) && body.entityId) {
      const supplier = body.entityType === 'proveedor';
      const client = await getPgPool().connect();
      try {
        await client.query('BEGIN');
        const { rows: lines } = await client.query('SELECT id_linea_banco, id_proveedor, id_cuenta FROM lineas_bancos WHERE id_linea_banco=ANY($1::text[]) FOR UPDATE', [ids]);
        if (lines.length !== new Set(ids).size) {
          await client.query('ROLLBACK');
          return NextResponse.json({ message: 'Alguna línea ya no existe. Actualiza la selección.' }, { status: 409 });
        }
        const assigned = lines.filter(line => line.id_proveedor || line.id_cuenta);
        if (assigned.length) {
          await client.query('ROLLBACK');
          return NextResponse.json({ message: `No se puede continuar: ${assigned.length} línea(s) ya tienen un proveedor o cliente asignado.`, conflicts: assigned }, { status: 409 });
        }
        if (body.action === 'validate-assignment') {
          await client.query('COMMIT');
          return NextResponse.json({ ok: true });
        }
        const { rows } = await client.query(`UPDATE lineas_bancos SET id_proveedor=$1,id_cuenta=$2,updated_at=NOW() WHERE id_linea_banco=ANY($3::text[]) RETURNING *`, [supplier ? body.entityId : null, supplier ? null : body.entityId, ids]);
        await client.query('COMMIT');
        return NextResponse.json(rows);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
    return NextResponse.json({ message: 'Acción no válida' }, { status: 400 });
  } catch (error) { return NextResponse.json({ message: error.message || 'No se pudo actualizar la selección' }, { status: 500 }); }
}
