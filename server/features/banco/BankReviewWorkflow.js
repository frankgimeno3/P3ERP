import { getPgPool } from '../../database/pgClient.js';
import { lockIncome, reconcileBankIncome } from '../prevision/IncomeReconciliation.js';
import { savePlannedReviewMemory } from './BankReviewMemoryRepository.js';
import { saveReviewAction } from './BankWorkflowReviewActions.js';
import { saveWorkflowExpense } from './BankWorkflowExpense.js';
import { assertMovementVersion, cents, fail, validateWorkflowSelection } from './BankWorkflowValidation.js';
import {readInternalTransfers} from './InternalTransfers.js';
export { cents } from './BankWorkflowValidation.js';
export { payrollCalculation } from './BankWorkflowPayroll.js';

export async function saveBankWorkflow(body, actorId = '') {
  const ids = validateWorkflowSelection(body);
  const db = await getPgPool().connect();
  try {
    await db.query('BEGIN');
    await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
    await lockIncome(db);
    const lines = (await db.query('SELECT * FROM tesoreria_movimientos_bancarios WHERE id_linea_banco=ANY($1::text[]) ORDER BY id_linea_banco FOR UPDATE', [ids])).rows;
    if (lines.length !== ids.length) fail('Algún movimiento ya no existe.');
    if(body.action!=='unreview'&&(await readInternalTransfers(db)).some(t=>[t.id_linea_cargo,t.id_linea_abono].some(id=>ids.includes(id))))fail('Este movimiento es un traspaso propio. Revísalo junto con su contrapartida desde Traspaso propio.');
    if(body.action!=='unreview'&&(await db.query('SELECT 1 FROM tesoreria_tarjetas_movimientos WHERE id_linea_banco=ANY($1::text[]) LIMIT 1',[ids])).rowCount)fail('Reabre primero la liquidación de tarjeta para modificar sus movimientos.');
    const actionResult = await saveReviewAction(db, body, lines, actorId);
    if (actionResult) { await db.query('COMMIT'); return actionResult; }
    if (!['review','assign','charge'].includes(body.mode)) fail('Modo de revisión no válido.');
    if (body.mode === 'review' && lines.some(l => l.estado_revision)) fail('No se pueden mezclar registros revisados y sin revisar.');
    if (!Array.isArray(body.items) || body.items.length !== ids.length || new Set(body.items.map(i => i.id)).size !== ids.length) fail('Completa las decisiones de todas las líneas.');
    const decisions = new Map(body.items.map(item => [item.id, item]));
    const increases = new Map();
    for (const item of body.items.filter(i => i.increase && i.resolution !== 'skip')) {
      const key = item.chargeId || JSON.stringify([item.entityType,item.entityId,item.newCharge]);
      const amount = Math.abs(Number(lines.find(l => l.id_linea_banco === item.id)?.importe));
      if (increases.has(key) && cents(increases.get(key)) !== cents(amount)) fail('Has indicado subidas distintas para el mismo cargo previsto. Elige un único importe mensual.');
      increases.set(key,amount);
    }
    const saved = [], created = new Map();
    // Advances must be persisted before the remaining salary for the same batch.
    if (body.mode === 'review') lines.sort((a,b) => {
      const priority = l => decisions.get(l.id_linea_banco)?.payrollKind === 'anticipo' ? 0 : 1;
      return priority(a)-priority(b) || a.id_linea_banco.localeCompare(b.id_linea_banco);
    });
    for (const line of lines) {
      const item = decisions.get(line.id_linea_banco);
      if (!item) fail('Falta la decisión de un movimiento.');
      assertMovementVersion(line, item);
      if (item.resolution === 'skip') continue;
      if (Number(line.importe) > 0 && body.mode === 'review') {
        if ((line.id_proveedor || line.id_agente || line.id_cuenta && item.incomeType !== 'remesa' && line.id_cuenta !== item.entityId) && item.resolution !== 'overwrite') fail('Confirma la sustitución del destinatario anterior.');
        saved.push(await reconcileBankIncome(db,line,item,actorId));
        continue;
      }
      if (Number(line.importe) > 0 && line.estado_revision) fail('Desmarca la revisión del ingreso antes de cambiar su asociación.');
      saved.push(await saveWorkflowExpense(db, body, line, item, created));
    }
    if (!saved.length) fail('No quedan movimientos para guardar.');
    if (body.mode === 'review') await savePlannedReviewMemory(db, body.memory, saved, actorId);
    await db.query('COMMIT'); return saved;
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
}
