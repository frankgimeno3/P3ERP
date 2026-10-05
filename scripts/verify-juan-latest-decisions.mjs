import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {getJuanWorkbook,editJuanCell} from '../server/features/prevision/JuanRepository.js';
env.loadEnvConfig(process.cwd());const pool=getPgPool();
try {
 let book=await getJuanWorkbook(pool,2026);
 if(process.argv.includes('--accept-graditel')){
  const d=book.incomeDifferences.find(d=>d.bank==='Santander'&&d.month===12);
  if(d){if(d.required!==133100||d.budget!==0)throw Error('La previsión de Graditel ha cambiado.');const sheet=book.sheets.find(s=>s.bank==='Santander');book=await editJuanCell({year:2026,version:book.version,bank:'Santander',section:'income',rowId:d.rowId,column:sheet.columns.findIndex(c=>c.kind==='forecast'&&c.month===12),value:d.required},pool);}
 }
 console.log('RECENT_RECEIPTS',JSON.stringify((await pool.query("SELECT id_orden,fecha_teorica_cobro,cobro_total,banco_cobro FROM tesoreria_ordenes WHERE forma_cobro ~* '(recibo|remesa)' AND updated_at>now()-interval '20 minutes' ORDER BY p3_income_date(fecha_teorica_cobro)")).rows));
 console.log('INCOME_DIFFERENCES',JSON.stringify(book.incomeDifferences));
 console.log('REMAINING_VAT',JSON.stringify(book.charges.filter(c=>c.tipo_cargo!=='nomina').flatMap(c=>c.programacion.flatMap(r=>typeof r.contains_iva==='boolean'?[]:[{id:c.id_cargo_recurrente,provider:c.nombre_proveedor,total:r.total_iva}]))));
}finally{await pool.end();}
