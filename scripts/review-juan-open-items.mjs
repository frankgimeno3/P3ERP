import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {getJuanWorkbook,editJuanCell} from '../server/features/prevision/JuanRepository.js';
import {deleteRecurringCharge} from '../server/features/prevision/RecurringChargeRepository.js';
env.loadEnvConfig(process.cwd());const pool=getPgPool();
try {
 if(process.argv.includes('--apply-confirmed')) {
  const charge=(await pool.query('SELECT * FROM tesoreria_cargos_recurrentes WHERE id_cargo_recurrente=1')).rows[0];
  if(charge){if(!charge.programacion.every(r=>/Gasto inventado brillas/i.test(r.descripcion||'')))throw Error('El cargo 1 ha cambiado: revisar antes de eliminar.');console.log('DELETED_VERISURE',JSON.stringify(await deleteRecurringCharge(1,{confirm:true,version:charge.updated_at})));}
  const book=await getJuanWorkbook(pool,2026),diff=book.incomeDifferences.find(d=>d.bank==='Sabadell'&&d.month===12);
  if(diff){if(diff.budget!==71665||diff.required!==71668)throw Error('La diferencia Sabadell ha cambiado.');const sheet=book.sheets.find(s=>s.bank==='Sabadell');await editJuanCell({year:2026,version:book.version,bank:'Sabadell',section:'income',rowId:diff.rowId,column:sheet.columns.findIndex(c=>c.kind==='forecast'&&c.month===12),value:diff.required},pool);console.log('SABADELL_ACCEPTED',716.68);}
 }
 const book=await getJuanWorkbook(pool,2026);
 const fiscal=book.charges.filter(c=>c.tipo_cargo!=='nomina').flatMap(c=>c.programacion.flatMap((r,index)=>typeof r.contains_iva==='boolean'?[]:[{charge:c.id_cargo_recurrente,rule:index+1,bank:c.banco_pago,provider:c.nombre_proveedor,description:r.descripcion,total:r.total_iva,base:r.base_imponible,day:r.inicio_dia||r.dia,frequency:r.cada,unit:r.unidad}]));
 if(process.argv.includes('--fiscal'))console.log('FISCAL_RULES',JSON.stringify(fiscal));
 const compact=o=>({id:o.id_orden,client:o.datos_importacion?.cliente,date:o.fecha_teorica_cobro,amount:o.pending_amount,method:o.forma_cobro,invoice:o.datos_importacion?.original?.FACTURA});
 console.log('ORDERS_UNASSIGNED',JSON.stringify(book.orders.filter(o=>!['Sabadell','Santander'].includes(o.banco_cobro)).map(compact)));
 console.log('SANTANDER_DECEMBER',JSON.stringify(book.orders.filter(o=>o.banco_cobro==='Santander'&&(/\/12\//.test(o.fecha_teorica_cobro)||/-12-/.test(o.fecha_teorica_cobro))).map(compact)));
 console.log('PROVIDER_CANDIDATES',JSON.stringify((await pool.query("SELECT id_proveedor,nombre_proveedor,nombre_fiscal_proveedor FROM administracion_proveedores WHERE concat_ws(' ',nombre_proveedor,nombre_fiscal_proveedor) ~* 'serra|tradis|endesa|mini|allianz|zurich|mapfre|axa|generali|reale|mutua|fincas|comunidad|cosva' ORDER BY nombre_proveedor")).rows));
 console.log('BANK_EVIDENCE',JSON.stringify((await pool.query("SELECT banco,fecha_operativa,concepto,importe,id_proveedor,id_cargo_recurrente FROM tesoreria_movimientos_bancarios WHERE NOT COALESCE(duplicado_descartado,false) AND (concepto ~* 'serra|tradis|endesa|countryman|mini|allianz|zurich|mapfre|axa|generali|reale|mutua' OR round(abs(importe),2) IN (89.02,442.74,600,75,300)) ORDER BY p3_income_date(fecha_operativa) DESC LIMIT 90")).rows));
 console.log('UNMATCHED',JSON.stringify(book.associations.filter(a=>a.evidence?.future?.length&&!['matched','integrated','group'].includes(a.status))));
}finally{await pool.end();}
