import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {getJuanWorkbook} from '../server/features/prevision/JuanRepository.js';
env.loadEnvConfig(process.cwd());const p=getPgPool();
try {
 const b=await getJuanWorkbook(p);
 console.log('PENDING',JSON.stringify(b.sheets.flatMap(s=>['income','payments'].flatMap(section=>s[section].flatMap(row=>{
  const cells=b.planned.filter(c=>c.bank===s.bank&&c.rowId===row.id);if(!cells.length)return [];
  const a=b.associations.find(a=>a.bank===s.bank&&a.row_id===row.id);
  return ['matched','integrated'].includes(a?.status)?[]:[{bank:s.bank,label:row.label,status:a?.status,provider:a?.provider_name,employee:a?.employee_name,amounts:cells.map(c=>({month:c.month,amount:c.amount/100})),reason:a?.evidence?.reason}];
 })))));
 console.log('BALANCES',JSON.stringify(b.sheets.map((s,i)=>({bank:s.bank,juanSeptember:b.totals[i].balances[8]/100,latestSeptember:b.balances.find(v=>v.bank===s.bank&&v.month===9),december:b.totals[i].balances.at(-1)/100}))));
 const linked=new Set(b.associations.filter(a=>['matched','integrated'].includes(a.status)).flatMap(a=>a.charge_ids));
 console.log('UNLINKED_CHARGES',JSON.stringify(b.charges.filter(c=>!linked.has(String(c.id_cargo_recurrente))).map(c=>({id:c.id_cargo_recurrente,bank:c.banco_pago,provider:c.nombre_proveedor,employee:c.nombre_agente,rules:c.programacion,dues:c.vencimientos}))));
 console.log('ORDERS',JSON.stringify(b.orders.reduce((r,o)=>{const key=`${o.banco_cobro||'Sin banco'}:${o.forma_cobro||'Sin forma'}`;r[key]=(r[key]||0)+Number(o.pending_amount);return r;},{})));
 console.log('COUNTS',JSON.stringify({planned:b.planned.length,linked:b.planned.filter(c=>b.links.some(l=>l.cell_key===c.key&&l.target_id)).length,applied:b.applications.length}));
}finally{await p.end();}
