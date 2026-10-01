import { randomUUID } from 'node:crypto';
import { getPgPool } from '../../database/pgClient.js';
import { analyzeBankReview, cents, fingerprint, lineEvidence, lineDate, withRuleIds } from './BankReviewAnalysis.js';

const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
export async function memoryAvailable(db) {
  const { rows } = await db.query("SELECT to_regclass('tesoreria_revision_decisiones') IS NOT NULL AS ready");
  return rows[0].ready;
}
function selection(body) {
  if (!Array.isArray(body.ids) || !body.ids.length || body.ids.length > 500 || body.ids.some(id => typeof id !== 'string')) fail('Selecciona entre 1 y 500 movimientos.');
  return [...new Set(body.ids)];
}
export async function loadReviewAnalysis(db, body, preview = false) {
  const ids = selection(body);
  if (!await memoryAvailable(db)) fail('La memoria de revisión requiere aplicar la migración 20260920_0001_bank_review_memory.sql.', 503);
  const lines = (await db.query('SELECT * FROM tesoreria_movimientos_bancarios ORDER BY id_linea_banco')).rows;
  if (ids.some(id => !lines.some(l => l.id_linea_banco === id))) fail('Algún movimiento ya no existe. Recarga la selección.', 409);
  const charges = (await db.query('SELECT * FROM tesoreria_cargos_recurrentes')).rows.map(withRuleIds);
  if (preview && Array.isArray(body.drafts)) for (const draft of body.drafts) {
    if (!ids.includes(draft.id)) continue;
    const line = lines.find(l => l.id_linea_banco === draft.id);
    if (['proveedor','otro'].includes(draft.entityType)) {
      const charge = charges.find(c => String(c.id_cargo_recurrente) === String(draft.chargeId));
      if(charge?.id_tarjeta)fail('Este cargo se paga mediante tarjeta. Usa Liquidación tarjeta.');
      if (charge && ((charge.tipo_cargo || 'proveedor') !== draft.entityType || draft.entityType === 'proveedor' && charge.id_proveedor !== draft.entityId)) fail('El cargo previsto no corresponde al destinatario.');
      line.id_proveedor = draft.entityType === 'proveedor' ? draft.entityId || null : null;
      line.id_agente = null;
      line.id_cuenta = null;
      line.id_cargo_recurrente = charge?.id_cargo_recurrente || null;
    }
  }
  const storedOccurrences = (await db.query("SELECT *,to_char(fecha,'YYYY-MM-DD') AS fecha FROM tesoreria_cargos_vencimientos")).rows;
  let applications = (await db.query('SELECT * FROM tesoreria_vencimientos_aplicaciones')).rows;
  if (preview && Array.isArray(body.allocations)) for (const plan of body.allocations) {
    if (!ids.includes(plan.lineId) || !Array.isArray(plan.allocations)) continue;
    applications = applications.filter(a => a.id_linea_banco !== plan.lineId).concat(plan.allocations.map(a => ({ id_linea_banco: plan.lineId, id_vencimiento: a.id, importe: a.amount })));
  }
  const decisions = (await db.query('SELECT * FROM tesoreria_revision_decisiones WHERE revoked_at IS NULL ORDER BY created_at DESC')).rows;
  const criteria = (await db.query('SELECT c.*,d.motivo FROM tesoreria_revision_criterios c JOIN tesoreria_revision_decisiones d ON d.id=c.id_decision WHERE c.revoked_at IS NULL AND d.revoked_at IS NULL ORDER BY c.created_at DESC')).rows;
  const result = analyzeBankReview({ lines, selectedIds: ids, charges, storedOccurrences, applications, decisions, criteria });
  result.token = fingerprint({ selected: lines.filter(l => ids.includes(l.id_linea_banco)).map(lineEvidence), alerts: result.alerts.map(a => a.fingerprint), applications: result.applications });
  // Only expose rules pertinent to the selected charges, not an unrelated global history.
  const chargeIds = new Set(lines.filter(l => ids.includes(l.id_linea_banco)).map(l => String(l.id_cargo_recurrente)));
  result.criteria = result.criteria.filter(c => c.condiciones.charges?.some(([id]) => chargeIds.has(id)));
  return result;
}
export async function getReviewAnalysis(body) {
  const db = await getPgPool().connect();
  try {
    await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const result = await loadReviewAnalysis(db, body, true);
    await db.query('COMMIT'); return result;
  } catch (e) { await db.query('ROLLBACK'); throw e; } finally { db.release(); }
}
export async function changeReviewMemory(body, actor = '', existingDb = null) {
  const db = existingDb || await getPgPool().connect();
  try {
    if (!existingDb) await db.query('BEGIN');
    await db.query("SET LOCAL lock_timeout='3s'");
    await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
    const ids = selection(body);
    await db.query('SELECT id_linea_banco FROM tesoreria_movimientos_bancarios WHERE id_linea_banco=ANY($1::text[]) ORDER BY id_linea_banco FOR UPDATE', [ids]);
    const analysis = await loadReviewAnalysis(db, body);
    if (!existingDb && body.token !== analysis.token) fail('Los datos han cambiado. Actualiza la comparación antes de confirmar.', 409);
    if (body.action === 'decide') {
      const alert = analysis.alerts.find(a => a.key === body.key && a.fingerprint === body.fingerprint);
      if (!alert) fail('El aviso ha cambiado o ya está resuelto. Actualiza la comparación.', 409);
      if (typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 3000) fail('Explica el motivo de la decisión (máximo 3000 caracteres).');
      if (body.reuse && !alert.reusable) fail('Este aviso solo admite una decisión para estos movimientos.');
      const id = randomUUID();
      await db.query('INSERT INTO tesoreria_revision_decisiones(id,clave,huella,tipo,movimientos,motivo,evidencia,actor) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8)', [id, alert.key, alert.fingerprint, alert.type, alert.ids, body.reason.trim(), JSON.stringify(alert.evidence), actor]);
      if (body.reuse) {
        const validAfter = analysis.lines.filter(l=>alert.ids.includes(l.id_linea_banco)).map(lineDate).sort().at(-1);
        await db.query('INSERT INTO tesoreria_revision_criterios(id,id_decision,condiciones,actor) VALUES($1,$2,$3::jsonb,$4)', [randomUUID(), id, JSON.stringify({...alert.reusable,validAfter}), actor]);
      }
    } else if (body.action === 'revoke-decision') {
      if (!analysis.resolved.some(r => r.decisionId === body.decisionId)) fail('La decisión no pertenece a esta comparación.');
      await db.query('UPDATE tesoreria_revision_decisiones SET revoked_at=now() WHERE id=$1', [body.decisionId]);
      await db.query('UPDATE tesoreria_revision_criterios SET revoked_at=now() WHERE id_decision=$1', [body.decisionId]);
    } else if (body.action === 'revoke-criterion') {
      if (!analysis.criteria.some(c => c.id === body.criterionId)) fail('El criterio no pertenece a los cargos seleccionados.');
      await db.query('UPDATE tesoreria_revision_criterios SET revoked_at=now() WHERE id=$1', [body.criterionId]);
    } else if (body.action === 'apply') {
      const line = analysis.lines.find(l => l.id_linea_banco === body.lineId && ids.includes(l.id_linea_banco));
      if (!line || Number(line.importe) >= 0 || !line.id_cargo_recurrente) fail('Asigna primero el movimiento a un cargo previsto.');
      if (!Array.isArray(body.allocations) || body.allocations.length > 100) fail('Indica las aplicaciones a vencimientos.');
      if (new Set(body.allocations.map(a => a.id)).size !== body.allocations.length) fail('Un vencimiento no puede repetirse en la misma aplicación.');
      let total = 0;
      for (const app of body.allocations) {
        const occurrence = analysis.occurrences.find(o => o.id === app.id && !o.orphaned && String(o.id_cargo_recurrente) === String(line.id_cargo_recurrente));
        const amount = Number(app.amount);
        if (!occurrence || !Number.isFinite(amount) || cents(amount) <= 0 || Math.abs(amount * 100 - cents(amount)) > 0.00001) fail('Selecciona un vencimiento válido y un importe positivo con hasta dos decimales.');
        const previous = analysis.applications.find(a => a.id_linea_banco === line.id_linea_banco && a.id_vencimiento === app.id);
        if (cents(occurrence.applied) - cents(previous?.importe) + cents(amount) > cents(occurrence.importe)) fail('La aplicación supera el importe pendiente del vencimiento. Comprueba si ya está pagado.', 409);
        total += cents(amount);
      }
      if (total > Math.abs(cents(line.importe))) fail('Las aplicaciones superan el importe del movimiento.');
      await db.query('DELETE FROM tesoreria_vencimientos_aplicaciones WHERE id_linea_banco=$1', [line.id_linea_banco]);
      for (const app of body.allocations) {
        const o = analysis.occurrences.find(o => o.id === app.id);
        await db.query(`INSERT INTO tesoreria_cargos_vencimientos(id,id_cargo_recurrente,id_regla,fecha,importe,descripcion,programacion) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)
          ON CONFLICT(id) DO UPDATE SET importe=EXCLUDED.importe,descripcion=EXCLUDED.descripcion,programacion=EXCLUDED.programacion
          WHERE NOT EXISTS(SELECT 1 FROM tesoreria_vencimientos_aplicaciones a WHERE a.id_vencimiento=EXCLUDED.id)`, [o.id, o.id_cargo_recurrente, o.id_regla, o.fecha, o.importe, o.descripcion, JSON.stringify(o.programacion)]);
        await db.query('INSERT INTO tesoreria_vencimientos_aplicaciones(id_linea_banco,id_vencimiento,importe,actor) VALUES($1,$2,$3,$4)', [line.id_linea_banco, o.id, Number(app.amount), actor]);
      }
    } else fail('Acción de memoria no válida.');
    const result = await loadReviewAnalysis(db, body);
    if (!existingDb) await db.query('COMMIT'); return result;
  } catch (e) { if (!existingDb) await db.query('ROLLBACK'); throw e; } finally { if (!existingDb) db.release(); }
}

