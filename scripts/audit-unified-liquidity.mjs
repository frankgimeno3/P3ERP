import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {getJuanWorkbook} from '../server/features/prevision/JuanRepository.js';
env.loadEnvConfig(process.cwd());const pool=getPgPool();
try {
 const book=await getJuanWorkbook(pool,2026),orders=book.orders.filter(o=>!['Sabadell','Santander'].includes(o.banco_cobro)),represented=new Set(book.associations.flatMap(a=>a.charge_ids));
 const unmatched=book.sheets.flatMap(s=>s.payments.flatMap(r=>{const a=book.associations.find(a=>a.bank===s.bank&&a.row_id===r.id);const cells=book.planned.filter(c=>c.bank===s.bank&&c.rowId===r.id);return cells.length&&a&&!['matched','integrated','group'].includes(a.status)?[{bank:s.bank,label:r.label,provider:a.provider_name,status:a.status,amount:cells.reduce((n,c)=>n+c.amount,0)/100}]:[];}));
 const fiscal=book.charges.filter(c=>c.tipo_cargo!=='nomina').flatMap(c=>c.programacion.flatMap(r=>typeof r.contains_iva==='boolean'?[]:[{id:c.id_cargo_recurrente,provider:c.nombre_proveedor,description:r.descripcion,total:Number(r.total_iva),base:Number(r.base_imponible),invalid:Number(r.base_imponible)>Number(r.total_iva)}]));
 const payments=(await pool.query(`SELECT count(*)::int count,COALESCE(sum(GREATEST(0,p.total_pago-COALESCE((SELECT sum(abs(m.importe)) FROM tesoreria_movimientos_bancarios m WHERE m.id_pago=p.id_pago AND m.importe<0),0))),0) amount FROM tesoreria_pagos_previstos p WHERE p3_income_date(fecha_pago) BETWEEN '2026-10-01' AND '2026-12-31' AND total_pago>0`)).rows[0];
 const cards=(await pool.query('SELECT count(*)::int count FROM tesoreria_cargos_recurrentes WHERE activo AND id_tarjeta IS NOT NULL')).rows[0];
 console.log(JSON.stringify({unmatched,ordersWithoutBank:{count:orders.length,amount:Math.round(orders.reduce((n,o)=>n+Number(o.pending_amount),0)*100)/100},incomeDifferences:book.incomeDifferences.map(d=>({...d,budget:d.budget/100,orders:d.orders/100,required:d.required/100})),chargesOutsideRows:book.charges.filter(c=>!represented.has(String(c.id_cargo_recurrente))).map(c=>({id:c.id_cargo_recurrente,bank:c.banco_pago,provider:c.nombre_proveedor,rules:c.programacion.map(r=>({description:r.descripcion,total:r.total_iva,base:r.base_imponible}))})),fiscalPendingCount:fiscal.length,invalidFiscal:fiscal.filter(r=>r.invalid),legacyPayments:payments,cardSubscriptions:cards.count},null,2));
}finally{await pool.end();}
