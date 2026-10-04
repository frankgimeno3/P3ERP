import {getPgPool} from '../../database/pgClient.js';
import {plannedJuanCells,juanTotals} from './JuanExcel.js';
import {projectJuanLinkedForecast} from './JuanLinkedForecast.js';
import {juanYear} from './JuanAnnual.js';
import {projectJuanCardBudgets} from './JuanCardBudget.js';
import {editJuanChargeMonth} from './JuanCellCharge.js';
import {generateOccurrences} from '../banco/BankReviewAnalysis.js';
import {projectJuanIncomeBudgets,incomeRowMode} from './JuanIncomeBudget.js';
import {readLiquidityBudgets,writeLiquidityBudget} from './LiquidityForecastBudgets.js';
import {projectLiquidityApplications} from './LiquidityForecastApplications.js';

const fail=(message,status=400)=>{const error=Error(message);error.status=status;throw error;};

export async function getJuanWorkbook(pool=getPgPool(),year=2026) {
  year=juanYear(year);const ID=`juan-${year}`,from=`${year}-01-01`,until=`${year}-12-31`;
  const workbook=(await pool.query('SELECT id,source_name,sheets,version,updated_at FROM tesoreria_prevision_juan WHERE id=$1',[ID])).rows[0];
  if(!workbook)fail('Todavía no se ha importado el Excel de Juan.',404);
  const balances=(await pool.query(`SELECT DISTINCT ON(banco,extract(year FROM fecha),extract(month FROM fecha)) banco AS bank,
    extract(month FROM fecha)::int AS "month",saldo,to_char(fecha,'DD/MM/YYYY') AS date
    FROM (SELECT banco,saldo,COALESCE(p3_income_date(fecha_operativa),p3_income_date(fecha_valor)) fecha,id_linea_banco
      FROM tesoreria_movimientos_bancarios WHERE NOT COALESCE(duplicado_descartado,false)) m
    WHERE extract(year FROM fecha)=$1 AND saldo IS NOT NULL
    ORDER BY banco,extract(year FROM fecha),extract(month FROM fecha),fecha DESC,id_linea_banco DESC`,[year])).rows;
  const links=(await pool.query('SELECT * FROM tesoreria_prevision_juan_enlaces WHERE workbook_id=$1',[ID])).rows;
  const associations=(await pool.query(`SELECT a.*,p.nombre_proveedor AS provider_name,
    COALESCE(NULLIF(e.nombre_completo_agente,''),trim(concat_ws(' ',e.nombre_agente,e.apellidos_agente))) AS employee_name
    FROM tesoreria_prevision_juan_asociaciones a LEFT JOIN administracion_proveedores p ON p.id_proveedor=a.provider_id
    LEFT JOIN agentes_db e ON e.id_agente=a.employee_id WHERE workbook_id=$1`,[ID])).rows;
  const manualApplications=(await pool.query(`SELECT a.*,m.banco,m.importe bank_amount,m.concepto,m.estado_revision,m.duplicado_descartado,
    to_char(COALESCE(p3_income_date(m.fecha_operativa),p3_income_date(m.fecha_valor)),'DD/MM/YYYY') date
    FROM tesoreria_prevision_juan_aplicaciones a JOIN tesoreria_movimientos_bancarios m USING(id_linea_banco) WHERE a.workbook_id=$1`,[ID])).rows;
  const bankMovements=(await pool.query(`SELECT * FROM tesoreria_movimientos_bancarios WHERE COALESCE(p3_income_date(fecha_operativa),p3_income_date(fecha_valor)) BETWEEN $1::date AND $2::date`,[year===2026?'2026-10-01':from,until])).rows;
  const applications=projectLiquidityApplications(workbook.sheets,associations,bankMovements,manualApplications,year);
  await readLiquidityBudgets(pool,year,workbook.sheets);
  const orders=(await pool.query(`SELECT o.id_orden,o.etiqueta_cobro,o.cobro_total,o.banco_cobro,o.fecha_teorica_cobro,o.forma_cobro,o.datos_importacion,
    GREATEST(0,COALESCE(o.cobro_total,0)-COALESCE((SELECT sum(a.importe) FROM tesoreria_aplicaciones_cobro a JOIN tesoreria_movimientos_bancarios m USING(id_linea_banco) WHERE a.id_orden=o.id_orden AND m.estado_revision),0)) AS pending_amount
    FROM tesoreria_ordenes o WHERE NOT o.cancelada AND NOT COALESCE(o.cobrada,false) AND p3_income_date(o.fecha_teorica_cobro) BETWEEN $1::date AND $2::date`,[year===2026?'2026-10-01':from,until])).rows;
  const charges=(await pool.query(`SELECT cr.*,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('id',v.id,'fecha',to_char(v.fecha,'YYYY-MM-DD'),'importe',v.importe,'descripcion',v.descripcion) ORDER BY v.fecha)
      FROM tesoreria_cargos_vencimientos v WHERE v.id_cargo_recurrente=cr.id_cargo_recurrente AND v.fecha BETWEEN $1::date AND $2::date),'[]'::jsonb) AS vencimientos,
    p.nombre_proveedor,COALESCE(NULLIF(a.nombre_completo_agente,''),trim(concat_ws(' ',a.nombre_agente,a.apellidos_agente))) nombre_agente
    FROM tesoreria_cargos_recurrentes cr LEFT JOIN administracion_proveedores p USING(id_proveedor)
    LEFT JOIN agentes_db a ON a.id_agente=cr.id_agente WHERE cr.activo`,[year===2026?'2026-10-01':from,until])).rows;
  for(const charge of charges)if(charge.tipo_cargo==='nomina')charge.vencimientos=generateOccurrences([{...charge,tipo_cargo:'otro'}],year===2026?'2026-10-01':from,until).occurrences.map(d=>({...d,id:d.id}));
  const linkedDates=projectJuanLinkedForecast(workbook.sheets,links,charges);
  projectJuanCardBudgets(workbook.sheets,charges);
  const incomeDifferences=projectJuanIncomeBudgets(workbook.sheets,orders,applications);
  const planned=plannedJuanCells(workbook.sheets);
  // Keep applied cells accessible if an ERP change removes their forecast amount,
  // so the accountant can see the inconsistency and withdraw the application.
  for(const a of applications)if(!planned.some(c=>c.key===a.cell_key)) {
    const month=Number(a.cell_key.slice(a.cell_key.lastIndexOf(':')+1)),sheet=workbook.sheets.find(s=>s.bank===a.banco);
    if(!sheet)continue;
    const rowId=a.cell_key.slice(sheet.bank.length+1,a.cell_key.lastIndexOf(':')),section=rowId.startsWith('income:')?'income':'payments',row=sheet[section].find(r=>r.id===rowId);
    if(!row||!sheet.columns.some(c=>c.kind==='forecast'&&c.month===month))continue;
    const day=Math.min(row.day||31,new Date(Date.UTC(year,month,0)).getUTCDate());
    planned.push({key:a.cell_key,bank:sheet.bank,section,rowId,label:row.label,month,amount:0,date:`${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')}/${year}`,estimatedDate:!row.day});
  }
  return {...workbook,balances,links,associations,orders,charges,applications,bankMovements,incomeDifferences,totals:workbook.sheets.map(juanTotals),planned:planned.map(cell=>{
    const sheet=workbook.sheets.find(s=>s.bank===cell.bank),row=sheet[cell.section].find(r=>r.id===cell.rowId);
    const amount=sheet.closedMonths?.includes(cell.month)?row.closingBudget?.[cell.month]??cell.amount:cell.amount;
    const applied=applications.filter(a=>a.cell_key===cell.key && a.estado_revision && !a.duplicado_descartado).reduce((sum,a)=>sum+Math.round(Number(a.importe)*100),0);
    return {...cell,amount,date:linkedDates.get(cell.key)||cell.date,applied,pending:Math.max(0,amount-applied)};
  })};
}

