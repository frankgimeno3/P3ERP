// Explicitly authorized demo cleanup; never cascade or remove linked contents.
import fs from 'node:fs/promises';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
env.loadEnvConfig(process.cwd());
const quote=s=>'"'+s.replaceAll('"','""')+'"';
const apply=process.argv.includes('--apply');
const folder='C:/Users/frank/Downloads/p3erp-identificadores-20261009';
const candidates=[...Array.from({length:5},(_,i)=>({entity:'proveedor',table:'administracion_proveedores',key:'id_proveedor',id:'prov_demo_'+String(i+1).padStart(3,'0')})),...Array.from({length:7},(_,i)=>({entity:'contenido',table:'produccion_contenidos',key:'id_contenido',id:'content_25_'+String(i+6).padStart(5,'0')}))];
const pool=getPgPool(),db=await pool.connect();
const nativeQuery=db.query.bind(db);
db.query=(text,values)=>nativeQuery({text,values,query_timeout:30000});
db.on('error',()=>{});
try{
 await db.query('BEGIN');
 await db.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s'");
 const tables=(await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name")).rows.map(t=>t.table_name);
 await db.query(`LOCK TABLE ${tables.map(quote).join(',')} IN SHARE ROW EXCLUSIVE MODE`);
 const countsBefore={};for(const table of tables)countsBefore[table]=(await db.query(`SELECT count(*)::int n FROM ${quote(table)}`)).rows[0].n;
 const plan=[];
 for(const c of candidates){
  const row=(await db.query(`SELECT * FROM ${quote(c.table)} WHERE ${quote(c.key)}=$1`,[c.id])).rows[0];
  if(!row){plan.push({...c,status:'absent'});continue;}
  const links=[];
  if(c.entity==='contenido'){
   // Publication and agent identify catalogue placement/responsibility; protect
   // every commercial association, source detail and actual attached material.
   for(const field of ['id_contrato','id_linea_contrato','contenido_especifico_id','codigo_crm_hoja','cliente_hoja','factura_hoja'])if(row[field])links.push({field,value:row[field]});
   if(row.array_ids_materiales?.length)links.push({field:'array_ids_materiales',value:row.array_ids_materiales});
  }
  plan.push({...c,row,links,status:'unchecked'});
 }
 const present=plan.filter(c=>c.row);
 for(const table of tables){
  const fields=present.map((c,i)=>`count(*) FILTER (WHERE strpos(to_jsonb(t)::text,$${i+1})>0${table===c.table?` AND ${quote(c.key)}<>$${i+1}`:''})::int AS n${i}`);
  if(!fields.length)break;
  const counts=(await db.query(`SELECT ${fields.join(',')} FROM ${quote(table)} t`,present.map(c=>c.id))).rows[0];
  present.forEach((c,i)=>{if(counts['n'+i])c.links.push({table,records:counts['n'+i]});});
 }
 for(const c of present)c.status=c.links.length?'preserved-linked':'delete';
 const report={checkedAt:new Date().toISOString(),applied:apply,plan};
 await fs.mkdir(folder,{recursive:true});
 if(!apply){await fs.writeFile(folder+'/demo-removal-plan.json',JSON.stringify(report,null,2));await db.query('ROLLBACK');}
 else{
  if(plan.some(c=>c.entity==='proveedor'&&c.status==='preserved-linked'))throw Error('Un proveedor demo tiene referencias: no se borra ni se hace borrado en cascada.');
  const backup=folder+'/before-demo-removal-'+Date.now()+'.json';
  await fs.writeFile(backup,JSON.stringify(report,null,2),{flag:'wx'});
  for(const c of plan.filter(c=>c.status==='delete')){
   const deleted=await db.query(`DELETE FROM ${quote(c.table)} WHERE ${quote(c.key)}=$1 RETURNING ${quote(c.key)}`,[c.id]);
   if(deleted.rowCount!==1)throw Error('No se ha borrado exactamente un registro: '+c.id);
  }
  for(const table of tables){
   const expected=countsBefore[table]-plan.filter(c=>c.table===table&&c.status==='delete').length;
   if((await db.query(`SELECT count(*)::int n FROM ${quote(table)}`)).rows[0].n!==expected)throw Error('Cambio inesperado de registros en '+table);
  }
  await db.query('COMMIT');
  await fs.writeFile(folder+'/demo-removal-result.json',JSON.stringify({...report,backup},null,2));
 }
 console.log(JSON.stringify({applied:apply,records:plan.map(({entity,id,status,links})=>({entity,id,status,links}))}));
}catch(error){try{await db.query('ROLLBACK');}catch{}throw error;}finally{db.release(true);await pool.end();}
