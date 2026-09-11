import { NextResponse } from 'next/server';
import { saveBankWorkflow } from '@/server/features/banco/BankReviewWorkflow.js';
import { getPgPool } from '../../../../../../server/database/pgClient.js';
import { findPayrollCharge, insertRecurringCharge } from '../../../../../../server/features/prevision/RecurringChargeRepository.js';

export const runtime = 'nodejs';

export async function PUT(request) {
  try {
    const body = await request.json();
    if (['workflow', 'unreview'].includes(body.action)) return NextResponse.json(await saveBankWorkflow(body));
    const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
    if (!ids.length) return NextResponse.json({ message: 'Selecciona al menos una línea' }, { status: 400 });
    if (body.action === 'review') {
      return NextResponse.json({ message: 'Completa las cinco fases de revisión antes de confirmar.' }, { status: 400 });
    }
    if (['assign', 'validate-assignment'].includes(body.action) && ['proveedor', 'cliente', 'nomina'].includes(body.entityType) && body.entityId) {
      const supplier = body.entityType === 'proveedor';
      const payroll = body.entityType === 'nomina';
      const client = await getPgPool().connect();
      try {
        await client.query('BEGIN');
        await client.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
        const entitySql = payroll ? 'SELECT id_agente FROM agentes_db WHERE id_agente=$1 AND is_empleado_account=TRUE FOR SHARE' : supplier ? 'SELECT id_proveedor FROM proveedores_db WHERE id_proveedor=$1 FOR SHARE' : 'SELECT id_cuenta FROM cuentas_db WHERE id_cuenta=$1 FOR SHARE';
        if (!(await client.query(entitySql, [body.entityId])).rowCount) {
          await client.query('ROLLBACK');
          return NextResponse.json({ message: 'El destinatario no existe o no es una cuenta de empleado.' }, { status: 400 });
        }
        const { rows: lines } = await client.query('SELECT * FROM lineas_bancos WHERE id_linea_banco=ANY($1::text[]) FOR UPDATE', [ids]);
        if (lines.length !== new Set(ids).size) {
          await client.query('ROLLBACK');
          return NextResponse.json({ message: 'Alguna línea ya no existe. Actualiza la selección.' }, { status: 409 });
        }
        const linked = await client.query('SELECT id_transferencia FROM nominas WHERE id_transferencia=ANY($1::text[]) UNION ALL SELECT id_transferencia FROM anticipos_empleados WHERE id_transferencia=ANY($1::text[])', [ids]);
        const assigned = lines.filter(line => line.id_proveedor || line.id_cuenta || line.id_agente || line.id_pago || line.id_orden || line.id_cargo_recurrente || linked.rows.some(payment => payment.id_transferencia === line.id_linea_banco));
        if (assigned.length) {
          await client.query('ROLLBACK');
          return NextResponse.json({ message: `No se puede continuar: ${assigned.length} línea(s) ya tienen una asignación o pago vinculado.`, conflicts: assigned }, { status: 409 });
        }
        if (payroll && lines.some(line => Number(line.importe) >= 0)) {
          await client.query('ROLLBACK');
          return NextResponse.json({ message: 'Solo se pueden asignar cargos (importes negativos) a nóminas.' }, { status: 400 });
        }
        const existingCharge = payroll ? await findPayrollCharge(client, body.entityId) : null;
        if (body.action === 'validate-assignment') {
          await client.query('COMMIT');
          return NextResponse.json({ ok: true, needsPayrollCharge: payroll && !existingCharge });
        }
        if (payroll && !existingCharge) {
          if (body.cargo_previsto) {
            await insertRecurringCharge(client, { ...body.cargo_previsto, tipo_cargo: 'nomina', id_agente: body.entityId, id_proveedor: null }, true);
          } else if (body.skipPayrollCharge !== true) {
            await client.query('ROLLBACK');
            return NextResponse.json({ message: 'Comprueba la fase Cargos previstos registrados antes de confirmar.' }, { status: 409 });
          }
        }
        const { rows } = await client.query(`UPDATE lineas_bancos SET id_proveedor=$1,id_cuenta=$2,id_agente=$3,updated_at=NOW() WHERE id_linea_banco=ANY($4::text[]) RETURNING *`, [supplier ? body.entityId : null, !supplier && !payroll ? body.entityId : null, payroll ? body.entityId : null, ids]);
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
  } catch (error) { return NextResponse.json({ message: error.message || 'No se pudo actualizar la selección' }, { status: error.status || 500 }); }
}
