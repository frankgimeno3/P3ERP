import {incomeCents,lockIncome,syncOrderCollections} from './IncomeReconciliation.js';
import {orderActivity} from '../comentario/AccountActivity.js';

// Operational document backfill. The caller owns the transaction and supplies
// individually verified allocations; bank cash and invoice amounts remain intact.
export async function reconcileDocumentedIncome(db,lineId,{allocations,reason,account=null,remesa=null}){
 if(!reason?.trim()||!Array.isArray(allocations)||!allocations.length||new Set(allocations.map(a=>a.orderId)).size!==allocations.length)throw Error('Documented allocations and reason are required');
 await lockIncome(db);
 const line=(await db.query('SELECT * FROM tesoreria_movimientos_bancarios WHERE id_linea_banco=$1 FOR UPDATE',[lineId])).rows[0];
 if(!line||line.estado_revision||line.duplicado_descartado||Number(line.importe)<=0)throw Error('Movement is not available');
 if(allocations.some(a=>!Number.isFinite(a.amount)||incomeCents(a.amount)<=0)||allocations.reduce((n,a)=>n+incomeCents(a.amount),0)!==incomeCents(line.importe))throw Error('Allocations must equal actual bank cash');
 if((await db.query('SELECT 1 FROM tesoreria_aplicaciones_cobro WHERE id_linea_banco=$1',[lineId])).rowCount)throw Error('Movement already has allocations');
 const orders=(await db.query(`SELECT o.*,COALESCE(NULLIF(o.id_cuenta,''),c.id_cuenta_contrato,f.id_cuenta) owner FROM tesoreria_ordenes o LEFT JOIN comercial_contratos c USING(id_contrato) LEFT JOIN administracion_facturas_clientes f ON f.id_factura_cliente=o.id_factura WHERE o.id_orden=ANY($1::text[]) ORDER BY o.id_orden FOR UPDATE OF o`,[allocations.map(a=>a.orderId)])).rows;
 if(orders.length!==allocations.length||orders.some(o=>o.cancelada||o.datos_importacion?.cierre_cobro?.activo||account&&o.owner!==account||o.cobro_revision_bancaria&&o.cobrada))throw Error('Orders no longer match the documented receipt');
 for(const a of allocations){
  const o=orders.find(o=>o.id_orden===a.orderId);
  if((await db.query('SELECT 1 FROM tesoreria_aplicaciones_cobro WHERE id_orden=$1',[o.id_orden])).rowCount)throw Error('Order already has a bank application');
  await db.query('INSERT INTO tesoreria_aplicaciones_cobro(id_linea_banco,id_orden,id_remesa,importe) VALUES($1,$2,$3,$4)',[lineId,o.id_orden,remesa,a.amount]);
  await db.query(`UPDATE tesoreria_ordenes SET datos_importacion=COALESCE(datos_importacion,'{}'::jsonb)||jsonb_build_object('conciliacion_documentada',$2::jsonb),updated_at=now() WHERE id_orden=$1`,[o.id_orden,JSON.stringify({linea:lineId,motivo:reason,previsto:Number(o.cobro_total),real:a.amount,fecha:'2026-10-09'})]);
  await orderActivity(db,o.id_orden,'',reason);
 }
 await db.query(`UPDATE tesoreria_movimientos_bancarios SET tipo_ingreso=$2,id_cuenta=$3,id_orden=$4,estado_revision=true,comentarios=concat_ws(E'\n',NULLIF(comentarios,''),$5::text),updated_at=now() WHERE id_linea_banco=$1`,[lineId,remesa?'remesa':'transferencia',remesa?null:account,allocations.length===1&&!remesa?allocations[0].orderId:null,reason]);
 await syncOrderCollections(db,orders.map(o=>o.id_orden));
 return orders.map(o=>({order:o.id_orden,expected:Number(o.cobro_total),actual:allocations.find(a=>a.orderId===o.id_orden).amount}));
}
