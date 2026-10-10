import { syncOrderCollections } from '../prevision/IncomeReconciliation.js';
import { reopenCardSettlements } from '../proveedor/CardSettlementRepository.js';
import { assertMovementVersion, fail } from './BankWorkflowValidation.js';
import {reopenInternalTransfers} from './InternalTransfers.js';

// The caller owns the transaction and holds the bank, income and payroll locks.
export async function saveReviewAction(db, body, lines, actorId) {
  const ids = lines.map(line => line.id_linea_banco);
    if (body.action === 'force-review') {
      if(typeof body.forcedComment !== 'string' || !body.forcedComment.trim() || body.forcedComment.length>30000)fail('El comentario de revisión forzada es obligatorio y no puede superar 30000 caracteres.');
      if(lines.some(l=>l.estado_revision))fail('Selecciona solamente movimientos sin revisar.');
      for (const line of lines) assertMovementVersion(line, body.items?.find(item => item.id === line.id_linea_banco));
      const result=await db.query("UPDATE tesoreria_movimientos_bancarios SET estado_revision=TRUE,comentarios=concat_ws(E'\\n',NULLIF(comentarios,''),$2::text),updated_at=NOW() WHERE id_linea_banco=ANY($1::text[]) RETURNING *",[ids,body.forcedComment.trim()]);
      const incomeIds=lines.filter(l=>Number(l.importe)>0).map(l=>l.id_linea_banco);
      const linked = incomeIds.length ? (await db.query('SELECT id_orden FROM tesoreria_aplicaciones_cobro WHERE id_linea_banco=ANY($1::text[])', [incomeIds])).rows : [];
      await syncOrderCollections(db,linked.map(row=>row.id_orden),actorId);
      return result.rows;
    }
    if (body.action === 'unreview') {
      if (lines.some(l => !l.estado_revision)) fail('Selecciona únicamente registros revisados.');
      await reopenInternalTransfers(db,ids);
      await reopenCardSettlements(db,ids);
      const result = await db.query('UPDATE tesoreria_movimientos_bancarios SET estado_revision=FALSE,updated_at=NOW() WHERE id_linea_banco=ANY($1::text[]) RETURNING *', [ids]);
      const incomeIds=lines.filter(l=>Number(l.importe)>0).map(l=>l.id_linea_banco);
      const linked = incomeIds.length ? (await db.query('SELECT id_orden FROM tesoreria_aplicaciones_cobro WHERE id_linea_banco=ANY($1::text[])', [incomeIds])).rows : [];
      await syncOrderCollections(db,linked.map(row=>row.id_orden),actorId);
      return result.rows;
    }
  return null;
}
