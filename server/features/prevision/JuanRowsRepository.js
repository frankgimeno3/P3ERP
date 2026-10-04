import {randomUUID} from 'node:crypto';
import {getPgPool} from '../../database/pgClient.js';
import {juanYear} from './JuanAnnual.js';
import {getJuanWorkbook} from './JuanRepository.js';
import {insertRecurringCharge,RecurringChargeError} from './RecurringChargeRepository.js';
import {findSupplier} from '../proveedor/SupplierAdminRepository.js';
import {generateOccurrences,dateISO} from '../banco/BankReviewAnalysis.js';
import {editJuanChargeMonth} from './JuanCellCharge.js';
import {forecastVat} from '../../../app/lib/forecastVat.js';
import {incomeRowMode} from './JuanIncomeBudget.js';
import {seedLiquidityBudgets,writeLiquidityBudget} from './LiquidityForecastBudgets.js';

export async function saveJuanRow(body,pool=getPgPool()) {
 const year=juanYear(body.year),id=`juan-${year}`,db=await pool.connect();
 try {
  await db.query('BEGIN');await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
  const book=(await db.query('SELECT * FROM tesoreria_prevision_juan WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!book)throw new RecurringChargeError('Hoja no encontrada.',404);
  if(body.version!==book.version)throw new RecurringChargeError('La hoja ha cambiado. Recarga antes de guardar.',409);
  const sheet=book.sheets.find(s=>s.bank===body.bank);
  if(!sheet||!['payments','income'].includes(body.section))throw new RecurringChargeError('Sección o banco no válido.');
  if(body.action==='remove-row') {
   const row=sheet[body.section].find(r=>r.id===body.rowId);
   if(!row||row.opening||row.cardPart)throw new RecurringChargeError('Esta fila no admite retirar sus previsiones desde aquí.');
   const effective=(await getJuanWorkbook({query:db.query.bind(db)},year)).sheets.find(s=>s.bank===sheet.bank)[body.section].find(r=>r.id===row.id);
   if(body.section==='income'&&incomeRowMode(row.label)&&Object.values(effective.orderPending||{}).some(v=>v>0))throw new RecurringChargeError('Esta fila contiene órdenes activas. Corrige o cancela las órdenes correspondientes en Control administrativo antes de retirar su previsión.',409);
   for(const [index,column] of sheet.columns.entries())if(column.kind==='forecast'&&!sheet.closedMonths?.includes(column.month)) {
    const key=`${sheet.bank}:${row.id}:${column.month}`;
    if((await db.query('SELECT 1 FROM tesoreria_prevision_juan_aplicaciones WHERE workbook_id=$1 AND cell_key=$2 LIMIT 1',[id,key])).rowCount)throw new RecurringChargeError('Hay movimientos bancarios asociados. Retira o corrige esas asociaciones antes de quitar la previsión.',409);
    const link=(await db.query('SELECT * FROM tesoreria_prevision_juan_enlaces WHERE workbook_id=$1 AND cell_key=$2',[id,key])).rows[0];
    if(link?.target_id&&['matched','integrated'].includes(link.status)&&effective.values[index])await editJuanChargeMonth(db,link.target_id,year,column.month,0,sheet.bank);
    row.values[index]=null;
    await writeLiquidityBudget(db,{year,bank:sheet.bank,section:body.section,row,month:column.month,value:null});
   }
  } else {
   const newRule=body.existingChargeId?null:body.tipo_cargo==='nomina'?{...body.rule,base_imponible:0,contains_iva:false,tipo_iva:0}:{...body.rule,...forecastVat(body.rule?.total_iva,body.rule?.contains_iva,body.rule?.tipo_iva)};
   const label=String(body.label||'').trim();
   if(!label||label.length>300)throw new RecurringChargeError('Indica un concepto de hasta 300 caracteres.');
   if(sheet[body.section].some(r=>r.id!==body.rowId&&r.label.trim().toLocaleLowerCase('es')===label.toLocaleLowerCase('es')))throw new RecurringChargeError('Ya hay una fila con ese concepto. Abre su desglose para evitar duplicarla.',409);
   const previous=body.rowId?sheet[body.section].find(r=>r.id===body.rowId):null;
   if(body.rowId&&(!previous||body.section!=='payments'||previous.opening||previous.cardPart||/^(?:VISAS?\b|TARJETAS?\b|TRASPASOS?\b)|\bEFECTIVO\b/i.test(previous.label)))throw new RecurringChargeError('Esta fila no admite vincular un cargo individual.');
   if(previous&&(await db.query('SELECT 1 FROM tesoreria_prevision_juan_asociaciones WHERE workbook_id=$1 AND bank=$2 AND row_id=$3 AND jsonb_array_length(charge_ids)>0',[id,sheet.bank,previous.id])).rowCount)throw new RecurringChargeError('La fila ya tiene cargos asociados. Edítalos en la hoja; no se crea otro cargo.',409);
   const row=previous||{id:`${body.section}:user:${randomUUID()}`,label,day:null,opening:false,values:sheet.columns.map(()=>null)};
   row.label=label;
   let charge=null,provider=null,occurrences=[];
   if(body.section==='payments') {
    if(body.existingChargeId) {
     charge=(await db.query('SELECT * FROM tesoreria_cargos_recurrentes WHERE id_cargo_recurrente=$1 AND activo FOR UPDATE',[body.existingChargeId])).rows[0];
     if(!charge||charge.banco_pago!==sheet.bank)throw new RecurringChargeError('Selecciona un cargo activo del mismo banco.');
    }else {
     if(body.tipo_cargo!=='nomina')provider=await findSupplier(body.providerId,db);
     const possible=(await db.query(`SELECT id_cargo_recurrente FROM tesoreria_cargos_recurrentes WHERE activo AND banco_pago=$1 AND (id_proveedor=$2 OR id_agente=$3) AND EXISTS(SELECT 1 FROM jsonb_array_elements(programacion) r WHERE lower(btrim(r->>'descripcion'))=lower($4))`,[sheet.bank,provider?.id_proveedor||null,body.employeeId||null,label])).rows;
     if(possible.length)throw new RecurringChargeError('Ya existe un cargo de ese destinatario y concepto. Usa «Vincular cargo existente».',409);
     charge=await insertRecurringCharge(db,{tipo_cargo:body.tipo_cargo==='nomina'?'nomina':'proveedor',id_proveedor:provider?.id_proveedor||null,id_agente:body.tipo_cargo==='nomina'?body.employeeId:null,banco_pago:sheet.bank,tipo_programacion:'periodicidad',termina_planificacion:false,programacion:[{...newRule,descripcion:label}]});
    }
    if((await db.query('SELECT 1 FROM tesoreria_prevision_juan_asociaciones WHERE workbook_id=$1 AND bank=$2 AND charge_ids @> $3::jsonb LIMIT 1',[id,sheet.bank,JSON.stringify([String(charge.id_cargo_recurrente)])])).rowCount)throw new RecurringChargeError('Este cargo ya está asociado a una fila de Juan. Abre esa fila; no se añade dos veces.',409);
    occurrences=generateOccurrences([{...charge,tipo_cargo:'otro'}],`${year}-01-01`,`${year}-12-31`).occurrences;
    if(charge.tipo_cargo!=='nomina') {
     const stored=(await db.query("SELECT to_char(fecha,'YYYY-MM-DD') fecha,importe FROM tesoreria_cargos_vencimientos WHERE id_cargo_recurrente=$1 AND extract(year FROM fecha)=$2",[charge.id_cargo_recurrente,year])).rows;
     if(stored.length)occurrences=stored;
    }
    row.day=Number(charge.programacion[0]?.inicio_dia)||null;
   }else {
    const rule=newRule||{},start=dateISO(`${String(rule.inicio_dia).padStart(2,'0')}/${String(rule.inicio_mes).padStart(2,'0')}/${rule.inicio_anio}`);
    if(!start||!Number.isInteger(Number(rule.cada))||Number(rule.cada)<1||Number(rule.cada)>120||rule.unidad!=='meses'||!Number.isFinite(Number(rule.total_iva))||Number(rule.total_iva)<=0||Number(rule.total_iva)>9999999999.99)throw new RecurringChargeError('Revisa fecha, periodicidad e importe del ingreso.');
    row.recurring=rule;row.day=Number(rule.inicio_dia);
    occurrences=generateOccurrences([{id_cargo_recurrente:row.id,tipo_cargo:'otro',tipo_programacion:'periodicidad',programacion:[rule]}],`${year}-01-01`,`${year}-12-31`).occurrences;
   }
   let count=0;
   for(const [index,column] of sheet.columns.entries())if(column.kind==='forecast'&&!sheet.closedMonths?.includes(column.month)) {
    const dues=occurrences.filter(d=>Number(d.fecha.slice(5,7))===column.month);
    const amount=dues.reduce((n,d)=>n+Math.round(Number(d.importe)*100),0),key=`${sheet.bank}:${row.id}:${column.month}`;
    const applied=(await db.query('SELECT COALESCE(sum(importe),0) amount FROM tesoreria_prevision_juan_aplicaciones WHERE workbook_id=$1 AND cell_key=$2',[id,key])).rows[0];
    if(Math.round(Number(applied.amount)*100)>amount)throw new RecurringChargeError('La nueva programación queda por debajo de movimientos ya aplicados a la fila. Revísalos antes de vincular el cargo.',409);
    row.values[index]=amount||null;if(dues.length)count++;
    if(charge)await db.query(`INSERT INTO tesoreria_prevision_juan_enlaces(workbook_id,cell_key,section,target_id,status,note) VALUES($1,$2,'payments',$3,'matched','Creado o vinculado desde la vista Juan') ON CONFLICT(workbook_id,cell_key) DO UPDATE SET target_id=EXCLUDED.target_id,status=EXCLUDED.status,note=EXCLUDED.note`,[id,key,String(charge.id_cargo_recurrente)]);
   }
   if(!count)throw new RecurringChargeError('La programación no tiene vencimientos en los meses previstos y abiertos de esta pestaña.');
   if(!previous)sheet[body.section].push(row);
   await db.query(`INSERT INTO tesoreria_prevision_juan_asociaciones(workbook_id,bank,row_id,status,provider_id,employee_id,charge_ids,evidence) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb) ON CONFLICT(workbook_id,bank,row_id) DO UPDATE SET status=EXCLUDED.status,provider_id=EXCLUDED.provider_id,employee_id=EXCLUDED.employee_id,charge_ids=EXCLUDED.charge_ids,evidence=EXCLUDED.evidence,updated_at=now()`,[id,sheet.bank,row.id,charge?'matched':'group',charge?.id_proveedor||null,charge?.id_agente||null,JSON.stringify(charge?[String(charge.id_cargo_recurrente)]:[]),JSON.stringify({reason:charge?'Cargo recurrente compartido con el ERP.':'Presupuesto recurrente de ingresos; las órdenes siguen siendo la fuente del cobro administrativo.',conflicts:[],candidates:[]})]);
   const later=(await db.query('SELECT * FROM tesoreria_prevision_juan WHERE id>$1 ORDER BY id FOR UPDATE',[id])).rows;
   for(const future of later) {
    const nextSheet=future.sheets.find(s=>s.bank===sheet.bank);
    if(!nextSheet||nextSheet[body.section].some(r=>r.id!==row.id&&r.label.trim().toLocaleLowerCase('es')===label.toLocaleLowerCase('es')))continue;
    if(charge&&(await db.query('SELECT 1 FROM tesoreria_prevision_juan_asociaciones WHERE workbook_id=$1 AND bank=$2 AND charge_ids @> $3::jsonb LIMIT 1',[future.id,sheet.bank,JSON.stringify([String(charge.id_cargo_recurrente)])])).rowCount)continue;
    const priorRow=nextSheet[body.section].find(r=>r.id===row.id);
    if(priorRow&&(await db.query('SELECT 1 FROM tesoreria_prevision_juan_asociaciones WHERE workbook_id=$1 AND bank=$2 AND row_id=$3 AND jsonb_array_length(charge_ids)>0',[future.id,sheet.bank,row.id])).rowCount)continue;
    const nextRow=priorRow||{...structuredClone(row),values:nextSheet.columns.map(()=>null)};
    const nextDues=generateOccurrences([charge?{...charge,tipo_cargo:'otro'}:{id_cargo_recurrente:row.id,tipo_cargo:'otro',tipo_programacion:'periodicidad',programacion:[row.recurring]}],`${nextSheet.year}-01-01`,`${nextSheet.year}-12-31`).occurrences;
    if(!nextDues.length)continue;
    for(const [index,column] of nextSheet.columns.entries())if(column.kind==='forecast'&&!nextSheet.closedMonths?.includes(column.month)) {
     const dues=nextDues.filter(d=>Number(d.fecha.slice(5,7))===column.month);
     const amount=dues.reduce((n,d)=>n+Math.round(Number(d.importe)*100),0),key=`${sheet.bank}:${row.id}:${column.month}`;
     const applied=(await db.query('SELECT COALESCE(sum(importe),0) amount FROM tesoreria_prevision_juan_aplicaciones WHERE workbook_id=$1 AND cell_key=$2',[future.id,key])).rows[0];
     if(Math.round(Number(applied.amount)*100)>amount)throw new RecurringChargeError('La fila del año siguiente tiene movimientos aplicados que no encajan con esta programación.',409);
     nextRow.values[index]=amount||null;
     if(charge)await db.query(`INSERT INTO tesoreria_prevision_juan_enlaces(workbook_id,cell_key,section,target_id,status,note) VALUES($1,$2,'payments',$3,'matched','Cargo recurrente añadido desde Juan') ON CONFLICT(workbook_id,cell_key) DO UPDATE SET target_id=EXCLUDED.target_id,status=EXCLUDED.status,note=EXCLUDED.note`,[future.id,key,String(charge.id_cargo_recurrente)]);
    }
    if(!priorRow)nextSheet[body.section].push(nextRow);
    await db.query(`INSERT INTO tesoreria_prevision_juan_asociaciones(workbook_id,bank,row_id,status,provider_id,employee_id,charge_ids,evidence) SELECT $1,bank,row_id,status,provider_id,employee_id,charge_ids,evidence FROM tesoreria_prevision_juan_asociaciones WHERE workbook_id=$2 AND bank=$3 AND row_id=$4 ON CONFLICT(workbook_id,bank,row_id) DO UPDATE SET status=EXCLUDED.status,provider_id=EXCLUDED.provider_id,employee_id=EXCLUDED.employee_id,charge_ids=EXCLUDED.charge_ids,evidence=EXCLUDED.evidence,updated_at=now()`,[future.id,id,sheet.bank,row.id]);
    await seedLiquidityBudgets(db,Number(nextSheet.year),future.sheets);
    await db.query('UPDATE tesoreria_prevision_juan SET sheets=$2::jsonb,version=version+1,updated_at=now() WHERE id=$1',[future.id,JSON.stringify(future.sheets)]);
   }
  }
  await seedLiquidityBudgets(db,year,book.sheets);
  const edited=sheet[body.section].find(r=>r.id===body.rowId);
  if(edited&&body.action!=='remove-row')for(const [index,column] of sheet.columns.entries())if(column.kind==='forecast'&&!sheet.closedMonths?.includes(column.month))await writeLiquidityBudget(db,{year,bank:sheet.bank,section:body.section,row:edited,month:column.month,value:edited.values[index]});
  await db.query('UPDATE tesoreria_prevision_juan SET sheets=$2::jsonb,version=version+1,updated_at=now() WHERE id=$1',[id,JSON.stringify(book.sheets)]);
  await db.query('COMMIT');
 }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
 return getJuanWorkbook(pool,year);
}
