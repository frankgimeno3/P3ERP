// Run: node --experimental-default-type=module scripts/test-laboral.mjs
// Uses an isolated schema inside a transaction; all fixtures and DDL are rolled back.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import nextEnv from '@next/env';
import { getPgPool } from '../server/database/pgClient.js';
import * as repo from '../server/features/laboral/LaboralRepository.js';
import { validate, candidateStates, calendarTypes } from '../server/features/laboral/validation.js';
import { deleteAgente, updateAgenteRoles } from '../server/features/agente/AgenteRepository.js';

nextEnv.loadEnvConfig(process.cwd());
const pool = getPgPool(), client = await pool.connect();
const originalQuery = pool.query, originalConnect = pool.connect;
const schema = `laboral_test_${randomUUID().replaceAll('-','')}`;
let count = 0;
const check = (label, fn) => Promise.resolve().then(fn).then(() => { count++; console.log(`OK ${label}`); });
try {
  await client.query('BEGIN');
  await client.query(`CREATE SCHEMA ${schema}`);
  await client.query(`SET LOCAL search_path TO ${schema}`);
  for (const table of ['agentes_db','lineas_bancos','roles_db']) await client.query(`CREATE TABLE ${table} (LIKE public.${table} INCLUDING ALL)`);
  await client.query(fs.readFileSync('database/migrations/20260905_0001_laboral.sql','utf8'));
  await client.query(fs.readFileSync('database/migrations/20260905_0002_laboral_documentos_rds.sql','utf8'));
  const savepoints = [];
  const adapter = { release() {}, async query(sql, values) {
    if (sql === 'BEGIN') { const name = `sp_${savepoints.length}`; savepoints.push(name); return client.query(`SAVEPOINT ${name}`); }
    if (sql === 'COMMIT') return client.query(`RELEASE SAVEPOINT ${savepoints.pop()}`);
    if (sql === 'ROLLBACK') { const name = savepoints.pop(); await client.query(`ROLLBACK TO SAVEPOINT ${name}`); return client.query(`RELEASE SAVEPOINT ${name}`); }
    return client.query(sql,values);
  } };
  pool.query = adapter.query.bind(adapter);
  pool.connect = async () => adapter;
  await client.query("INSERT INTO agentes_db(id_agente,nombre_completo_agente) VALUES ('employee-a','Empleado de prueba A'),('employee-b','Empleado de prueba B')");
  const draft = { id_empleado:'employee-a',mes:9,anio:2026,importe_neto:2000,estado:'pendiente',comentarios:'' };
  await check('agentes existentes y nuevos marcados como empleados', async () => {
    const list = await repo.listEmployees(); assert.equal(list.length,2); assert(list.every(a => a.is_empleado_account));
  });
  await check('un agente desmarcado no aparece ni admite altas laborales', async () => {
    await client.query("UPDATE agentes_db SET is_empleado_account=false WHERE id_agente='employee-b'");
    assert.equal((await repo.listEmployees()).length,1);
    await assert.rejects(repo.savePayment('anticipos',null,{ ...draft,id_empleado:'employee-b' }),/cuenta de empleado/);
  });
  let advance, payroll, pending;
  await check('anticipos anteriores a la nómina se vinculan y desglosan', async () => {
    advance = await repo.savePayment('anticipos',null,{ ...draft,importe_neto:250,estado:'pagado' });
    payroll = await repo.savePayment('nominas',null,draft);
    const saved = await repo.getPayment('nominas',payroll.id);
    assert.deepEqual(saved.anticipos,[advance.id]); assert.equal(saved.total_anticipos_pagados,250); assert.equal(saved.importe_transferencia_nomina,1750);
  });
  await check('anticipos posteriores y cambios de estado recalculan el desglose', async () => {
    pending = await repo.savePayment('anticipos',null,{ ...draft,importe_neto:100 });
    let saved = await repo.getPayment('nominas',payroll.id); assert.equal(saved.anticipos.length,2); assert.equal(saved.importe_transferencia_nomina,1750);
    await repo.savePayment('anticipos',pending.id,{ ...draft,importe_neto:100,estado:'pagado' });
    saved = await repo.getPayment('nominas',payroll.id); assert.equal(saved.importe_transferencia_nomina,1650);
  });
  await check('se rechazan duplicados, netos insuficientes y cambios de periodo sin guardar parcialmente', async () => {
    await assert.rejects(repo.savePayment('nominas',null,draft), e => e.code === '23505');
    await assert.rejects(repo.savePayment('anticipos',null,{ ...draft,importe_neto:3000,estado:'pagado' }),/superan/);
    assert.equal((await repo.listPayments('anticipos')).length,2);
    await assert.rejects(repo.savePayment('nominas',payroll.id,{ ...draft,mes:10 }),/no se pueden cambiar/);
  });
  await check('separación de transferencias y bloqueo de una transferencia reutilizada', async () => {
    await client.query("INSERT INTO lineas_bancos(id_linea_banco,banco,importe) VALUES ('banc_sab_26_000.000.001','Sabadell',-1650),('banc_sab_26_000.000.002','Sabadell',-250),('banc_sab_26_000.000.003','Sabadell',20)");
    await repo.savePayment('nominas',payroll.id,{ ...draft,id_transferencia:'banc_sab_26_000.000.001' });
    await assert.rejects(repo.savePayment('anticipos',advance.id,{ ...draft,importe_neto:250,estado:'pagado',id_transferencia:'banc_sab_26_000.000.001' }),/ya está vinculada/);
    await assert.rejects(repo.savePayment('anticipos',advance.id,{ ...draft,importe_neto:250,estado:'pagado',id_transferencia:'banc_sab_26_000.000.003' }),/salida/);
    await repo.savePayment('anticipos',advance.id,{ ...draft,importe_neto:250,estado:'pagado',id_transferencia:'banc_sab_26_000.000.002' });
    assert.equal((await repo.getPayment('nominas',payroll.id)).transferencias.length,2);
  });
  await check('calendario anual y los ocho tipos de evento persisten', async () => {
    await repo.createCalendar({ anio:2028 });
    for (const tipo of calendarTypes) await repo.saveEvent(null,{ anio:2028,tipo,titulo:tipo,inicio:'2028-02-29',fin:'2028-03-01' });
    const saved = await repo.getCalendar('2028'); assert.equal(saved.eventos.length,8); assert.equal(saved.eventos[0].inicio,'2028-02-29');
    await repo.deleteRecord('eventos',saved.eventos[0].id); assert.equal((await repo.getCalendar(2028)).eventos.length,7);
  });
  await check('fechas imposibles, rangos invertidos y años distintos son rechazados', async () => {
    for (const data of [{inicio:'2027-02-29',fin:'2027-03-01'},{inicio:'2028-03-02',fin:'2028-03-01'},{inicio:'2029-01-01',fin:'2029-01-01'}]) assert.throws(() => validate('eventos',{ anio:2028,tipo:'feria',titulo:'Prueba',...data }));
  });
  await check('tres días por año, fechas únicas y conservación de otros años', async () => {
    await repo.saveFreeDays('employee-a',{ anio:2026,fechas:[{numero:1,fecha:'2026-09-05'},{numero:2,fecha:'2026-09-06'},{numero:3,fecha:'2026-09-07'}] });
    assert.equal((await repo.getEmployee('employee-a',2026)).libres.length,3);
    await assert.rejects(repo.saveFreeDays('employee-a',{ anio:2026,fechas:[{numero:4,fecha:'2026-09-08'}] }));
    await assert.rejects(repo.saveFreeDays('employee-a',{ anio:2026,fechas:[{numero:1,fecha:'2026-09-05'},{numero:2,fecha:'2026-09-05'}] }));
    await repo.saveFreeDays('employee-a',{ anio:2027,fechas:[{numero:1,fecha:'2027-01-01'}] });
    assert.equal((await repo.getEmployee('employee-a',2026)).libres.length,3);
    await repo.saveFreeDays('employee-a',{ anio:2026,fechas:[] }); assert.equal((await repo.getEmployee('employee-a',2026)).libres.length,0);
  });
  await check('ausencias entre años y comentarios del empleado', async () => {
    await repo.saveAbsence('employee-a',null,{tipo:'Ausencia de prueba',inicio:'2026-12-31',fin:'2027-01-02'});
    await repo.addComment('employee-a',{comentario:'Comentario de prueba'});
    assert.equal((await repo.getEmployee('employee-a',2027)).ausencias.length,1);
    assert.equal((await repo.getEmployee('employee-a',2026)).comentarios.length,1);
  });
  await check('oferta, mensajes y todos los estados de candidatos', async () => {
    const process = await repo.saveProcess(null,{nombre:'Proceso de prueba',oferta_condiciones:'Oferta',mensaje_pre_llamada:'Pre',mensaje_post_llamada:'Post',mensaje_rechazo:'Rechazo'});
    const candidate = await repo.saveCandidate(process.id,null,{nombre:'Candidato de prueba',resumen_cv:'CV',estado:candidateStates[0]});
    for (const estado of candidateStates) { await repo.saveCandidate(process.id,candidate.id,{nombre:'Candidato de prueba',estado}); assert.equal((await repo.getProcess(process.id)).candidatos[0].estado,estado); }
    assert.equal((await repo.getProcess(process.id)).oferta_condiciones,'Oferta');
    await assert.rejects(repo.saveCandidate(process.id,candidate.id,{nombre:'Candidato de prueba',estado:'inventado'}));
  });
  await check('documentos se vinculan a un único propietario válido', async () => {
    await repo.addDocument('nominas',payroll.id,{id:'doc-test',nombre:'nomina.pdf',contentType:'application/pdf',size:100,key:'laboral/test/doc-test'});
    assert.equal((await repo.listDocuments('nominas',payroll.id)).length,1);
    assert.equal((await repo.listDocuments('empleados','employee-a')).length,0);
    await assert.rejects(repo.documentOwner('nominas','missing'), e => e.status === 404);
  });
  await check('histórico laboral bloquea el borrado antes de tocar Cognito y permite desmarcar empleado', async () => {
    let externalDelete = false;
    await assert.rejects(deleteAgente('employee-a',async () => { externalDelete = true; }),e => e.code === 'EMPLOYEE_HISTORY');
    assert.equal(externalDelete,false);
    const updated = await updateAgenteRoles('employee-a',{is_empleado_account:false});
    assert.equal(updated.is_empleado_account,false);
    assert.equal((await repo.getPayment('nominas',payroll.id)).id_empleado,'employee-a');
  });
  if (process.argv.includes('--storage')) await check('subida y descarga de documento en el almacenamiento configurado', async () => {
    const { uploadDocument, downloadDocument } = await import('../server/features/laboral/DocumentStorage.js');
    const { deleteObjectFromS3 } = await import('../server/features/mediateca/S3Service.js');
    const form = new FormData(); form.append('file',new Blob(['Prueba temporal de almacenamiento laboral.'],{type:'text/plain'}),'prueba-laboral.txt');
    const uploaded = await uploadDocument(new Request('http://localhost/documentos',{method:'POST',body:form}),'nominas',payroll.id);
    const document = await repo.getDocument(uploaded.id);
    try {
      const response = await downloadDocument(uploaded.id);
      assert.equal(await response.text(),'Prueba temporal de almacenamiento laboral.');
      assert.equal(response.headers.get('Cache-Control'),'private, no-store');
    } finally { if (document.s3_key) await deleteObjectFromS3(document.s3_key); }
  });
  console.log(`${count} grupos de pruebas correctos. Datos y esquema de prueba revertidos al finalizar.`);
} finally {
  pool.query = originalQuery; pool.connect = originalConnect;
  await client.query('ROLLBACK'); client.release(); await pool.end();
}
