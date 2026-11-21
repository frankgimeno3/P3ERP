import { NextResponse } from 'next/server';
import { resolveIdentifier } from '@/server/features/identifiers/IdentifierAliases.js';
import { getPgPool } from '@/server/database/pgClient.js';
import { taskIdentity, requireTaskIdentity } from '@/server/features/laboral/TaskAccess.js';
import { canManageAccountTasks } from '@/app/config/accountTasks.js';

export async function PATCH(request, { params }) {
  try {
    const actor = taskIdentity(request);
    requireTaskIdentity(actor);
    if (!canManageAccountTasks(actor.role)) return NextResponse.json({ message: 'No tienes permiso para editar contactos.' }, { status: 403 });
    const { id_cuenta } = await params;
    const account = await resolveIdentifier('cuenta', id_cuenta);
    const { id_contacto, campo, valor } = await request.json();
    if (typeof id_contacto !== 'string' || !['es_contacto_administrativo','es_receptor_digital'].includes(campo) || typeof valor !== 'boolean') {
      return NextResponse.json({ message: 'Distintivo no válido.' }, { status: 400 });
    }
    const { rows } = await getPgPool().query(`UPDATE comercial_contactos SET ${campo}=$3
      WHERE id_contacto=$1 AND id_cuenta=$2 RETURNING es_contacto_administrativo,es_receptor_digital`, [id_contacto, account, valor]);
    return rows.length ? NextResponse.json(rows[0]) : NextResponse.json({ message: 'El contacto no pertenece a esta cuenta.' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ message: error.status ? error.message : 'No se pudo guardar el distintivo.' }, { status: error.status || 500 });
  }
}
