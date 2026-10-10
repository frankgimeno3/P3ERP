import env from '@next/env';
import fs from 'node:fs/promises';
import path from 'node:path';
import {getPgPool} from '../server/database/pgClient.js';
import {saveWorkflowExpense} from '../server/features/banco/BankWorkflowExpense.js';
env.loadEnvConfig(process.cwd());const pool=getPgPool(),db=await pool.connect(),apply=process.argv.includes('--apply');
try {
 await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='3s'");await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
 const lines=(await db.query("SELECT * FROM tesoreria_movimientos_bancarios WHERE banco='Sabadell' AND fecha_operativa='03/07/2026' AND concepto='IMPUESTOS AJUNTAMENT DE BARCELONA' ORDER BY id_linea_banco FOR UPDATE")).rows;
 if(lines.length!==5||lines.reduce((n,l)=>n+Math.round(-Number(l.importe)*100),0)!==40642||lines.some(l=>l.duplicado_descartado))throw Error('El grupo aprobado ha cambiado');
 const book=(await db.query("SELECT * FROM tesoreria_prevision_juan WHERE id='juan-2026' FOR UPDATE")).rows[0],sheet=book.sheets.find(s=>s.bank==='Sabadell'),row=sheet.payments.find(r=>r.id==='payments:31'),column=sheet.columns.findIndex(c=>c.month===7&&c.kind==='actual');
 if(row.label!=='AJ.BCN-ICIRC + TASA BASURA'||row.values[column]!==40642)throw Error('La evidencia de Juan ha cambiado');
 const provider=(await db.query("SELECT id_proveedor FROM administracion_proveedores WHERE nombre_proveedor ILIKE 'Ajuntament de Barcelona'")).rows;if(provider.length!==1)throw Error('Proveedor ambiguo');
 const id=provider[0].id_proveedor,pending=lines.filter(l=>!l.estado_revision);
 if(lines.some(l=>l.id_proveedor&&l.id_proveedor!==id||l.id_pago||l.id_cargo_recurrente||l.id_cuenta||l.id_agente))throw Error('Una línea ya tiene otra asociación');
 const plan={ids:pending.map(l=>l.id_linea_banco),amount:406.42,group:row.label,detailPending:true,keepAll:true};
 const directory=path.join(process.env.USERPROFILE,'Downloads','p3erp-cierre-bancos-20261009');await fs.mkdir(directory,{recursive:true});
 if(!apply||(!pending.length&&row.cellDetails?.[column]?.length===5)){await db.query('ROLLBACK');console.log(JSON.stringify({applied:false,...plan}));}
 else {
  await fs.writeFile(path.join(directory,`before-barcelona-july-${Date.now()}.json`),JSON.stringify({lines,book},null,2),{flag:'wx'});
  for(const line of pending)await saveWorkflowExpense(db,{mode:'review'},line,{entityType:'proveedor',entityId:id,commentsEdited:true,comments:[line.comentarios,'Usuario confirma revisión 09/10/2026: grupo AJ.BCN-ICIRC + TASA BASURA de Juan, julio 406,42 €. Se conservan los cinco cargos, incluidos ambos de 68,16 €. Tributo y vehículo/inmueble de cada recibo pendientes de detalle; no genera recurrencia.'].filter(Boolean).join('\n')},new Map());
  row.cellDetails={...row.cellDetails,[column]:lines.map(l=>({id:l.id_linea_banco,label:'Barcelona · circulación o tasa de basura',date:l.fecha_operativa,amount:Math.round(-Number(l.importe)*100),editable:false,detail:'Grupo confirmado con Juan; tributo y vehículo/inmueble del recibo pendientes de identificar'}))};
  await db.query("UPDATE tesoreria_prevision_juan SET sheets=$1::jsonb,version=version+1,updated_at=now() WHERE id='juan-2026'",[JSON.stringify(book.sheets)]);
  await db.query('COMMIT');await fs.writeFile(path.join(directory,'barcelona-july-result.json'),JSON.stringify(plan,null,2));console.log(JSON.stringify({applied:true,...plan}));
 }
}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