export async function savePlannedReviewMemory(db, memory, saved, actor) {
  if (!memory) return;
  const ids = saved.map(l => l.id_linea_banco);
  if (!Array.isArray(memory.allocations) || !Array.isArray(memory.decisions) || memory.allocations.length > 500 || memory.decisions.length > 500) fail('Plan de memoria no válido.');
  for (const plan of memory.allocations) {
    if (!ids.includes(plan.lineId)) fail('No se puede aplicar un movimiento omitido.');
    await changeReviewMemory({ ids, action: 'apply', lineId: plan.lineId, allocations: plan.allocations }, actor, db);
  }
  for (const decision of memory.decisions) await changeReviewMemory({ ...decision, ids, action: 'decide' }, actor, db);
}

export async function rememberDuplicateDiscard(body, actor = '') {
  const ids = selection(body);
  if (ids.length < 2) fail('Indica las líneas del grupo.');
  const db = await getPgPool().connect();
  try {
    await db.query('BEGIN');
    await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
    const { rows } = await db.query('SELECT * FROM tesoreria_movimientos_bancarios WHERE id_linea_banco=ANY($1::text[]) ORDER BY id_linea_banco FOR UPDATE',[ids]);
    if (rows.length !== ids.length || rows.some(l=>l.fecha_operativa!==rows[0].fecha_operativa || cents(l.importe)!==cents(rows[0].importe))) fail('El grupo de duplicados ha cambiado. Actualiza la pantalla.',409);
    if (await memoryAvailable(db)) for (const row of rows) {
      await db.query("INSERT INTO tesoreria_revision_decisiones(id,clave,huella,tipo,movimientos,motivo,evidencia,actor) VALUES($1,$2,'','legacy',$3,'Confirmado como no duplicado en la gestión de duplicados.',$4::jsonb,$5)", [randomUUID(),`legacy:${row.id_linea_banco}`,[row.id_linea_banco],JSON.stringify(row),actor]);
    }
    await db.query('UPDATE tesoreria_movimientos_bancarios SET duplicado_descartado=TRUE,updated_at=NOW() WHERE id_linea_banco=ANY($1::text[])',[ids]);
    await db.query('COMMIT');return {confirmadas:ids};
  } catch(e) {await db.query('ROLLBACK');throw e;} finally {db.release();}
}
