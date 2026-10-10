import fs from 'node:fs/promises';
import path from 'node:path';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {allocateAccountIdentifier} from '../server/features/identifiers/BusinessIdentifiers.js';
import {prepareVtigerComments} from '../server/features/comentario/VtigerCommentImport.js';
env.loadEnvConfig(process.cwd());
const file=process.argv.find(a=>a.toLowerCase().endsWith('.csv'));
if(!file)throw Error('Indica el archivo CSV. --apply confirma la importación.');
const pool=getPgPool(),db=await pool.connect(),apply=process.argv.includes('--apply');
const directory=path.join(process.env.USERPROFILE,'Downloads','p3erp-comentarios-20261009');
try {
  await db.query('BEGIN');await db.query("SELECT pg_advisory_xact_lock(hashtext('comentarios:vtiger'))");
  const accounts=(await db.query("SELECT id_cuenta,nombre_empresa,datos_comerciales->'importacion_csv'->'datos_originales'->>'Nombre de Cuenta' original_name FROM comercial_cuentas")).rows;
  const agents=(await db.query('SELECT id_agente,email_agente FROM agentes_db')).rows;
  const aliases={
    'SAMER SYSTEMS - DIMENSION TECNICA 2012,S.L.':'ACC1944',
    'VELUX SPAIN,S.A. (Relacionada)':'ACC2592',
    'ORGADATA AG (relacionada)':'ACC2657',
    'MASTER SPA. (No es master italy o SRL)':'ACC2660',
    'PORTA XXI,LDA. - PORTALUXE INTERNACIONAL (GARDENGATE)':'ACC3691',
    'CONTINENTAL alemania - KONRAD HORNSCHUCH (llevan Latam)- SKAI':'ACC6359',
    'LUDWIG PUBLIC RELATIONS (agencia de Swisspacer)':'ACC6467',
    'DROP SEND, S.L. - MOSQUITERAS BARATAS':'ACC6764',
  };
  for(const [name,id] of Object.entries(aliases)){if(!accounts.some(a=>a.id_cuenta===id))throw Error(`La cuenta asociada ${id} no existe.`);accounts.push({id_cuenta:id,nombre_empresa:name});}
  const csv=await fs.readFile(file,'utf8');
  const first=prepareVtigerComments(csv,accounts,agents),newAccounts=[];
  for(const item of first.unresolved){
    if(item.candidates.length||!item.accountRecord)throw Error(`Cuenta ambigua: ${item.name}.`);
    if(newAccounts.some(a=>a.nombre_empresa===item.name))continue;
    const account={id_cuenta:await allocateAccountIdentifier(db),nombre_empresa:item.name,record:item.accountRecord};
    if(accounts.some(a=>a.id_cuenta===account.id_cuenta))throw Error(`Identificador existente con otro nombre: ${account.id_cuenta}.`);
    newAccounts.push(account);accounts.push(account);
    await db.query(`INSERT INTO comercial_cuentas(id_cuenta,nombre_empresa,datos_comerciales) VALUES($1,$2,jsonb_build_object('importacion_comentarios_vtiger',jsonb_build_object('archivo',$3::text,'record',$4::text,'fecha',now())))`,[account.id_cuenta,account.nombre_empresa,path.basename(file),account.record]);
  }
  const plan=prepareVtigerComments(csv,accounts,agents);
  const existing=(await db.query('SELECT * FROM general_comentarios WHERE id_comentario=ANY($1::text[])',[plan.comments.map(c=>c.id_comentario)])).rows;
  const old=new Map(existing.map(c=>[c.id_comentario,c]));
  for(const c of plan.comments){const e=old.get(c.id_comentario);if(e&&(e.id_entidad!==c.id_entidad||e.contenido_comentario!==c.contenido_comentario))throw Error(`Comentario ${c.id_comentario} ya existente con otra cuenta o texto. No se sobrescribe.`);}
  const fresh=plan.comments.filter(c=>!old.has(c.id_comentario));
  const report={file,total:plan.total,comments:plan.comments.length,empty:plan.empty,duplicates:plan.duplicates,existing:existing.length,new:fresh.length,newAccounts,aliases,unresolved:plan.unresolved,applied:apply};
  await fs.mkdir(directory,{recursive:true});
  if(apply){
    if(plan.unresolved.length)throw Error(`Hay ${plan.unresolved.length} cuentas sin asociación segura. Revisa preview.json.`);
    await fs.writeFile(path.join(directory,`before-${Date.now()}.json`),JSON.stringify({existing,source:file}),{flag:'wx'});
    for(let i=0;i<fresh.length;i+=500)await db.query(`INSERT INTO general_comentarios(id_comentario,tipo_entidad,id_entidad,contenido_comentario,created_at,updated_at,id_original_autor,id_last_editor)
      SELECT id_comentario,'cuenta',id_entidad,contenido_comentario,created_at,created_at,id_original_autor,id_original_autor
      FROM jsonb_to_recordset($1::jsonb) AS x(id_comentario text,id_entidad text,contenido_comentario text,created_at timestamptz,id_original_autor text)
      ON CONFLICT(id_comentario) DO NOTHING`,[JSON.stringify(fresh.slice(i,i+500))]);
    const result=(await db.query('SELECT count(*)::int n FROM general_comentarios WHERE id_comentario=ANY($1::text[])',[plan.comments.map(c=>c.id_comentario)])).rows[0].n;
    if(result!==plan.comments.length)throw Error('No se ha importado el conjunto completo.');
  }
  await db.query(apply?'COMMIT':'ROLLBACK');
  await fs.writeFile(path.join(directory,apply?'result.json':'preview.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({...report,unresolved:plan.unresolved.slice(0,12),directory}));
}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
