import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {saveBankWorkflow} from '../server/features/banco/BankReviewWorkflow.js';
env.loadEnvConfig(process.cwd());
const folder=path.join(process.env.USERPROFILE,'Downloads/updates/revision-gastos-20261004');
const plan=JSON.parse(fs.readFileSync(path.join(folder,'payroll-plan.json'),'utf8'));
const pool=getPgPool(),connect=pool.connect.bind(pool),audit=[];
const cents=v=>Math.round(Number(v)*100);
try {
for(const g of plan.plans.filter(g=>g.decisions.some(d=>!d.alreadyComplete))){
 const db=await connect();
 try {
  await db.query('BEGIN');
  await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
  pool.connect=async()=>({release(){},query:(sql,args)=>['BEGIN','COMMIT','ROLLBACK'].includes(sql)?Promise.resolve({rows:[],rowCount:0}):db.query(sql,args)});
  const charge=(await db.query('SELECT * FROM tesoreria_cargos_recurrentes WHERE id_cargo_recurrente=$1 FOR UPDATE',[g.charge])).rows[0];
  for(const d of g.decisions){const m=(await db.query('SELECT * FROM tesoreria_movimientos_bancarios WHERE id_linea_banco=$1 FOR UPDATE',[d.id])).rows[0];if(new Date(m.updated_at).getTime()!==new Date(d.version).getTime()||cents(Math.abs(m.importe))!==cents(d.amount))throw Error('Movement changed '+d.id);}
  let record=(await db.query('SELECT * FROM laboral_nominas WHERE id_empleado=$1 AND anio=$2 AND mes=$3 FOR UPDATE',[g.employee,g.year,g.month])).rows[0];
  if(!record)record=(await db.query('INSERT INTO laboral_nominas(id,id_empleado,anio,mes,importe_neto) VALUES($1,$2,$3,$4,$5) RETURNING *',[randomUUID(),g.employee,g.year,g.month,g.expected])).rows[0];
  if(cents(record.importe_neto)!==cents(g.expected))throw Error('Monthly payroll changed');
  for(const d of g.decisions.filter(d=>!d.alreadyComplete)){
   if(d.reviewed)await saveBankWorkflow({action:'unreview',ids:[d.id]});
   const m=(await db.query('SELECT * FROM tesoreria_movimientos_bancarios WHERE id_linea_banco=$1',[d.id])).rows[0];
   const paid=(await db.query("SELECT COALESCE(sum(importe_neto),0) AS amount FROM laboral_anticipos WHERE id_empleado=$1 AND anio=$2 AND mes=$3 AND estado='pagado' AND id_transferencia IS DISTINCT FROM $4",[g.employee,g.year,g.month,d.id])).rows[0].amount;
   await saveBankWorkflow({mode:'review',ids:[d.id],items:[{id:d.id,version:m.updated_at,entityType:'nomina',entityId:g.employee,chargeId:charge.id_cargo_recurrente,expectedSchedule:charge.programacion,ruleIndex:0,year:g.year,month:g.month,payrollId:record.id,payrollKind:d.kind,expectedPayroll:g.expected,expectedAdvances:Number(paid),adjustment:d.kind==='anticipo'?d.amount:0,increase:false}]});
  }
  const check=(await db.query("SELECT n.*,m.importe AS final_amount,(SELECT COALESCE(sum(a.importe_neto),0) FROM laboral_anticipos a WHERE a.id_empleado=n.id_empleado AND a.anio=n.anio AND a.mes=n.mes AND a.estado='pagado') AS advance_amount FROM laboral_nominas n JOIN tesoreria_movimientos_bancarios m ON m.id_linea_banco=n.id_transferencia WHERE n.id=$1",[record.id])).rows[0];
  if(!check||check.estado!=='pagado'||cents(check.importe_neto)!==cents(Math.abs(check.final_amount))+cents(check.advance_amount))throw Error('Monthly total failed');
  pool.connect=connect;await db.query('COMMIT');
  audit.push({employee:g.name,month:g.month,net:g.expected,proof:g.proof,ids:g.decisions.filter(d=>!d.alreadyComplete).map(d=>d.id),advance:Number(check.advance_amount),status:'applied'});
 }catch(e){pool.connect=connect;await db.query('ROLLBACK');audit.push({employee:g.name,month:g.month,status:'held',error:e.message});}
 finally{pool.connect=connect;db.release();fs.writeFileSync(path.join(folder,'applied-payroll.json'),JSON.stringify(audit,null,2));}
}
console.log(JSON.stringify(audit));
}finally{pool.connect=connect;await pool.end();}
