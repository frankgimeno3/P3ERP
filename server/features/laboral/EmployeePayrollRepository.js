import { randomUUID } from 'node:crypto';
import { getPgPool } from '../../database/pgClient.js';
import { LaboralError } from './validation.js';

export async function employeePayrolls(id, employee) {
  const db = getPgPool();
  const rows = (await db.query(`SELECT n.*, COALESCE(NULLIF(a.nombre_completo_agente,''),
    NULLIF(trim(concat_ws(' ',a.nombre_agente,a.apellidos_agente)),''),a.id_agente) AS empleado,
    (SELECT count(*)::int FROM cargos_recurrentes c WHERE c.tipo_cargo='nomina' AND c.id_agente=n.id_empleado) AS cargos
    FROM nominas_empleados n JOIN agentes_db a ON a.id_agente=n.id_empleado
    WHERE ($1::text IS NULL OR n.id=$1) AND ($2::text IS NULL OR n.id_empleado=$2)
    ORDER BY empleado`, [id || null, employee || null])).rows;
  if (!id) return rows;
  if (!rows.length) throw new LaboralError('Nómina no encontrada.',404);
  const result = rows[0];
  result.cargos = (await db.query("SELECT * FROM cargos_recurrentes WHERE tipo_cargo='nomina' AND id_agente=$1 ORDER BY created_at DESC", [result.id_empleado])).rows;
  result.movimientos = (await db.query(`SELECT l.*, ae.id AS id_anticipo,
    CASE WHEN ae.id IS NOT NULL THEN 'anticipo' ELSE COALESCE(l.nomina_revision->>'decision','nomina') END AS tipo_nomina
    FROM lineas_bancos l LEFT JOIN cargos_recurrentes c USING(id_cargo_recurrente)
    LEFT JOIN anticipos_empleados ae ON ae.id_transferencia=l.id_linea_banco
    WHERE (c.tipo_cargo='nomina' AND c.id_agente=$1) OR ae.id_empleado=$1
      OR (l.id_agente=$1 AND l.nomina_revision->>'decision'='otros')
      OR EXISTS(SELECT 1 FROM nominas p WHERE p.id_empleado=$1 AND p.id_transferencia=l.id_linea_banco)
    ORDER BY l.created_at DESC,l.id_linea_banco`, [result.id_empleado])).rows;
  result.periodos = (await db.query('SELECT * FROM nominas WHERE id_empleado=$1 ORDER BY anio DESC,mes DESC',[result.id_empleado])).rows;
  result.anticipos = (await db.query('SELECT * FROM anticipos_empleados WHERE id_empleado=$1 ORDER BY anio DESC,mes DESC,created_at DESC',[result.id_empleado])).rows;
  return result;
}

export async function agentTasks(id, employee) {
  const rows = (await getPgPool().query(`SELECT t.*,COALESCE(NULLIF(a.nombre_completo_agente,''),a.nombre_agente,a.id_agente) AS nombre_agente
    FROM agentes_tareas t JOIN agentes_db a ON a.id_agente=t.agente
    WHERE ($1::text IS NULL OR t.id=$1) AND ($2::text IS NULL OR t.agente=$2) ORDER BY t.created_at DESC`,[id || null,employee || null])).rows;
  if (id && !rows.length) throw new LaboralError('Tarea no encontrada.',404);
  return id ? rows[0] : rows;
}
export async function saveAgentTask(id, body) {
  const nombre = String(body.nombre || '').trim(), descripcion = String(body.descripcion || '');
  if (!nombre || nombre.length>250 || !body.agente || !['pendiente','en_curso','completada','cancelada'].includes(body.estado)) throw new LaboralError('Completa nombre, agente y estado válidos.');
  const db = getPgPool();
  const result = id ? await db.query(`UPDATE agentes_tareas SET nombre=$2,estado=$3,descripcion=$4,updated_at=now() WHERE id=$1 AND agente=$5 RETURNING *`,[id,nombre,body.estado,descripcion,body.agente])
    : await db.query(`INSERT INTO agentes_tareas(id,nombre,estado,descripcion,agente) VALUES($1,$2,$3,$4,$5) RETURNING *`,[`tarea_${randomUUID().replaceAll('-','')}`,nombre,body.estado,descripcion,body.agente]);
  if (!result.rowCount) throw new LaboralError('Tarea no encontrada para este agente.',404);
  return result.rows[0];
}
