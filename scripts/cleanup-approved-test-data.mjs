// The exact legacy test and invoice duplicate approved by Frank on 13/10/2026.
// Dry run by default. Export the locked rows locally before an atomic deletion.
import env from '@next/env';import fs from 'node:fs/promises';import {randomUUID} from 'node:crypto';
import {getPgPool} from '../server/database/pgClient.js';
import {withUserEventContext} from '../server/features/userEvents/EventContext.js';
import {mergeInvoicePlaceholder} from '../server/features/factura/InvoiceDuplicateOrders.js';
env.loadEnvConfig(process.cwd());
const apply=process.argv.includes('--apply'),pool=getPgPool(),db=await pool.connect();
const proposalId='prop_8926ced3-0c9f-4efc-b617-68512a3c6f9a',contractId='C26.000.165';
const backup={};const read=async(table,where,args=[])=>{const rows=(await db.query(`SELECT * FROM ${table} WHERE ${where}`,args)).rows;backup[table]=rows;return rows;};
try{
 await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='30s'");
 const proposal=(await read('comercial_propuestas_db','id_propuesta=$1 FOR UPDATE',[proposalId]))[0];
 if(proposal&&(proposal.id_cuenta_propuesta!=='ACC1707'||proposal.nombre_propuesta!=='prueba - renovación'||new Date(proposal.created_at).toISOString().slice(0,10)!=='2026-10-13'))throw Error('La propuesta no coincide con la prueba autorizada.');
 const contracts=await read('comercial_contratos','id_propuesta=$1 FOR UPDATE',[proposalId]);
 if(contracts.some(c=>c.id_contrato!==contractId))throw Error('Han cambiado los contratos de la prueba.');
 const orders=await read('tesoreria_ordenes','id_contrato=$1 FOR UPDATE',[contractId]),orderIds=orders.map(o=>o.id_orden);
 if(orders.some(o=>o.cobrada))throw Error('La prueba tiene cobros realizados: no se borrará automáticamente.');
 for(const table of ['tesoreria_aplicaciones_cobro','tesoreria_movimientos_bancarios'])if((await read(table,'id_orden=ANY($1::text[])',[orderIds])).length)throw Error('Hay movimientos bancarios asociados a la prueba.');
 const invoices=await read('administracion_facturas_clientes','id_contrato=$1 OR id_orden_origen=ANY($2::text[]) OR id_factura_cliente=ANY($3::text[]) FOR UPDATE',[contractId,orderIds,orders.map(o=>o.id_factura).filter(Boolean)]);
 if(invoices.some(f=>f.ya_contabilizada||!['en proceso','borrador'].includes(f.estado)||f.verifactu_estado_envio==='factura emitida'))throw Error('La factura de prueba ya no es un borrador.');
 const invoiceIds=invoices.map(f=>f.id_factura_cliente);
 if((await db.query('SELECT 1 FROM tesoreria_ordenes WHERE id_factura=ANY($1::text[]) AND COALESCE(id_contrato,\'\')<>$2 LIMIT 1',[invoiceIds,contractId])).rowCount)throw Error('Una factura está compartida con otra orden.');
 const contents=await read('produccion_contenidos','id_contrato=$1',[contractId]),contentIds=contents.map(c=>c.id_contenido);
 await read('contenidos_revistas_db','contenido_id=ANY($1::text[])',[contentIds]);
 await read('administracion_lineas_factura','id_factura_cliente=ANY($1::text[])',[invoiceIds]);
 await read('comercial_contratos_lineas','id_contrato=$1',[contractId]);await read('comercial_contratos_cobros','id_contrato=$1',[contractId]);
 await read('comercial_propuestas_lineas','id_propuesta=$1',[proposalId]);await read('comercial_propuestas_cobros','id_propuesta=$1',[proposalId]);
 const receipts=await read('tesoreria_recibos_importados','id_orden=ANY($1::text[])',[orderIds]);if(receipts.some(r=>r.id_remesa))throw Error('Hay recibos de la prueba en una remesa.');
 const tokens=[proposalId,contractId,...orderIds,...contentIds,...invoiceIds];
 const where="(id_entidad=ANY($1::text[]) OR tipo_entidad='cuenta' AND id_entidad='ACC1707' AND (EXISTS(SELECT 1 FROM unnest($1::text[]) token WHERE position(token IN FIELD)>0) OR FIELD LIKE '%prueba - renovación%' AND created_at::date=DATE '2026-10-13' AND FIELD LIKE 'Propuesta %'))";
 await read('general_comentarios',where.replaceAll('FIELD','contenido_comentario'),[tokens]);await read('general_eventos',where.replaceAll('FIELD','detalles'),[tokens]);
 delete backup.tesoreria_aplicaciones_cobro;delete backup.tesoreria_movimientos_bancarios;
 // Preserve all reviewed automatic comments before moving them to account history.
 const automatic=(await db.query("SELECT c.* FROM general_comentarios c WHERE tipo_entidad='cuenta' AND id_comentario LIKE 'com_%' AND (contenido_comentario ~* '^El usuario sistema ' OR contenido_comentario ~ '^Propuesta (creada|finalizada|actualizada) por .* Identificador: ' OR EXISTS(SELECT 1 FROM general_eventos e WHERE e.tipo_entidad='cuenta' AND e.id_entidad=c.id_entidad AND e.detalles=c.contenido_comentario AND e.created_at=c.created_at AND e.id_agente=c.id_original_autor)) ORDER BY c.created_at")).rows.filter(c=>!backup.general_comentarios.some(t=>t.id_comentario===c.id_comentario));
 backup.automatic_comments=automatic;
 backup.invoice_526163_orders=(await db.query("SELECT * FROM tesoreria_ordenes WHERE id_factura='526163' ORDER BY id_orden FOR UPDATE")).rows;
 backup.invoice_526163=(await db.query("SELECT * FROM administracion_facturas_clientes WHERE id_factura_cliente='526163'")).rows;
 const normalizedEvents=(await db.query("SELECT * FROM general_eventos WHERE detalles ~* 'el usuario sistema' OR id_agente='' AND lower(event_type) IN ('acción automatizada','cambio automático')")).rows;backup.normalized_events=normalizedEvents;
 console.log(JSON.stringify({apply,testGraph:Object.fromEntries(Object.entries(backup).filter(([k])=>!k.startsWith('automatic')&&!k.startsWith('normalized')).map(([k,v])=>[k,v.length])),automaticComments:automatic.length,automaticAccounts:new Set(automatic.map(c=>c.id_entidad)).size,historyLabels:normalizedEvents.length}));
 if(!apply){await db.query('ROLLBACK');}
 else{
  const actor=(await db.query("SELECT id_agente,nombre_completo_agente FROM agentes_db WHERE lower(email_agente)='frankgimeno3@gmail.com' OR cognito_emails ? 'frankgimeno3@gmail.com'")).rows[0];if(!actor)throw Error('No se ha identificado a Frank.');
  const file=`C:/Users/frank/Downloads/p3erp-cleanup-20261013-${Date.now()}.json`;await fs.writeFile(file,JSON.stringify(backup,null,2));
  await withUserEventContext({actorId:actor.id_agente,actorName:actor.nombre_completo_agente,role:'superadmin',requestId:randomUUID(),enabled:true,method:'DELETE',route:'/mantenimiento/limpieza-pruebas-20261013',ip:null,ipSource:'mantenimiento'},async()=>{
   const remove=async(table,key,ids)=>{if(ids.length)await db.query(`DELETE FROM ${table} WHERE ${key}=ANY($1::text[])`,[ids]);};
   await remove('general_comentarios','id_comentario',backup.general_comentarios.map(r=>r.id_comentario));await remove('general_eventos','id',backup.general_eventos.map(r=>r.id));
   await remove('contenidos_revistas_db','contenido_id',contentIds);await remove('produccion_contenidos','id_contenido',contentIds);
   await remove('tesoreria_recibos_importados','id_orden',orderIds);
   await db.query('UPDATE tesoreria_ordenes SET id_factura=NULL WHERE id_orden=ANY($1::text[])',[orderIds]);
   await db.query('UPDATE comercial_contratos SET id_factura=NULL WHERE id_contrato=$1',[contractId]);
   await remove('administracion_lineas_factura','id_factura_cliente',invoiceIds);await remove('administracion_facturas_clientes','id_factura_cliente',invoiceIds);
   await remove('tesoreria_ordenes','id_orden',orderIds);await remove('comercial_contratos_cobros','id_contrato',[contractId]);await remove('comercial_contratos_lineas','id_contrato',[contractId]);await remove('comercial_contratos','id_contrato',[contractId]);
   await remove('comercial_propuestas_cobros','id_propuesta',[proposalId]);await remove('comercial_propuestas_lineas','id_propuesta',[proposalId]);await remove('comercial_propuestas_db','id_propuesta',[proposalId]);
   for(const c of automatic){const detail=c.contenido_comentario.replace(/el usuario sistema/gi,'ACCIÓN AUTOMÁTIZADA');
    if(!(await db.query("SELECT 1 FROM general_eventos e JOIN general_comentarios c ON c.id_comentario=$1 WHERE e.tipo_entidad='cuenta' AND e.id_entidad=c.id_entidad AND e.detalles IN(c.contenido_comentario,$2) AND e.created_at=c.created_at LIMIT 1",[c.id_comentario,detail])).rowCount)await db.query("INSERT INTO general_eventos(id,event_type,id_agente,tipo_entidad,id_entidad,detalles,created_at) SELECT $1,$2,id_original_autor,'cuenta',id_entidad,$3,created_at FROM general_comentarios WHERE id_comentario=$4",['evt_comment_'+c.id_comentario,c.id_original_autor?'Actividad de propuesta':'ACCIÓN AUTOMÁTIZADA',detail,c.id_comentario]);
    await db.query('DELETE FROM general_comentarios WHERE id_comentario=$1',[c.id_comentario]);
   }
   await db.query("UPDATE general_eventos SET detalles=regexp_replace(detalles,'el usuario sistema','ACCIÓN AUTOMÁTIZADA','gi'),event_type=CASE WHEN id_agente='' THEN 'ACCIÓN AUTOMÁTIZADA' ELSE event_type END WHERE detalles ~* 'el usuario sistema' OR id_agente='' AND lower(event_type) IN ('acción automatizada','cambio automático')");
   const merged=await mergeInvoicePlaceholder(db,'526163',['C26.000.151-1/1'],actor.id_agente);if(backup.invoice_526163_orders.some(o=>o.id_orden==='ord_fac_reg_4dabad9cb4bbba8d2067d20f')&&!merged.length)throw Error('El duplicado tiene nuevas asociaciones; se revierte toda la limpieza.');
  });await db.query('COMMIT');console.log('Backup: '+file+'; limpieza confirmada.');
 }
}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();await pool.end();}
