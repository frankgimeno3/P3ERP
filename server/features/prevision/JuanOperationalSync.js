import {getPgPool} from '../../database/pgClient.js';
import {generateOccurrences} from '../banco/BankReviewAnalysis.js';
import {juanYear} from './JuanAnnual.js';
import {incomeMode,incomeRowMode} from './JuanIncomeBudget.js';
import {extendCharge,todayInSpain,horizon} from './RecurringChargePlanning.js';
import {seedLiquidityBudgets} from './LiquidityForecastBudgets.js';

// A canonical ERP charge gets one presentation row per bank/year, never another charge.
export async function syncJuanOperationalRows(year,pool=getPgPool()) {
 year=juanYear(year);const id=`juan-${year}`,db=await pool.connect();
 try {
  await db.query('BEGIN');await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
  const book=(await db.query('SELECT * FROM tesoreria_prevision_juan WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!book){await db.query('COMMIT');return;}
  const associations=(await db.query('SELECT * FROM tesoreria_prevision_juan_asociaciones WHERE workbook_id=$1',[id])).rows;
  const charges=(await db.query(`SELECT c.*,p.nombre_proveedor,COALESCE(NULLIF(a.nombre_completo_agente,''),trim(concat_ws(' ',a.nombre_agente,a.apellidos_agente))) nombre_agente FROM tesoreria_cargos_recurrentes c LEFT JOIN administracion_proveedores p USING(id_proveedor) LEFT JOIN agentes_db a ON a.id_agente=c.id_agente WHERE c.activo AND c.id_tarjeta IS NULL AND c.banco_pago IN ('Sabadell','Santander') ORDER BY c.id_cargo_recurrente`)).rows;
  let changed=false;
  const orders=(await db.query(`SELECT banco_cobro,forma_cobro FROM tesoreria_ordenes WHERE NOT cancelada AND NOT COALESCE(cobrada,false) AND p3_income_date(fecha_teorica_cobro) BETWEEN $1::date AND $2::date`,[`${year}-${year===2026?'10':'01'}-01`,`${year}-12-31`])).rows;
  for(const sheet of book.sheets)for(const mode of new Set(orders.filter(o=>o.banco_cobro===sheet.bank).map(o=>incomeMode(o.forma_cobro)))) {
   if(sheet.income.some(r=>incomeRowMode(r.label)===mode))continue;
   const row={id:`income:erp:${mode}`,label:mode==='receipt'?'REMESAS RECIBOS PREVISTAS DE COBRO':mode==='transfer'?'TRANSFERENCIAS PREVISTAS DE COBRO':'OTROS INGRESOS PREVISTAS DE COBRO',day:null,opening:false,values:sheet.columns.map(()=>null)};
   sheet.income.push(row);changed=true;
   await db.query(`INSERT INTO tesoreria_prevision_juan_asociaciones(workbook_id,bank,row_id,status,charge_ids,evidence) VALUES($1,$2,$3,'group','[]'::jsonb,$4::jsonb) ON CONFLICT(workbook_id,bank,row_id) DO NOTHING`,[id,sheet.bank,row.id,JSON.stringify({reason:'Órdenes pendientes del Control administrativo. El grupo suma sus detalles una sola vez.',conflicts:[],candidates:[]})]);
  }
  for(const charge of charges) {
   if(charge.tipo_cargo!=='nomina'&&!charge.termina_planificacion&&(!charge.planificado_hasta||new Date(charge.planificado_hasta).toISOString().slice(0,10)<`${year}-12-31`))await extendCharge(db,charge,todayInSpain(),false,horizon(todayInSpain()));
   const sheet=book.sheets.find(s=>s.bank===charge.banco_pago);
   if(!sheet||associations.some(a=>a.bank===sheet.bank&&a.charge_ids?.includes(String(charge.id_cargo_recurrente))))continue;
   let dues=generateOccurrences([{...charge,tipo_cargo:'otro'}],`${year}-01-01`,`${year}-12-31`).occurrences;
   if(charge.tipo_cargo!=='nomina')dues=(await db.query("SELECT to_char(fecha,'YYYY-MM-DD') fecha,importe FROM tesoreria_cargos_vencimientos WHERE id_cargo_recurrente=$1 AND extract(year FROM fecha)=$2",[charge.id_cargo_recurrente,year])).rows;
   if(!dues.some(d=>sheet.columns.some(c=>c.kind==='forecast'&&c.month===Number(d.fecha.slice(5,7))&&!sheet.closedMonths?.includes(c.month))))continue;
   const row={id:`payments:erp:${charge.id_cargo_recurrente}`,label:charge.programacion[0]?.descripcion||charge.nombre_proveedor||charge.nombre_agente||'Cargo previsto',day:Number(charge.programacion[0]?.inicio_dia||charge.programacion[0]?.dia)||null,opening:false,values:sheet.columns.map(c=>c.kind==='forecast'&&!sheet.closedMonths?.includes(c.month)?dues.filter(d=>Number(d.fecha.slice(5,7))===c.month).reduce((n,d)=>n+Math.round(Number(d.importe)*100),0)||null:null)};
   if(sheet.payments.some(r=>r.id===row.id))continue;
   sheet.payments.push(row);changed=true;
   await db.query(`INSERT INTO tesoreria_prevision_juan_asociaciones(workbook_id,bank,row_id,status,provider_id,employee_id,charge_ids,evidence) VALUES($1,$2,$3,'matched',$4,$5,$6::jsonb,$7::jsonb)`,[id,sheet.bank,row.id,charge.id_proveedor||null,charge.id_agente||null,JSON.stringify([String(charge.id_cargo_recurrente)]),JSON.stringify({reason:'Cargo del ERP incorporado a la previsión compartida. Es el mismo cargo en ambas vistas.',conflicts:[],candidates:[]})]);
   for(const column of sheet.columns.filter(c=>c.kind==='forecast'&&!sheet.closedMonths?.includes(c.month)))await db.query(`INSERT INTO tesoreria_prevision_juan_enlaces(workbook_id,cell_key,section,target_id,status,note) VALUES($1,$2,'payments',$3,'matched','Previsión compartida con el ERP') ON CONFLICT(workbook_id,cell_key) DO NOTHING`,[id,`${sheet.bank}:${row.id}:${column.month}`,String(charge.id_cargo_recurrente)]);
  }
  if(changed){await seedLiquidityBudgets(db,year,book.sheets);await db.query('UPDATE tesoreria_prevision_juan SET sheets=$2::jsonb,version=version+1,updated_at=now() WHERE id=$1',[id,JSON.stringify(book.sheets)]);}
  await db.query('COMMIT');
 }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