export async function editJuanCell(body,pool=getPgPool()) {
  const year=juanYear(body.year||2026),ID=`juan-${year}`;
  const db=await pool.connect();
  try {
    await db.query('BEGIN');
    await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
    const workbook=(await db.query('SELECT * FROM tesoreria_prevision_juan WHERE id=$1 FOR UPDATE',[ID])).rows[0];
    if(!workbook)fail('Excel no encontrado',404);
    if(body.version!==workbook.version)fail('Otra persona ha cambiado esta hoja. Recarga antes de guardar.',409);
    const sheet=workbook.sheets.find(s=>s.bank===body.bank);
    if(!sheet)fail('Banco no válido');
    if(sheet.closedMonths?.includes(sheet.columns[body.column]?.month))fail('Mes cerrado. Reábrelo antes de editar.',409);
    if(!Number.isInteger(body.column)||body.column<0||body.column>=sheet.columns.length)fail('Columna no válida');
    if(body.value!==null&&(!Number.isSafeInteger(body.value)||Math.abs(body.value)>999999999999))fail('Importe no válido');
    if(body.section==='checks')sheet.checks[body.column]=body.value;
    else {
      if(!['income','payments'].includes(body.section))fail('Sección o importe no válido');
      const row=sheet[body.section].find(r=>r.id===body.rowId);
      if(!row)fail('Fila no encontrada');
      if(row.opening&&(sheet.columns[body.column].month!==1||sheet.columns[body.column].kind!=='actual'))fail('El saldo inicial se introduce una sola vez, en enero realizado.');
      if(!row.opening&&body.value<0)fail('El importe de un ingreso o gasto no puede ser negativo.');
      if(row.cardPart==='subscriptions'&&sheet.columns[body.column].kind==='forecast')fail('Las suscripciones se calculan desde los cargos asociados a las tarjetas del ERP. Configúralas allí y actualiza la hoja.',409);
      const key=`${sheet.bank}:${row.id}:${sheet.columns[body.column].month}`;
      const currentBook=await getJuanWorkbook({query:db.query.bind(db)},year);
      const applied={amount:currentBook.applications.filter(a=>a.cell_key===key&&a.estado_revision&&!a.duplicado_descartado).reduce((sum,a)=>sum+Number(a.importe),0)};
      if(sheet.columns[body.column].kind==='forecast'&&(body.value??0)<Math.round(Number(applied.amount)*100))fail('El importe previsto no puede ser inferior al importe aplicado. Retira primero las aplicaciones.',409);
      if(body.section==='income'&&sheet.columns[body.column].kind==='forecast'&&incomeRowMode(row.label)) {
       const current=await getJuanWorkbook({query:db.query.bind(db)},year),group=current.sheets.find(s=>s.bank===sheet.bank).income.find(r=>r.id===row.id);
       if((body.value??0)<(group.orderPending?.[sheet.columns[body.column].month]||0)+Math.round(Number(applied.amount)*100))fail('El grupo contiene órdenes pendientes por encima de ese importe. Corrige sus importes, fechas o estado en Control administrativo antes de reducir esta previsión.',409);
      }
      const link=(await db.query('SELECT * FROM tesoreria_prevision_juan_enlaces WHERE workbook_id=$1 AND cell_key=$2',[ID,key])).rows[0];
      let target=link&&['matched','integrated'].includes(link.status)?link.target_id:null;
      if(sheet.columns[body.column].kind==='forecast'&&!target) {
       const association=(await db.query('SELECT * FROM tesoreria_prevision_juan_asociaciones WHERE workbook_id=$1 AND bank=$2 AND row_id=$3',[ID,sheet.bank,row.id])).rows[0];
       if(['matched','integrated'].includes(association?.status)&&association.charge_ids?.length===1)target=association.charge_ids[0];
      }
      if(sheet.columns[body.column].kind==='forecast'&&target) {
       await editJuanChargeMonth(db,target,year,sheet.columns[body.column].month,body.value,sheet.bank,row.day);
       await db.query(`INSERT INTO tesoreria_prevision_juan_enlaces(workbook_id,cell_key,section,target_id,status,note) VALUES($1,$2,'payments',$3,'matched','Vencimiento editado desde Juan') ON CONFLICT(workbook_id,cell_key) DO UPDATE SET target_id=EXCLUDED.target_id,status=EXCLUDED.status,note=EXCLUDED.note`,[ID,key,target]);
      }
      row.values[body.column]=body.value;
      if(sheet.columns[body.column].kind==='forecast')await writeLiquidityBudget(db,{year,bank:sheet.bank,section:body.section,row,month:sheet.columns[body.column].month,value:body.value});
      if(row.opening)row.label=`SALDO 01-01-${year}${body.value===null?' · pendiente de cierre':''}`;
      if(row.cardPart==='variable')row.budgetIsEnvelope=false;
    }
    await db.query('UPDATE tesoreria_prevision_juan SET sheets=$2::jsonb,version=version+1,updated_at=now() WHERE id=$1',[ID,JSON.stringify(workbook.sheets)]);
    await db.query('COMMIT');
  }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
  return getJuanWorkbook(pool,year);
}

