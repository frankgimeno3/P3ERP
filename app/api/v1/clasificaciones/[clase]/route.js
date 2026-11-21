import { NextResponse } from 'next/server';
import { getPgPool } from '@/server/database/pgClient.js';
import { taskIdentity, requireTaskIdentity } from '@/server/features/laboral/TaskAccess.js';
import { canManageAccountTasks } from '@/app/config/accountTasks.js';

const configs = {
  'actividades-cuentas': ['comercial_cuenta_actividades', 'comercial_cuentas', 'id_cuenta', 'nombre_empresa'],
  'tipos-contacto': ['comercial_contacto_tipos', 'comercial_contactos', 'id_contacto', 'nombre_completo_contacto'],
};
const fail = (message, status) => NextResponse.json({ message }, { status });

async function handle(request, { params }) {
  try {
    const { clase } = await params;
    if (!Object.hasOwn(configs, clase)) return fail('Catálogo no encontrado.', 404);
    const actor = taskIdentity(request);
    requireTaskIdentity(actor);
    const [relation, entity, key, label] = configs[clase];
    const db = getPgPool();
    const id = request.nextUrl.searchParams.get('id');
    const record = request.nextUrl.searchParams.get('registro');
    if (id && !/^[0-9]{1,18}$/.test(id)) return fail('Identificador inválido.', 400);
    if (request.method === 'GET') {
      if (id) {
        const [item, members] = await Promise.all([
          db.query('SELECT id,nombre FROM operaciones_clasificaciones WHERE clase=$1 AND id=$2', [clase, id]),
          db.query(`SELECT e.${key} id,e.${label} nombre FROM ${relation} r JOIN ${entity} e USING (${key}) WHERE r.id_clasificacion=$1 ORDER BY e.${label},e.${key}`, [id]),
        ]);
        return item.rowCount ? NextResponse.json({ ...item.rows[0], miembros: members.rows }) : fail('Clasificación no encontrada.', 404);
      }
      const result = await db.query(`SELECT c.id,c.nombre,
        EXISTS(SELECT 1 FROM ${relation} r WHERE r.id_clasificacion=c.id AND r.${key}=$2) asociado
        FROM operaciones_clasificaciones c WHERE c.clase=$1 ORDER BY c.nombre,c.id`, [clase, record]);
      return NextResponse.json(result.rows);
    }
    if (request.method === 'POST' && !record && !id) {
      requireTaskIdentity(actor, true);
      const body = await request.json();
      const name = typeof body.nombre === 'string' ? body.nombre.trim().replace(/\s+/g, ' ') : '';
      if (!name || name.length > 200) return fail('Introduce un nombre válido.', 400);
      const result = await db.query('INSERT INTO operaciones_clasificaciones(clase,nombre) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING id,nombre', [clase, name]);
      return result.rowCount ? NextResponse.json(result.rows[0], { status: 201 }) : fail('Ya existe una clasificación con ese nombre.', 409);
    }
    if (!canManageAccountTasks(actor.role) && !['base','comercial'].includes(actor.role.toLowerCase())) return fail('No tienes permiso para editar esta clasificación.', 403);
    if (!record || !id) return fail('Falta la clasificación o el registro.', 400);
    if (request.method === 'POST') {
      await db.query(`INSERT INTO ${relation}(${key},id_clasificacion) VALUES($1,$2) ON CONFLICT DO NOTHING`, [record,id]);
    } else {
      await db.query(`DELETE FROM ${relation} WHERE ${key}=$1 AND id_clasificacion=$2`, [record,id]);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error.code === '23503') return fail('El registro o la clasificación ya no existe.', 404);
    return fail(error.status ? error.message : 'No se pudo procesar el catálogo.', error.status || 500);
  }
}

export { handle as GET, handle as POST, handle as DELETE };
