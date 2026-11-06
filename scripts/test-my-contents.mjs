import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {getMyContents} from '../server/features/produccion/MyContentsRepository.js';
import {withUserEventContext} from '../server/features/userEvents/EventContext.js';
env.loadEnvConfig(process.cwd());const pool=getPgPool(),db=await pool.connect(),schema='test_my_contents_'+randomUUID().replaceAll('-',''),requestId=randomUUID();
try {
 await withUserEventContext({actorId:'test-my-contents',actorName:'Prueba aislada',requestId,route:'/test/dashboard/mis-contenidos',method:'GET',enabled:true,ip:null,ipSource:'prueba'},async()=>{
  await db.query('BEGIN');await db.query('CREATE SCHEMA '+schema);await db.query('SET LOCAL search_path TO '+schema+',public');
  for(const table of ['produccion_contenidos','produccion_materiales','comercial_cuentas','comercial_contratos'])await db.query(`CREATE TABLE ${schema}.${table} (LIKE public.${table} INCLUDING ALL)`);
  for(const [id,agent,state,deadline] of [['waiting','own','Contratado pendiente de recibir','01/01/2099'],['process','own','Pendiente maquetación','01/01/2000'],['incident','own','Pendiente redacción','01/01/2099'],['published','own','Publicado','01/01/2000'],['other','other','Pendiente corrección','01/01/2000'],['fallback',null,'Pendiente Publicar','01/01/2099'],['json',null,'Pendiente Publicar','01/01/2099'],['explicit_other','other','Pendiente Publicar','01/01/2099']]) {
   await db.query('INSERT INTO produccion_contenidos(id_contenido,nombre_contenido,tipo_contenido,id_agente,estado_contenido,deadline_contenido) VALUES($1,$1,\'anuncio\',$2,$3,$4)',[id,agent,state,deadline]);
  }
  await db.query("INSERT INTO comercial_contratos(id_contrato,id_agente_contrato,array_contenidos) VALUES('ct','own',$1::jsonb)",[JSON.stringify([{id_contenido:'json'}])]);
  await db.query("UPDATE produccion_contenidos SET id_contrato='ct' WHERE id_contenido IN ('fallback','explicit_other')");
  await db.query("INSERT INTO produccion_materiales(id_material,nombre_material,id_contenido,validacion_produccion) VALUES('material_incident','Incidencia','incident','incidencia')");
  const before=(await db.query('SELECT count(*)::int n FROM eventos_de_usuarios WHERE id_solicitud=$1',[requestId])).rows[0].n;
  const rows=await getMyContents('own',db);
  assert.deepEqual(rows.map(r=>r.id_contenido).sort(),['fallback','incident','json','process','waiting']);
  for(const id of ['waiting','fallback','json'])assert.equal(rows.find(r=>r.id_contenido===id).fase,'recibir');
  assert.equal(rows.find(r=>r.id_contenido==='process').motivo_atencion,'Fecha límite vencida');
  assert.equal(rows.find(r=>r.id_contenido==='incident').motivo_atencion,'Incidencia pendiente de resolver');
  assert(rows.every(r=>r.id_contenido!=='published'&&r.id_contenido!=='other'&&r.id_contenido!=='explicit_other'));
  await assert.rejects(getMyContents('',db),e=>e.status===401);
  assert.equal((await db.query('SELECT count(*)::int n FROM eventos_de_usuarios WHERE id_solicitud=$1',[requestId])).rows[0].n,before,'Las lecturas no generan eventos');
  await db.query('ROLLBACK');
 });
 assert.equal((await db.query('SELECT 1 FROM pg_namespace WHERE nspname=$1',[schema])).rowCount,0);
 console.log('PASS: solo contenidos propios, gestor de contrato como respaldo, fases, incidencias y vencidos, autenticacion y lecturas sin eventos.');
}finally{await db.query('ROLLBACK');db.release();await pool.end();}
