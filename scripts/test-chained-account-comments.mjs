import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {withUserEventContext} from '../server/features/userEvents/EventContext.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect(),suffix=randomUUID();
const account='PRUEBA-ACC-'+suffix,contract='PRUEBA-C-'+suffix;
const context={enabled:true,actorId:'test-chained-comments',actorName:'Prueba de comentarios',requestId:randomUUID(),method:'PUT',route:'/api/v1/comercial/contratos/'+contract,ip:null};
try {
 await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='20s'");
 await db.query('INSERT INTO comercial_cuentas(id_cuenta,nombre_empresa) VALUES($1,$2)',[account,'Prueba transaccional']);
 await db.query('INSERT INTO comercial_contratos(id_contrato,id_cuenta_contrato,forma_cobro_contrato) VALUES($1,$2,$3)',[contract,account,'transferencia']);
 for(const ordinal of [1,2])await db.query('INSERT INTO tesoreria_ordenes(id_orden,id_contrato,id_cuenta,forma_cobro,cobro_total) VALUES($1,$2,$3,$4,$5)',[contract+'-'+ordinal+'/2',contract,account,'transferencia',100]);
 await withUserEventContext(context,async()=>{
  await db.query('UPDATE comercial_contratos SET forma_cobro_contrato=$2 WHERE id_contrato=$1',[contract,'recibo']);
  await db.query('UPDATE tesoreria_ordenes SET forma_cobro=$2,cobro_total=$3 WHERE id_contrato=$1',[contract,'recibo',120]);
  await db.query('SELECT public.p3_account_operation_comment()');
 });
 const comments=(await db.query('SELECT * FROM general_comentarios WHERE id_entidad=$1',[account])).rows;
 assert.equal(comments.length,1);assert(comments[0].contenido_comentario.includes(contract));
 assert(comments[0].contenido_comentario.includes('-1/2'));assert(comments[0].contenido_comentario.includes('-2/2'));
 assert(comments[0].contenido_comentario.includes('de transferencia a recibo'));assert(comments[0].contenido_comentario.includes('de 100 a 120'));
 const events=(await db.query('SELECT * FROM eventos_de_usuarios WHERE id_solicitud=$1',[context.requestId])).rows;
 assert.equal(events.filter(e=>e.tabla==='general_comentarios').length,1,'One summary, no recursion');
 await db.query('SAVEPOINT additional');
 const second={...context,requestId:randomUUID()};
 await withUserEventContext(second,async()=>{
  await db.query('UPDATE tesoreria_ordenes SET cobro_total=125 WHERE id_contrato=$1',[contract]);
  await db.query('SELECT public.p3_account_operation_comment()');
 });
 assert.equal((await db.query('SELECT count(*)::int n FROM general_comentarios WHERE id_entidad=$1',[account])).rows[0].n,2);
 await db.query('ROLLBACK TO additional');
 assert.equal((await db.query('SELECT count(*)::int n FROM general_comentarios WHERE id_entidad=$1',[account])).rows[0].n,1);
 await withUserEventContext({...context,requestId:randomUUID(),route:'/api/v1/comercial/propuestas/test'},async()=>{
  await db.query('UPDATE tesoreria_ordenes SET cobro_total=130 WHERE id_contrato=$1',[contract]);
  await db.query('SELECT public.p3_account_operation_comment()');
 });
 assert.equal((await db.query('SELECT count(*)::int n FROM general_comentarios WHERE id_entidad=$1',[account])).rows[0].n,1,'Proposal owns its commercial summary');
 console.log('PASS: contract and two orders share one comment, old/new values, distinct requests, rollback and no recursive comments.');
} finally {await db.query('ROLLBACK');db.release();await pool.end();}
