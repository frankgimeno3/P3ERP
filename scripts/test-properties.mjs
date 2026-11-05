// Fixtures reales en transacción: todas las escrituras y sus eventos se revierten.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {withUserEventContext} from '../server/features/userEvents/EventContext.js';
import {validateProperty,insertProperty,editProperty,associatePropertyCharge,detachPropertyCharge,associatePropertyMovement,getProperty} from '../server/features/propiedades/PropertyRepository.js';

env.loadEnvConfig(process.cwd());
assert.throws(()=>validateProperty({tipo:'casa',nombre:'Prueba'}),/Selecciona/);
assert.throws(()=>validateProperty({tipo:'parking',nombre:' '}),/obligatorio/);
assert.throws(()=>validateProperty({tipo:'vehiculo',nombre:'Prueba',activo:'no'}),/estado/);
const pool=getPgPool(),db=await pool.connect(),requestId=randomUUID();
let propertyId;
const context={actorId:'test-propiedades',actorName:'Prueba transaccional',requestId,route:'/test/propiedades',method:'POST',enabled:true,ip:null,ipSource:'prueba'};
try{
 await withUserEventContext(context,async()=>{
  await db.query('BEGIN');
  await db.query("SET LOCAL lock_timeout='3s'");
  await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
  const property=await insertProperty(db,{tipo:'parking',nombre:'Prueba transaccional',identificador:'test-'+randomUUID(),conjunto:'Parking de prueba',plaza:'A23',direccion:'Entrada del parking',direccion_catastral:'Dirección del IBI'});propertyId=property.id_propiedad;
  let detail=await getProperty(propertyId,db);assert.equal(detail.cargos.length,0);assert.equal(detail.propiedad.plaza,'A23');assert.equal(detail.propiedad.conjunto,'Parking de prueba');assert.notEqual(detail.propiedad.direccion,detail.propiedad.direccion_catastral);
  const firstVersion=detail.propiedad.updated_at;
  await editProperty(db,propertyId,{...detail.propiedad,nombre:'Plaza actualizada',expectedVersion:firstVersion});
  await assert.rejects(editProperty(db,propertyId,{...property,expectedVersion:firstVersion}),e=>e.status===409,'La versión obsoleta no puede sobrescribir cambios');
  detail=await getProperty(propertyId,db);
  const charge=await associatePropertyCharge(db,propertyId,{tipo_cargo:'otro',tipo_programacion:'periodicidad',programacion:[{cada:12,unidad:'meses',inicio_dia:20,inicio_mes:10,inicio_anio:2026,total_iva:20,base_imponible:20,contains_iva:false,descripcion:'Cargo de prueba'}],expectedVersion:detail.propiedad.updated_at});
  detail=await getProperty(propertyId,db);
  await associatePropertyCharge(db,propertyId,{id_cargo_recurrente:charge.id_cargo_recurrente,id_regla:charge.programacion[0].id_regla,expectedVersion:detail.propiedad.updated_at});
  await assert.rejects(associatePropertyCharge(db,propertyId,{id_cargo_recurrente:charge.id_cargo_recurrente,id_regla:'ajena'}),/regla/);
  await db.query('SAVEPOINT rule_guard');
  await assert.rejects(db.query("UPDATE tesoreria_cargos_recurrentes SET programacion='[]'::jsonb WHERE id_cargo_recurrente=$1",[charge.id_cargo_recurrente]),/Desvincula/);
  await db.query('ROLLBACK TO SAVEPOINT rule_guard');
  await db.query('SAVEPOINT duplicate');
  await assert.rejects(insertProperty(db,{tipo:'parking',nombre:'Duplicada',identificador:property.identificador.toUpperCase()}),e=>e.code==='23505');
  await db.query('ROLLBACK TO SAVEPOINT duplicate');
  const bank=(await db.query('SELECT id_linea_banco FROM tesoreria_movimientos_bancarios WHERE importe<0 LIMIT 1')).rows[0];
  assert(bank,'Se necesita un movimiento de extracto para comprobar la relación');
  await associatePropertyMovement(db,propertyId,{...bank,relacion:'historico',notas:'Solo vínculo de prueba, no modifica el movimiento.'});
  detail=await getProperty(propertyId,db);assert.equal(detail.movimientos.length,1);assert.equal(detail.cargos.length,1);
  await detachPropertyCharge(db,propertyId,charge.id_cargo_recurrente,detail.propiedad.updated_at);
  assert.equal((await db.query('SELECT 1 FROM tesoreria_cargos_recurrentes WHERE id_cargo_recurrente=$1',[charge.id_cargo_recurrente])).rowCount,1,'Desvincular conserva el cargo');
  await associatePropertyCharge(db,propertyId,{id_cargo_recurrente:charge.id_cargo_recurrente});
  const edited=(await db.query("SELECT datos_anteriores,datos_nuevos FROM eventos_de_usuarios WHERE id_solicitud=$1 AND tabla='direccion_propiedades' AND tipo='editar' AND campos_modificados @> ARRAY['nombre']",[requestId])).rows[0];
  assert.equal(edited.datos_anteriores.nombre,'Prueba transaccional');assert.equal(edited.datos_nuevos.nombre,'Plaza actualizada');
  const count=(await db.query('SELECT count(*)::int n FROM eventos_de_usuarios WHERE id_solicitud=$1',[requestId])).rows[0].n;
  await getProperty(propertyId,db);
  assert.equal((await db.query('SELECT count(*)::int n FROM eventos_de_usuarios WHERE id_solicitud=$1',[requestId])).rows[0].n,count,'Las lecturas no generan eventos');
  await db.query('DELETE FROM direccion_propiedades WHERE id_propiedad=$1',[propertyId]);
  const cascades=(await db.query("SELECT tabla,datos_anteriores FROM eventos_de_usuarios WHERE id_solicitud=$1 AND tipo='borrar'",[requestId])).rows;
  for(const table of ['direccion_propiedades','direccion_propiedades_cargos','direccion_propiedades_movimientos'])assert(cascades.some(e=>e.tabla===table&&e.datos_anteriores.id_propiedad===propertyId),'Cascada auditada: '+table);
  await db.query('ROLLBACK');
 });
 assert.equal((await pool.query('SELECT 1 FROM direccion_propiedades WHERE id_propiedad=$1',[propertyId])).rowCount,0);
 assert.equal((await pool.query('SELECT 1 FROM eventos_de_usuarios WHERE id_solicitud=$1',[requestId])).rowCount,0,'Rollback incluye todos los eventos');
 console.log('PASS: propiedades, versiones, duplicados, reglas compartidas, vínculos, valores anteriores/nuevos, lecturas, cascadas y rollback.');
}finally{await db.query('ROLLBACK');db.release();await pool.end();}
