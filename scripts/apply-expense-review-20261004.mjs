import fs from 'node:fs';import path from 'node:path';import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';import {saveBankWorkflow} from '../server/features/banco/BankReviewWorkflow.js';
env.loadEnvConfig(process.cwd());const folder=path.join(process.env.USERPROFILE,'Downloads/updates/revision-gastos-20261004'),plan=JSON.parse(fs.readFileSync(path.join(folder,'expense-plan.json'),'utf8')),pool=getPgPool(),audit=[];
try{for(const p of plan.plans){try{
 const m=(await pool.query('SELECT * FROM tesoreria_movimientos_bancarios WHERE id_linea_banco=$1',[p.id])).rows[0];
 if(new Date(m.updated_at).getTime()!==new Date(p.version).getTime())throw Error('Movement changed');
 const c=(await pool.query('SELECT * FROM tesoreria_cargos_recurrentes WHERE id_cargo_recurrente=$1',[p.charge])).rows[0];
 await saveBankWorkflow({mode:p.reviewed?'assign':'review',ids:[p.id],items:[{id:p.id,version:m.updated_at,entityType:'proveedor',entityId:p.provider,chargeId:p.charge,expectedSchedule:c.programacion,increase:false,commentsEdited:!p.reviewed,comments:[m.comentarios,`Revisión 04/10/2026: ${p.proof}. Asociado al concepto recurrente; no se aplica a vencimientos de otro mes.`].filter(Boolean).join('\n')}]});
 audit.push({...p,status:'applied'});
 }catch(e){audit.push({...p,status:'held',error:e.message});}
 fs.writeFileSync(path.join(folder,'applied-expenses.json'),JSON.stringify(audit,null,2));
}console.log(JSON.stringify({applied:audit.filter(a=>a.status==='applied').length,failed:audit.filter(a=>a.status==='held'),newlyReviewed:audit.filter(a=>a.status==='applied'&&!a.reviewed).length,corrected:audit.filter(a=>a.status==='applied'&&a.reviewed).length}));}finally{await pool.end();}
