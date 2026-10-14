import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {withUserEventContext} from '../server/features/userEvents/EventContext.js';
import {signEventIdentity,verifyEventIdentity} from '../server/features/userEvents/EventIdentity.js';
import {Sequelize} from 'sequelize';
import pg from 'pg';
import {AuditedClient} from '../server/database/AuditedClient.js';
env.loadEnvConfig(process.cwd());
const context={actorId:'audit-test',actorName:'Usuario de prueba',requestId:randomUUID(),route:'/api/v1/comercial/cuentas',method:'POST',enabled:true,ip:'192.0.2.10',ipSource:'prueba'};
const signed=signEventIdentity(context);assert.equal(verifyEventIdentity(signed).actorId,context.actorId);assert.throws(()=>verifyEventIdentity(signed.slice(0,-3)+'xyz'));
const pool=getPgPool(),db=await pool.connect(),name='p3_audit_test_'+randomUUID().replaceAll('-','');
const parent=name+'_parent',child=name+'_child';
try{
 await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='25s'");
 await db.query(`CREATE TABLE public.${parent}(id TEXT PRIMARY KEY,nombre_cuenta TEXT,nif TEXT,password TEXT,archivo BYTEA,datos JSONB,updated_at TIMESTAMPTZ DEFAULT now());CREATE TABLE public.${child}(id TEXT PRIMARY KEY,parent_id TEXT REFERENCES public.${parent}(id) ON DELETE CASCADE,detalle TEXT)`);
 await db.query('SELECT public.p3_install_user_event_triggers()');
 await withUserEventContext(context,async()=>{
  await db.query('DO $block$ BEGIN PERFORM 1; END $block$');
  await assert.rejects(()=>db.query('SELECT 1; COMMIT'),/por separado/);
  await db.query(`INSERT INTO public.${parent}(id,nombre_cuenta,nif,password,archivo,datos) VALUES('one','Cuenta prueba','NIF-A','never-store-secret',decode('010203','hex'),' {"secret":"never-json-secret","visible":1}')`);
  await db.query(`INSERT INTO public.${child} VALUES('child','one','Dato asociado')`);
  await db.query(`UPDATE public.${parent} SET nif='NIF-B' WHERE id='one'`);
  await db.query(`UPDATE public.${parent} SET updated_at=clock_timestamp() WHERE id='one'`);
  await db.query(`UPDATE public.${parent} SET password='never-store-secret-2' WHERE id='one'`);
  await db.query(`SELECT * FROM public.${parent}`);
 });
 let rows=(await db.query('SELECT * FROM eventos_de_usuarios WHERE id_solicitud=$1 ORDER BY id',[context.requestId])).rows;
 assert.equal(rows.length,4);assert.equal(rows[2].datos_anteriores.nif,'NIF-A');assert.equal(rows[2].datos_nuevos.nif,'NIF-B');assert(rows[2].descripcion.includes('de NIF-A a NIF-B'));
 assert(rows[3].campos_modificados.includes('password'));assert(!JSON.stringify(rows).includes('never-store-secret'));assert(!JSON.stringify(rows).includes('never-json-secret'));assert.equal(rows[0].datos_nuevos.archivo.bytes,3);
 const nested={...context,requestId:randomUUID()};
 await withUserEventContext(nested,()=>new Promise((resolve,reject)=>db.query(`UPDATE public.${parent} SET datos=jsonb_set(datos,'{visible}','2') WHERE id='one'`,(error,result)=>error?reject(error):resolve(result))));
 const nestedEvent=(await db.query('SELECT cambios FROM eventos_de_usuarios WHERE id_solicitud=$1',[nested.requestId])).rows[0];
 assert(nestedEvent.cambios.some(c=>c.campo==='datos.visible'&&c.antes===1&&c.despues===2));
 const second={...context,actorId:'audit-other',actorName:'Otro usuario',requestId:randomUUID(),ip:'192.0.2.11',method:'DELETE'};
 await withUserEventContext(second,()=>db.query(`DELETE FROM public.${parent} WHERE id='one'`));
 rows=(await db.query('SELECT * FROM eventos_de_usuarios WHERE id_solicitud=$1 ORDER BY id',[second.requestId])).rows;
 assert.equal(rows.length,2);assert(rows.every(r=>r.id_usuario==='audit-other'&&r.ip==='192.0.2.11'));assert(rows.some(r=>r.tabla===child&&r.datos_anteriores.parent_id==='one'));
 await withUserEventContext({...context,enabled:false,method:'GET'},()=>db.query(`INSERT INTO public.${parent}(id) VALUES('read-side-effect')`));
 assert.equal((await db.query('SELECT count(*)::int n FROM eventos_de_usuarios WHERE id_solicitud=$1',[context.requestId])).rows[0].n,4);
 const truncated={...context,requestId:randomUUID()};
 await withUserEventContext(truncated,()=>db.query(`TRUNCATE public.${child},public.${parent}`));
 assert.equal((await db.query('SELECT count(*)::int n FROM eventos_de_usuarios WHERE id_solicitud=$1',[truncated.requestId])).rows[0].n,1);
 await db.query('SAVEPOINT immutable_check');await assert.rejects(()=>db.query('DELETE FROM eventos_de_usuarios WHERE id_solicitud=$1',[context.requestId]),/no se puede/);await db.query('ROLLBACK TO SAVEPOINT immutable_check');
 const rollback={...context,requestId:randomUUID()};await db.query('SAVEPOINT rollback_check');
 await withUserEventContext(rollback,()=>db.query(`INSERT INTO public.${parent}(id) VALUES('rolled-back')`));await db.query('ROLLBACK TO SAVEPOINT rollback_check');
 assert.equal((await db.query('SELECT count(*)::int n FROM eventos_de_usuarios WHERE id_solicitud=$1',[rollback.requestId])).rows[0].n,0);
 const selectionDelete={...context,role:'superadmin',method:'DELETE',requestId:randomUUID(),route:'/api/v1/direccion/eventos-de-usuarios'};
 await withUserEventContext(selectionDelete,async()=>{
  await db.query("SELECT set_config('p3.user_event_delete','true',true)");
  await db.query('DELETE FROM eventos_de_usuarios WHERE id_solicitud=$1',[nested.requestId]);
 });
 assert.equal((await db.query('SELECT count(*)::int n FROM eventos_de_usuarios WHERE id_solicitud=$1',[nested.requestId])).rows[0].n,0);
 assert.equal((await db.query('SELECT count(*)::int n FROM eventos_de_usuarios WHERE id_solicitud=$1',[selectionDelete.requestId])).rows[0].n,0,'Deleting events must not generate events');
 console.log('PASS: crear/editar/borrar, valores anteriores/nuevos, cascadas, IP, secretos protegidos, archivos sin copiar, TRUNCATE, rollback, lecturas sin eventos e historial sin bucles ni modificaciones.');
}finally{await db.query('ROLLBACK');db.release();}
const orm=new Sequelize(process.env.DATABASE_NAME,process.env.DATABASE_USER,process.env.DATABASE_PASSWORD,{dialect:'postgres',host:process.env.DATABASE_HOST,port:Number(process.env.DATABASE_PORT),logging:false,dialectModule:{...pg,Client:AuditedClient},dialectOptions:{ssl:pool.options.ssl},pool:{max:2}});
try{
 await Promise.all([0,1].map(async n=>{
  const actor={...context,actorId:'orm-actor-'+n,actorName:'ORM '+n,requestId:randomUUID(),ip:'192.0.2.'+(20+n)},table=name+'_orm_'+n;
  const rollback=Error('rollback fixture');
  await assert.rejects(withUserEventContext(actor,()=>orm.transaction(async transaction=>{
   const run=(sql,bind=[])=>orm.query(sql,{bind,transaction});
   await run("SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='25s'");
   await run(`CREATE TABLE public.${table}(id TEXT PRIMARY KEY,nombre TEXT)`);
   await run(`INSERT INTO public.${table} VALUES('one','Antes')`);
   await run(`UPDATE public.${table} SET nombre='Después' WHERE id='one'`);
   const [rows]=await run('SELECT * FROM eventos_de_usuarios WHERE id_solicitud=$1 ORDER BY id',[actor.requestId]);
   assert.equal(rows.length,2);assert(rows.every(r=>r.id_usuario===actor.actorId&&r.ip===actor.ip));
   throw rollback;
  })),e=>e===rollback);
 }));
 console.log('PASS: Sequelize, callbacks y dos usuarios concurrentes conservan su identidad y revierten sus eventos.');
}finally{await orm.close();await pool.end();}
