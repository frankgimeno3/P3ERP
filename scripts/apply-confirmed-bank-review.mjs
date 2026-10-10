import env from '@next/env';
import fs from 'node:fs/promises';
import path from 'node:path';
import {getPgPool} from '../server/database/pgClient.js';
import {ownTransferConcept,matchingTransferLines,reviewInternalTransfer,readInternalTransfers} from '../server/features/banco/InternalTransfers.js';
import {saveReviewAction} from '../server/features/banco/BankWorkflowReviewActions.js';
import {saveWorkflowExpense} from '../server/features/banco/BankWorkflowExpense.js';
import {reconcileBankIncome} from '../server/features/prevision/IncomeReconciliation.js';
import {editJuanChargeMonth} from '../server/features/prevision/JuanCellCharge.js';
import {changeReviewMemory} from '../server/features/banco/BankReviewMemoryRepository.js';
env.loadEnvConfig(process.cwd());const pool=getPgPool(),db=await pool.connect(),apply=process.argv.includes('--apply');
try {
 await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='3s'");
 await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");await db.query("SELECT pg_advisory_xact_lock(hashtext('ingresos:conciliacion'))");
 const lines=(await db.query('SELECT * FROM tesoreria_movimientos_bancarios WHERE NOT duplicado_descartado ORDER BY id_linea_banco FOR UPDATE')).rows;
 const existing=await readInternalTransfers(db),handled=new Set(existing.flatMap(t=>[t.id_linea_cargo,t.id_linea_abono]).filter(Boolean)),transfers=[];
 for(const line of lines.filter(ownTransferConcept)) {
  if(handled.has(line.id_linea_banco))continue;
  const candidates=lines.filter(other=>!handled.has(other.id_linea_banco)&&matchingTransferLines(line,other));
  if(candidates.length>1)throw Error(`Contrapartida ambigua: ${line.id_linea_banco}`);
  const other=candidates[0];transfers.push({id:line.id_linea_banco,counterpartId:other?.id_linea_banco||null,allowUnpaired:!other,action:'review',reason:other?'Traspaso entre cuentas propias confirmado por el usuario y emparejado por banco, fecha e importe.':'Traspaso propio confirmado; falta la contrapartida en los extractos disponibles.',versions:Object.fromEntries([line,other].filter(Boolean).map(l=>[l.id_linea_banco,l.updated_at]))});
  [line,other].filter(Boolean).forEach(l=>handled.add(l.id_linea_banco));
 }
 const cash=lines.filter(l=>!l.estado_revision&&/reintegro.*atm/i.test(l.concepto));
 const mgs=lines.filter(l=>!l.estado_revision&&/MGS,? SEGUROS Y REASEGUROS/i.test(l.concepto));
 const fermi=lines.filter(l=>!l.estado_revision&&/ASSESSORIA GLOBAL CG/i.test(l.concepto));
 const ibi=lines.filter(l=>l.banco==='Sabadell'&&l.concepto==='IMPUESTOS AJUNTAMENT DE BARCELONA'&&['03/03/2026','03/06/2026','03/09/2026'].includes(l.fecha_operativa));
 for(const date of ['03/03/2026','03/06/2026','03/09/2026']){const group=ibi.filter(l=>l.fecha_operativa===date);if(group.length!==9||group.reduce((n,l)=>n+Math.round(-Number(l.importe)*100),0)!==15151)throw Error('IBI ha cambiado');}
 const lloret=lines.find(l=>l.id_linea_banco==='banc_sab_26_000.000.546');
 const book=(await db.query("SELECT * FROM tesoreria_prevision_juan WHERE id='juan-2026' FOR UPDATE")).rows[0];
 const charges=(await db.query("SELECT * FROM tesoreria_cargos_recurrentes WHERE id_cargo_recurrente IN ('43','45','57','58','59','60','61','62','63','64','65') FOR UPDATE")).rows;
 const association=(await db.query("SELECT * FROM tesoreria_prevision_juan_asociaciones WHERE workbook_id='juan-2026' AND bank='Sabadell' AND row_id='payments:30'")).rows[0];
 const plan={transfers,cash:cash.map(l=>l.id_linea_banco),mgs:mgs.map(l=>l.id_linea_banco),fermi:fermi.map(l=>l.id_linea_banco),ibi:ibi.filter(l=>!l.estado_revision).map(l=>l.id_linea_banco),lloret:lloret.estado_revision?[]:[lloret.id_linea_banco],barcelonaJuly:'Cinco cargos: pendientes de identificación; no se modifican',ibiBudget:{namedCharges:9,knownForecast:151.04,reserve:8.96,total:160}};
 const dir=path.join(process.env.USERPROFILE,'Downloads','p3erp-cierre-bancos-20261009');await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,apply?'confirmed-review-plan.json':'remaining-approved-review.json'),JSON.stringify(plan,null,2));
 const noChanges=!transfers.length&&!cash.length&&!mgs.length&&!fermi.length&&!plan.ibi.length&&!plan.lloret.length&&association?.evidence?.aggregate_charges&&Object.keys(book.sheets.find(s=>s.bank==='Sabadell').payments.find(r=>r.id==='payments:30').cellDetails||{}).length===3;
 if(!apply||noChanges){await db.query('ROLLBACK');console.log(JSON.stringify({...plan,...(apply?{applied:false,noChanges:true}:{})}));}
 else {
  await fs.writeFile(path.join(dir,`backup-bank-review-${Date.now()}.json`),JSON.stringify({lines,book,charges,existing},null,2),{flag:'wx'});
  await db.query(await fs.readFile('database/migrations/20261009_0001_internal_transfers.sql','utf8'));
  for(const transfer of transfers)await reviewInternalTransfer(db,transfer,'');
  if(cash.length)await saveReviewAction(db,{action:'force-review',items:cash.map(l=>({id:l.id_linea_banco,version:l.updated_at})),forcedComment:'Retirada de efectivo Reintegro, ATM: revisada por instrucción expresa del usuario el 09/10/2026.'},cash,'');
  for(const line of mgs){await reconcileBankIncome(db,line,{incomeType:'otro'},'');await db.query("UPDATE tesoreria_movimientos_bancarios SET comentarios=concat_ws(E'\n',NULLIF(comentarios,''),$2::text) WHERE id_linea_banco=$1",[line.id_linea_banco,'Cobro de seguro MGS confirmado por el usuario. Ingreso extraordinario: no genera previsión recurrente.']);}
  const provider=charges.find(c=>c.id_cargo_recurrente==='43').id_proveedor;
  for(const line of [...fermi,...ibi.filter(l=>!l.estado_revision)])await saveWorkflowExpense(db,{mode:'review'},line,{id:line.id_linea_banco,entityType:'proveedor',entityId:fermi.includes(line)?'prov_excel_assessoria_global_cg_sl':provider,commentsEdited:true,comments:[line.comentarios,fermi.includes(line)?'Fermí: antiguo proveedor contable. Revisado; no genera cargos futuros.':'IBI parking Barcelona: pago trimestral confirmado. Se conserva el cargo individual; plaza pendiente de referencia catastral.'].filter(Boolean).join('\n')},new Map());
  if(!lloret.estado_revision) {
   const charge=charges.find(c=>c.id_cargo_recurrente==='45');
   await saveWorkflowExpense(db,{mode:'review'},lloret,{entityType:'proveedor',entityId:charge.id_proveedor,chargeId:'45',expectedSchedule:charge.programacion,commentsEdited:true,comments:'IBI Lloret: cuarta cuota de 39,80 €, confirmada. Cargo de 05/10 aplicado a la previsión de octubre.'},new Map());
   const due=(await db.query("SELECT * FROM tesoreria_cargos_vencimientos WHERE id_cargo_recurrente='45' AND fecha BETWEEN '2026-10-01' AND '2026-10-31'")).rows;
   if(due.length!==1)throw Error('Vencimiento Lloret ambiguo');
   await changeReviewMemory({action:'apply',ids:[lloret.id_linea_banco],lineId:lloret.id_linea_banco,allocations:[{id:due[0].id,amount:39.8}]},'',db);
  }
  const sheet=book.sheets.find(s=>s.bank==='Sabadell'),row=sheet.payments.find(r=>r.id==='payments:30');
  row.cellDetails={...row.cellDetails};
  for(const [column,c] of sheet.columns.entries())if(c.kind==='actual'&&[3,6,9].includes(c.month))row.cellDetails[column]=ibi.filter(l=>Number(l.fecha_operativa.slice(3,5))===c.month).map(l=>({id:l.id_linea_banco,label:'IBI parking Barcelona · plaza sin identificar',date:l.fecha_operativa,detail:'Referencia de la plaza no incluida en el extracto de 2026',amount:Math.round(-Number(l.importe)*100),editable:false}));
  if(!association.evidence.aggregate_charges) {
   await db.query("UPDATE tesoreria_cargos_recurrentes SET activo=true WHERE id_cargo_recurrente='43'");
   await editJuanChargeMonth(db,'43',2026,12,896,'Sabadell',3);
   const reserve=charges.find(c=>c.id_cargo_recurrente==='43');reserve.programacion=reserve.programacion.map(r=>({...r,total_iva:8.96,base_imponible:8.96,descripcion:'IBI Barcelona · reserva del presupuesto Juan, pendiente de identificar'}));
   await db.query('UPDATE tesoreria_cargos_recurrentes SET programacion=$2::jsonb,updated_at=now() WHERE id_cargo_recurrente=$1',['43',JSON.stringify(reserve.programacion)]);
   await db.query("UPDATE tesoreria_cargos_vencimientos SET descripcion='IBI Barcelona · reserva de presupuesto pendiente de identificar' WHERE id_cargo_recurrente='43' AND fecha='2026-12-03'");
   await db.query("UPDATE tesoreria_prevision_juan_asociaciones SET status='group',charge_ids=$1::jsonb,evidence=evidence||$2::jsonb,updated_at=now() WHERE workbook_id='juan-2026' AND bank='Sabadell' AND row_id='payments:30'",[JSON.stringify(['43',...Array.from({length:9},(_,i)=>String(57+i))]),JSON.stringify({aggregate_charges:true,reason:'Nueve cargos trimestrales independientes, identificados por referencias históricas. Reserva de 8,96 € conserva presupuesto de Juan de 160 €. No se adjudican movimientos de 2026 a plazas sin referencia.'})]);
   await db.query("DELETE FROM tesoreria_prevision_juan_enlaces WHERE workbook_id='juan-2026' AND cell_key LIKE 'Sabadell:payments:30:%'");
   const ids=new Set(Array.from({length:9},(_,i)=>`payments:erp:${57+i}`));sheet.payments=sheet.payments.filter(r=>!ids.has(r.id));
   await db.query("DELETE FROM tesoreria_prevision_juan_asociaciones WHERE workbook_id='juan-2026' AND bank='Sabadell' AND row_id=ANY($1::text[])",[[...ids]]);
   await db.query("DELETE FROM tesoreria_prevision_juan_enlaces WHERE workbook_id='juan-2026' AND target_id=ANY($1::text[])",[Array.from({length:9},(_,i)=>String(57+i))]);
   const future=(await db.query("SELECT * FROM tesoreria_prevision_juan WHERE id<>'juan-2026' AND id>'juan-2026' FOR UPDATE")).rows;
   for(const next of future) {
    const bank=next.sheets.find(s=>s.bank==='Sabadell');if(!bank?.payments.some(r=>r.id===row.id))continue;
    bank.payments=bank.payments.filter(r=>!ids.has(r.id));
    await db.query("UPDATE tesoreria_prevision_juan_asociaciones SET status='group',charge_ids=$2::jsonb,evidence=evidence||$3::jsonb,updated_at=now() WHERE workbook_id=$1 AND bank='Sabadell' AND row_id='payments:30'",[next.id,JSON.stringify(Array.from({length:9},(_,i)=>String(57+i))),JSON.stringify({aggregate_charges:true,reason:'Nueve cargos trimestrales independientes de parking; importes históricos estimados, ajustables individualmente.'})]);
    await db.query("DELETE FROM tesoreria_prevision_juan_asociaciones WHERE workbook_id=$1 AND bank='Sabadell' AND row_id=ANY($2::text[])",[next.id,[...ids]]);
    await db.query("DELETE FROM tesoreria_prevision_juan_enlaces WHERE workbook_id=$1 AND (cell_key LIKE 'Sabadell:payments:30:%' OR target_id=ANY($2::text[]))",[next.id,Array.from({length:9},(_,i)=>String(57+i))]);
    await db.query('UPDATE tesoreria_prevision_juan SET sheets=$2::jsonb,version=version+1,updated_at=now() WHERE id=$1',[next.id,JSON.stringify(next.sheets)]);
   }
  }
  await db.query("UPDATE tesoreria_prevision_juan SET sheets=$1::jsonb,version=version+1,updated_at=now() WHERE id='juan-2026'",[JSON.stringify(book.sheets)]);
  await db.query('COMMIT');console.log(JSON.stringify({applied:true,...plan}));
 }
}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
