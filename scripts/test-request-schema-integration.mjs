import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import ts from 'typescript';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {createRevista,getRevistas,updateRevista} from '../server/features/revista/RevistaRepository.js';
import {createNewsletter,getNewsletters,updateNewsletter} from '../server/features/revista/NewsletterRepository.js';

env.loadEnvConfig(process.cwd());
const pool=getPgPool(), db=await pool.connect(), schema='test_request_schema_'+randomUUID().replaceAll('-','');
const originalQuery=pool.query, originalConnect=pool.connect;
const files=['20261008_0002_explicit_publication_proposal_schema.sql','20261008_0003_publication_backfill.sql'];
const tables=['servicios_revistas','servicios_publicaciones','servicios_paginas_revista','servicios_newsletters',
  'comercial_propuestas_db','comercial_propuestas_lineas','comercial_contratos','comercial_contratos_lineas','produccion_contenidos'];
const source=fs.readFileSync('server/features/propuesta/PropuestaRepository.js','utf8');
const tree=ts.createSourceFile('repository.js',source,ts.ScriptTarget.Latest,true);
const routine=tree.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='replaceLineas');
const replace=new Function('asNumber','generateId',routine.getText(tree)+';return replaceLineas;')(
  (value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback,prefix=>prefix+'_'+randomUUID());
async function migrate(){for(const file of files)await db.query(fs.readFileSync('database/migrations/'+file,'utf8'));}
async function snapshot(){const result={};for(const table of tables)result[table]=(await db.query(`SELECT to_jsonb(t) AS row FROM ${table} t ORDER BY to_jsonb(t)::text`)).rows;return result;}
try {
  await db.query('BEGIN');
  await db.query('CREATE SCHEMA '+schema);await db.query('SET LOCAL search_path TO '+schema);
  await db.query("SET LOCAL statement_timeout = '30s'");
  for(const table of tables)await db.query(`CREATE TABLE ${table} (LIKE public.${table} INCLUDING ALL)`);
  await db.query('ALTER TABLE comercial_propuestas_lineas DROP COLUMN id_publicacion, DROP COLUMN precio_total_personalizado, DROP COLUMN especificaciones_linea');
  await db.query('ALTER TABLE servicios_publicaciones DROP COLUMN fecha_pedir_materiales, DROP COLUMN num_paginas');
  await db.query("INSERT INTO servicios_revistas(id_revista,revista) VALUES('magazine','Prueba')");
  await migrate();
  const publication=(await db.query("SELECT * FROM servicios_publicaciones WHERE revista_id='magazine'")).rows[0];
  assert.ok(publication);assert.equal(publication.num_paginas,9);
  assert.equal((await db.query('SELECT count(*)::int AS count FROM servicios_paginas_revista')).rows[0].count,9);
  // Explicit normalization must preserve existing pages, assignments and timestamps on repeat.
  await db.query("UPDATE servicios_paginas_revista SET pagina_preferente='reserva_personalizada',tipo='Personalizada',id_cuenta='account' WHERE pagina_actual=2");
  const before=await snapshot();await migrate();assert.deepEqual(await snapshot(),before);
  // Legacy newsletters are imported only by the explicit migration, never on a read.
  await db.query(`CREATE TABLE newsletters_db(id_newsletter text,titulo text,estado text,created_at timestamptz,updated_at timestamptz,
    fecha_publicacion text,deadline_materiales text,link text,cuenta_id text,contenido_id text)`);
  await db.query("INSERT INTO newsletters_db VALUES('news123','Boletín','activo',now(),now(),'01/10/2026','','','account','content')");
  await migrate();
  assert.equal((await db.query("SELECT numero_publicacion FROM servicios_publicaciones WHERE newsletter_id='news123'")).rows[0].numero_publicacion,'123');
  const withLegacy=await snapshot();await migrate();assert.deepEqual(await snapshot(),withLegacy);
  assert.ok((await db.query("SELECT to_regclass('newsletters_db') AS name")).rows[0].name);
  // Real PostgreSQL inserts, with a reserved page whose specification must survive.
  await replace(db,'proposal',[{id_linea_propuesta:'old',id_pagina_publicacion:'pag_pub_magazine_1',especificaciones_linea:'Reserva original'}]);
  await replace(db,'proposal',[{id_linea_propuesta:'old',id_pagina_publicacion:'pag_pub_magazine_1',especificaciones_linea:'No cambiar',
    numero_linea_propuesta:9,precio_tarifa:12.34,descuento_producto:5,precio_unitario:11.72,unidades:0,modo_precio:'personalizado',precio_total_personalizado:0},
    {id_linea_propuesta:'second',id_publicacion:'pub_magazine',descripcion_linea:'Texto\nmultilínea',precio_total_personalizado:null}]);
  const lines=(await db.query('SELECT * FROM comercial_propuestas_lineas ORDER BY id_linea_propuesta')).rows;
  assert.equal(lines[0].especificaciones_linea,'Reserva original');assert.equal(Number(lines[0].precio_total_personalizado),0);
  assert.equal(Number(lines[0].unidades),0);assert.equal(lines[0].numero_linea_propuesta,9);
  assert.equal(lines[1].descripcion_linea,'Texto\nmultilínea');assert.equal(lines[1].precio_total_personalizado,null);
  await db.query('SAVEPOINT batch_failure');
  const large=Array.from({length:501},(_,index)=>({id_linea_propuesta:index===500?'line_0':'line_'+index}));
  await assert.rejects(replace(db,'proposal',large),error=>error.code==='23505');
  await db.query('ROLLBACK TO SAVEPOINT batch_failure');
  assert.deepEqual((await db.query('SELECT * FROM comercial_propuestas_lineas ORDER BY id_linea_propuesta')).rows,lines);
  await replace(db,'proposal',Array.from({length:1001},(_,index)=>({id_linea_propuesta:'line_'+index})));
  assert.equal((await db.query('SELECT count(*)::int AS count FROM comercial_propuestas_lineas')).rows[0].count,1001);
  await replace(db,'proposal',[]);assert.equal((await db.query('SELECT count(*)::int AS count FROM comercial_propuestas_lineas')).rows[0].count,0);
  for(const table of ['comercial_cuentas','comercial_contactos','contenidos_revistas_db','servicios_db']) {
    const exists=(await db.query('SELECT to_regclass($1) AS name',['public.'+table])).rows[0].name;
    if(exists)await db.query(`CREATE TABLE ${table} (LIKE public.${table} INCLUDING ALL)`);
  }
  let depth=0;
  const adapter={release(){},async query(sql,values){
    if(sql==='BEGIN')return db.query('SAVEPOINT repository_'+(++depth));
    if(sql==='COMMIT')return db.query('RELEASE SAVEPOINT repository_'+(depth--));
    if(sql==='ROLLBACK')return db.query('ROLLBACK TO SAVEPOINT repository_'+(depth--));
    assert.equal(/\b(?:ALTER|CREATE|DROP)\s+(?:TABLE|INDEX)\b/i.test(sql),false,'Runtime repository must not run DDL');
    return db.query(sql,values);
  }};
  pool.query=(...args)=>adapter.query(...args);pool.connect=async()=>adapter;
  const created=await createRevista({id_revista:'new_magazine',revista:'Nueva revista',edicion:'España',numero_publicacion:'1',num_paginas:9});
  assert.ok(created);assert.equal(created.num_paginas,9);
  await updateRevista('new_magazine',{fecha_pedir_materiales:'09/10/2026'});
  const newsletter=await createNewsletter({id_newsletter:'new_newsletter',nombre_newsletter:'Nuevo boletín',numero_publicacion:'2'});
  assert.ok(newsletter);await updateNewsletter('new_newsletter',{nombre_newsletter:'Boletín editado'});
  const afterCreation=await snapshot();
  assert.ok((await getRevistas()).some(row=>row.id_revista==='new_magazine'));
  assert.ok((await getNewsletters()).some(row=>row.id_newsletter==='new_newsletter'));
  assert.deepEqual(await snapshot(),afterCreation,'Listing must not normalize or rewrite pages/timestamps');
  // An unknown legacy page table is preserved, and demands explicit review.
  await db.query('CREATE TABLE publicaciones_paginas_db(id text)');await db.query('SAVEPOINT legacy_pages');
  await assert.rejects(migrate(),/Revisar y migrar/);await db.query('ROLLBACK TO SAVEPOINT legacy_pages');
  assert.ok((await db.query("SELECT to_regclass('publicaciones_paginas_db') AS name")).rows[0].name);
  console.log('PASS: missing columns restored, repeat without row/timestamp changes, legacy preservation, magazine/newsletter create/edit/read, batch values and rollback after second-batch failure.');
} finally {
  pool.query=originalQuery;pool.connect=originalConnect;
  await db.query('ROLLBACK');db.release();await pool.end();
}