export async function applyJuanMovement(body,pool=getPgPool()) {
  const year=juanYear(body.year||2026),ID=`juan-${year}`;
  const db=await pool.connect();
  try {
    await db.query('BEGIN');
    await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
    const workbook=(await db.query('SELECT * FROM tesoreria_prevision_juan WHERE id=$1 FOR UPDATE',[ID])).rows[0];
    if(!workbook)fail('Excel no encontrado',404);
    const effective=await getJuanWorkbook({query:db.query.bind(db)},year);
    const cell=effective.planned.find(value=>value.key===body.cellKey);
    if(!cell)fail('Selecciona una previsión válida');
    if(workbook.sheets.find(s=>s.bank===cell.bank).closedMonths?.includes(cell.month))fail('Mes cerrado. Reábrelo antes de modificar sus aplicaciones.',409);
    const line=(await db.query(`SELECT *,to_char(COALESCE(p3_income_date(fecha_operativa),p3_income_date(fecha_valor)),'YYYY-MM-DD') date
      FROM tesoreria_movimientos_bancarios WHERE id_linea_banco=$1 FOR UPDATE`,[body.lineId])).rows[0];
    if(!line||line.banco!==cell.bank||line.duplicado_descartado)fail('Selecciona un movimiento válido del mismo banco');
    if(body.remove)await db.query('DELETE FROM tesoreria_prevision_juan_aplicaciones WHERE workbook_id=$1 AND cell_key=$2 AND id_linea_banco=$3',[ID,cell.key,body.lineId]);
    else {
      if(!line.estado_revision)fail('Revisa y confirma primero el movimiento en Conciliación.');
      if(!line.date||line.date<`${year}-${year===2026?'10':'01'}-01`||line.date>`${year}-12-31`)fail('El movimiento no pertenece al período previsto de este año.');
      if((Number(line.importe)>0)!==(cell.section==='income'))fail('El signo del movimiento no coincide con la previsión');
      if(!Number.isSafeInteger(body.amount)||body.amount<=0)fail('Indica un importe positivo en céntimos');
      const others=(await db.query(`SELECT COALESCE(sum(importe) FILTER(WHERE cell_key=$2),0) cell,
        COALESCE(sum(importe) FILTER(WHERE id_linea_banco=$3),0) line
        FROM tesoreria_prevision_juan_aplicaciones WHERE workbook_id=$1 AND NOT(cell_key=$2 AND id_linea_banco=$3)`,[ID,cell.key,body.lineId])).rows[0];
      if(body.amount+Math.round(Number(others.cell)*100)>cell.amount)fail('El importe supera lo pendiente de la previsión');
      if(body.amount+Math.round(Number(others.line)*100)>Math.round(Math.abs(Number(line.importe))*100))fail('El importe supera el movimiento bancario disponible');
      await db.query(`INSERT INTO tesoreria_prevision_juan_aplicaciones(workbook_id,cell_key,id_linea_banco,importe) VALUES($1,$2,$3,$4)
        ON CONFLICT(workbook_id,cell_key,id_linea_banco) DO UPDATE SET importe=EXCLUDED.importe`,[ID,cell.key,body.lineId,body.amount/100]);
    }
    await db.query('UPDATE tesoreria_prevision_juan SET version=version+1,updated_at=now() WHERE id=$1',[ID]);
    await db.query('COMMIT');
  }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
  return getJuanWorkbook(pool,year);
}

