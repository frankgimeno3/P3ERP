import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import env from '@next/env';
import { getPgPool } from '../server/database/pgClient.js';
import { completeContentIntake, validateContentSelection } from '../server/features/produccion/ContentIntakeRepository.js';
import { flattenProductionMedia } from '../server/features/produccion/ProductionMediaFolders.js';
import { contentTypes, contentPending, validateIntakeFiles } from '../app/lib/productionManagement.js';

env.loadEnvConfig(process.cwd());
const pool = getPgPool(), db = await pool.connect(), schema = 'test_intake_' + randomUUID().replaceAll('-', '');
const originalConnect = pool.connect.bind(pool), originalQuery = pool.query.bind(pool);
const concurrentClients = [];
try {
  await db.query('CREATE SCHEMA ' + schema);
  await db.query('SET search_path TO ' + schema + ',public');
  for (const table of ['produccion_contenidos', 'produccion_materiales', 'produccion_cargas_materiales', 'mediateca_carpetas', 'mediateca_archivos', 'servicios_revistas', 'servicios_publicaciones', 'produccion_revistas_contenidos', 'produccion_control_redaccion', 'comercial_cuentas', 'comercial_contratos']) await db.query(`CREATE TABLE ${schema}.${table} (LIKE public.${table} INCLUDING ALL)`);
  pool.connect = async () => ({ query: (...args) => db.query(...args), release() {} });
  pool.query = (...args) => db.query(...args);
  assert.deepEqual(contentTypes({ articulo_hoja: 'RECIBIDO', anuncio_hoja: 'RECIBIDO' }), ['articulo', 'anuncio']);
  assert.ok(contentPending({ estado_contenido: 'Parcialmente publicado' }));
  assert.ok(!contentPending({ estado_contenido: 'Publicado' }));
  assert.ok(validateIntakeFiles([{ filename: 'a.pdf', size: 10, nombre_material: 'x' }], 'zip').length);
  const file = (type = 'otros', revista = false) => {
    const mediaId = randomUUID();
    return { filename: 'test.zip', nombre_material: 'Material de prueba', descripcion: 'Descripción del archivo', size: 10, contentType: 'application/zip', mediaId, s3Key: `mediateca/documentos_produccion/${revista ? 'documentos_revistas/' : ''}${type}/${mediaId}/test.zip` };
  };
  const data = { tipo: 'otro', contratado: false, sin_empresa: true, nombre: 'Contenido de prueba', descripcion: 'Descripción del contenido', modo: 'zip', id_carga: randomUUID(), materiales: [file()] };
  const first = await completeContentIntake(data, async () => {});
  assert.deepEqual(await completeContentIntake(data, async () => { throw new Error('Retry must not re-upload'); }), first);
  assert.equal((await db.query('SELECT count(*)::int n FROM produccion_contenidos')).rows[0].n, 1);
  assert.equal((await db.query('SELECT count(*)::int n FROM produccion_materiales')).rows[0].n, 1);
  assert.equal((await db.query('SELECT descripcion_material FROM produccion_materiales')).rows[0].descripcion_material, data.materiales[0].descripcion);
  assert.equal((await db.query('SELECT mediateca_content_type FROM mediateca_archivos')).rows[0].mediateca_content_type, 'file');
  const before = (await db.query('SELECT count(*)::int n FROM produccion_contenidos')).rows[0].n;
  await assert.rejects(completeContentIntake({ ...data, id_carga: randomUUID(), materiales: [file()] }, async () => { throw new Error('S3 missing'); }), /S3 missing/);
  assert.equal((await db.query('SELECT count(*)::int n FROM produccion_contenidos')).rows[0].n, before);
  // A duplicate material fails after creating a content; the whole transaction must roll back.
  await assert.rejects(completeContentIntake({ ...data, id_carga: randomUUID() }, async () => {}));
  assert.equal((await db.query('SELECT count(*)::int n FROM produccion_contenidos')).rows[0].n, before);
  await assert.rejects(validateContentSelection({ ...data, tipo: 'otro', para_revista: true, id_revista: 'invalid' }), /Solo/);
  await assert.rejects(validateContentSelection({ tipo: 'anuncio', contratado: true, id_cuenta: 'missing', id_contrato: 'wrong', id_contenido: first.id_contenido }), /cuenta/);
  await db.query("INSERT INTO comercial_cuentas(id_cuenta,nombre_empresa) VALUES('account_test','Empresa prueba'),('other_test','Otra empresa')");
  await db.query("INSERT INTO comercial_contratos(id_contrato,id_cuenta_contrato,array_contenidos) VALUES('contract_test','account_test',$1::jsonb)", [JSON.stringify([{ id_contenido: first.id_contenido }])]);
  await db.query("UPDATE produccion_contenidos SET id_cuenta='account_test' WHERE id_contenido=$1", [first.id_contenido]);
  const contracted = { ...data, contratado: true, sin_empresa: false, id_cuenta: 'account_test', id_contrato: 'contract_test', id_contenido: first.id_contenido, id_carga: randomUUID(), materiales: [file()] };
  const attached = await completeContentIntake(contracted, async () => {});
  assert.equal(attached.id_contenido, first.id_contenido);
  assert.equal((await db.query('SELECT count(*)::int n FROM produccion_contenidos')).rows[0].n, before);
  await assert.rejects(validateContentSelection({ ...contracted, id_cuenta: 'other_test' }), /no pertenece/);
  await assert.rejects(validateContentSelection({ ...contracted, tipo: 'anuncio' }), /tipo seleccionado/);
  await db.query("UPDATE comercial_cuentas SET es_prueba=true WHERE id_cuenta='other_test'");
  const trial = await completeContentIntake({ ...data, sin_empresa: false, id_cuenta: 'other_test', id_carga: randomUUID(), materiales: [file()] }, async () => {});
  assert.ok(trial.id_contenido.startsWith('PRUEBA-'));
  const magazine = 'rev_test';
  await db.query("INSERT INTO servicios_revistas(id_revista,revista,edicion,publicacion) VALUES($1,'Vidrio Plano','Iberia','1')", [magazine]);
  const article = await completeContentIntake({ ...data, tipo: 'articulo', para_revista: true, id_revista: magazine, id_carga: randomUUID(), materiales: [file('material_articulos', true)] }, async () => {});
  assert.equal((await db.query('SELECT tipo FROM produccion_revistas_contenidos WHERE id_contenido=$1', [article.id_contenido])).rows[0].tipo, 'articulos');
  const root = (await db.query("SELECT mediateca_folder_id FROM mediateca_carpetas WHERE mediateca_folder_name='documentos_revistas'")).rows[0].mediateca_folder_id;
  const legacy = randomUUID();
  await db.query("INSERT INTO mediateca_carpetas(mediateca_folder_id,mediateca_parent_folder_id,mediateca_folder_name) VALUES($1,$2,'rev_old')", [legacy, root]);
  await db.query('UPDATE mediateca_archivos SET mediateca_folder_id=$1 WHERE mediateca_content_id=$2', [legacy, data.materiales[0].mediaId]);
  await db.query('BEGIN'); const flattened = await flattenProductionMedia(db); await db.query('COMMIT');
  assert.equal(flattened.moved, 1); assert.equal(flattened.removed, 1);
  assert.equal((await db.query('SELECT mediateca_s3_key FROM mediateca_archivos WHERE mediateca_content_id=$1', [data.materiales[0].mediaId])).rows[0].mediateca_s3_key, data.materiales[0].s3Key);
  for (let i = 0; i < 2; i++) { const connection = await originalConnect(); await connection.query('SET search_path TO ' + schema + ',public'); concurrentClients.push(connection); }
  const available = [...concurrentClients];
  pool.connect = async () => { const connection = available.shift(); return { query: (...args) => connection.query(...args), release() {} }; };
  const concurrent = { ...data, id_carga: randomUUID(), materiales: [file()] };
  const [left, right] = await Promise.all([completeContentIntake(concurrent, async () => {}), completeContentIntake(concurrent, async () => {})]);
  assert.deepEqual(left, right);
  assert.equal((await db.query('SELECT count(*)::int n FROM produccion_cargas_materiales WHERE id_carga=$1', [concurrent.id_carga])).rows[0].n, 1);
  console.log('PASS: intake types, ZIP, descriptions, retry, atomic rollback, magazine destinations and media flattening preserve files.');
} finally {
  pool.connect = originalConnect; pool.query = originalQuery;
  for (const connection of concurrentClients) { await connection.query('RESET search_path'); connection.release(); }
  await db.query('SET search_path TO public'); await db.query('DROP SCHEMA IF EXISTS ' + schema + ' CASCADE');
  db.release(); await pool.end();
}