export async function getJuanLiquidity(date,pool=getPgPool()) {
  const {parseImportDate}=await import('./ReceiptExcel.js');
  const until=parseImportDate(date);
  if(!until)fail('Indica una fecha válida.');
  const year=juanYear(until.slice(6));
  const workbook=await getJuanWorkbook(pool,year);
  const month=Number(until.slice(3,5));
  const unassigned=workbook.orders.filter(o=>!['Sabadell','Santander'].includes(o.banco_cobro));
  const unresolved=workbook.associations.filter(a=>!['matched','integrated','group','historical','opening'].includes(a.status)&&workbook.planned.some(c=>c.bank===a.bank&&c.rowId===a.row_id));
  return {source:'Previsión de liquidez',date:until,...Object.fromEntries(workbook.sheets.map(sheet=> {
    // Both presentations use these monthly totals and the same canonical links.
    const totals=juanTotals(sheet);
    const index=sheet.columns.findLastIndex(c=>c.month===month);
    return [sheet.bank,totals.balances[index]/100];
  })),avisos:[...(unresolved.length?[`${unresolved.length} conceptos previstos tienen proveedor, contrato o asociación pendiente de revisar. Sus importes permanecen en la previsión.`]:[]),...(workbook.incomeDifferences.length?[`${workbook.incomeDifferences.length} grupos mensuales de ingresos tienen órdenes por encima del presupuesto original. Se incluyen esas órdenes una sola vez; revisa el presupuesto y las fechas de las órdenes.`]:[]),...(unassigned.length?[`${unassigned.length} órdenes pendientes no tienen banco asignado (${unassigned.reduce((n,o)=>n+Number(o.pending_amount),0).toLocaleString('es-ES',{style:'currency',currency:'EUR'})}). No se reparten automáticamente entre Sabadell y Santander.`]:[]),...(workbook.sheets.some(s=>s.income.some(r=>r.opening&&r.values.every(v=>v===null)))?['Saldo inicial pendiente: los acumulados de este año muestran una variación provisional, no un saldo bancario final.']:[])]};
}
