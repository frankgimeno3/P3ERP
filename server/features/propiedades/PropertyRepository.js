import {randomUUID} from 'node:crypto';
import {getPgPool} from '../../database/pgClient.js';
import {insertRecurringCharge} from '../prevision/RecurringChargeRepository.js';

export class PropertyError extends Error {
 constructor(message,status=400){super(message);this.status=status;}
}
const fail=(message,status=400)=>{throw new PropertyError(message,status);};
const text=(value,max,label)=>{
 if(value!=null&&typeof value!=='string')fail(`Revisa ${label}.`);
 const result=(value??'').trim();
 if(result.length>max)fail(`${label}: máximo ${max} caracteres.`);
 return result;
};
export function validateProperty(body){
 if(!body||!['parking','vehiculo','otros'].includes(body.tipo))fail('Selecciona parking, vehículo u otros.');
 const nombre=text(body.nombre,200,'el nombre');
 if(!nombre)fail('El nombre es obligatorio.');
 if(body.activo!==undefined&&typeof body.activo!=='boolean')fail('Revisa el estado de la propiedad.');
 return {tipo:body.tipo,nombre,identificador:text(body.identificador,100,'el identificador'),direccion:text(body.direccion,500,'la dirección'),conjunto:text(body.conjunto,200,'el parking o conjunto'),plaza:text(body.plaza,100,'la plaza'),direccion_catastral:text(body.direccion_catastral,500,'la dirección catastral'),referencia_catastral:text(body.referencia_catastral,100,'la referencia catastral').toUpperCase(),marca:text(body.marca,100,'la marca'),modelo:text(body.modelo,100,'el modelo'),notas:text(body.notas,10000,'las notas'),activo:body.activo!==false};
}
export async function propertyTransaction(callback,pool=getPgPool()){
 const db=await pool.connect();
 try{
  await db.query('BEGIN');
  await db.query("SET LOCAL lock_timeout='3s'");
  // Mismo orden de bloqueo que la edición y asociación de cargos bancarios.
  await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
  const result=await callback(db);
  await db.query('COMMIT');return result;
 }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
export async function lockProperty(db,id,version){
 const property=(await db.query('SELECT * FROM direccion_propiedades WHERE id_propiedad=$1 FOR UPDATE',[id])).rows[0];
 if(!property)fail('Propiedad no encontrada.',404);
 if(version!==undefined&&(!version||!Number.isFinite(new Date(version).getTime())||new Date(version).getTime()!==new Date(property.updated_at).getTime()))fail('La propiedad ha cambiado. Recarga antes de guardar.',409);
 return property;
}
export async function insertProperty(db,body){
 const value=validateProperty(body),fields=Object.keys(value);
 return (await db.query(`INSERT INTO direccion_propiedades(id_propiedad,${fields.join(',')}) VALUES($1,${fields.map((_,i)=>'$'+(i+2)).join(',')}) RETURNING *`,['prop_'+randomUUID(),...Object.values(value)])).rows[0];
}
export async function editProperty(db,id,body){
 if(!body.expectedVersion)fail('Recarga la propiedad antes de guardar.',409);
 await lockProperty(db,id,body.expectedVersion);
 const value=validateProperty(body),fields=Object.keys(value);
 return (await db.query(`UPDATE direccion_propiedades SET ${fields.map((key,i)=>`${key}=$${i+2}`).join(',')},updated_at=clock_timestamp() WHERE id_propiedad=$1 RETURNING *`,[id,...Object.values(value)])).rows[0];
}
export const saveProperty=(id,body)=>propertyTransaction(db=>id?editProperty(db,id,body):insertProperty(db,body));

export async function associatePropertyCharge(db,id,body){
 const property=await lockProperty(db,id,body.expectedVersion);
 if(!property.activo)fail('Activa la propiedad antes de asociar cargos.',409);
 const estado=body.estado??'vigente';
 if(!['vigente','historico'].includes(estado))fail('Selecciona un vínculo vigente o histórico.');
 const notas=text(body.notas,10000,'las notas del vínculo');
 let charge;
 if(body.id_cargo_recurrente){
  if(!/^\d+$/.test(String(body.id_cargo_recurrente)))fail('Selecciona un cargo válido.');
  charge=(await db.query('SELECT * FROM tesoreria_cargos_recurrentes WHERE id_cargo_recurrente=$1 FOR SHARE',[body.id_cargo_recurrente])).rows[0];
  if(!charge)fail('Cargo previsto no encontrado.',404);
 }else{
  if(!['proveedor','otro'].includes(body.tipo_cargo))fail('La propiedad admite cargos de proveedor u otros.');
  charge=await insertRecurringCharge(db,body);
 }
 if(charge.tipo_cargo==='nomina')fail('Una nómina no es un cargo de una propiedad.');
 if(estado==='vigente'&&!charge.activo)fail('El cargo está inactivo; puedes asociarlo como histórico.',409);
 const rule=text(body.id_regla,200,'la regla del cargo');
 if(rule&&!charge.programacion.some(r=>r.id_regla===rule))fail('La regla no pertenece al cargo previsto.');
 await db.query(`INSERT INTO direccion_propiedades_cargos(id_propiedad,id_cargo_recurrente,estado,notas,id_regla) VALUES($1,$2,$3,$4,$5)
  ON CONFLICT(id_propiedad,id_cargo_recurrente) DO UPDATE SET estado=EXCLUDED.estado,notas=EXCLUDED.notas,id_regla=EXCLUDED.id_regla,updated_at=clock_timestamp()
  WHERE (direccion_propiedades_cargos.estado,direccion_propiedades_cargos.notas,direccion_propiedades_cargos.id_regla) IS DISTINCT FROM (EXCLUDED.estado,EXCLUDED.notas,EXCLUDED.id_regla)`,[id,charge.id_cargo_recurrente,estado,notas,rule]);
 await db.query('UPDATE direccion_propiedades SET updated_at=clock_timestamp() WHERE id_propiedad=$1',[id]);
 return charge;
}
export async function detachPropertyCharge(db,id,chargeId,version){
 if(!version)fail('Recarga la propiedad antes de desvincular.',409);
 await lockProperty(db,id,version);
 if(!/^\d+$/.test(String(chargeId)))fail('Selecciona un cargo válido.');
 if(!(await db.query('DELETE FROM direccion_propiedades_cargos WHERE id_propiedad=$1 AND id_cargo_recurrente=$2',[id,chargeId])).rowCount)fail('El vínculo ya no existe.',404);
 await db.query('UPDATE direccion_propiedades SET updated_at=clock_timestamp() WHERE id_propiedad=$1',[id]);
 return {ok:true};
}
export async function associatePropertyMovement(db,id,body){
 await lockProperty(db,id,body.expectedVersion);
 if(!['cargo','devolucion','historico','otro'].includes(body.relacion))fail('Revisa la relación bancaria.');
 const movement=(await db.query('SELECT importe FROM tesoreria_movimientos_bancarios WHERE id_linea_banco=$1 FOR SHARE',[body.id_linea_banco])).rows[0];
 if(!movement)fail('Movimiento no encontrado.',404);
 if(body.relacion==='devolucion'&&Number(movement.importe)<=0)fail('La devolución debe ser un abono.');
 if(body.relacion==='cargo'&&Number(movement.importe)>=0)fail('El cargo debe ser un adeudo.');
 await db.query(`INSERT INTO direccion_propiedades_movimientos(id_propiedad,id_linea_banco,relacion,notas) VALUES($1,$2,$3,$4)
  ON CONFLICT(id_propiedad,id_linea_banco) DO UPDATE SET relacion=EXCLUDED.relacion,notas=EXCLUDED.notas,updated_at=clock_timestamp()
  WHERE (direccion_propiedades_movimientos.relacion,direccion_propiedades_movimientos.notas) IS DISTINCT FROM (EXCLUDED.relacion,EXCLUDED.notas)`,[id,body.id_linea_banco,body.relacion,text(body.notas,10000,'las notas bancarias')]);
 await db.query('UPDATE direccion_propiedades SET updated_at=clock_timestamp() WHERE id_propiedad=$1',[id]);
}
export async function listProperties(db=getPgPool()){
 return (await db.query(`SELECT p.*, (SELECT count(*)::int FROM direccion_propiedades_cargos l JOIN tesoreria_cargos_recurrentes c USING(id_cargo_recurrente)
  WHERE l.id_propiedad=p.id_propiedad AND l.estado='vigente' AND c.activo) cargos_vigentes
  FROM direccion_propiedades p ORDER BY p.activo DESC,p.tipo,lower(p.nombre),p.id_propiedad`)).rows;
}
export async function propertyOptions(db=getPgPool()){
 const cargos=(await db.query(`SELECT c.id_cargo_recurrente,c.activo,c.tipo_cargo,c.programacion,p.nombre_proveedor
  FROM tesoreria_cargos_recurrentes c LEFT JOIN administracion_proveedores p USING(id_proveedor)
  WHERE c.tipo_cargo IN ('proveedor','otro') ORDER BY c.activo DESC,c.id_cargo_recurrente`)).rows;
 const proveedores=(await db.query('SELECT id_proveedor,nombre_proveedor FROM administracion_proveedores ORDER BY lower(nombre_proveedor)')).rows;
 return {cargos,proveedores};
}
export async function getProperty(id,db=getPgPool()){
 const propiedad=(await db.query('SELECT * FROM direccion_propiedades WHERE id_propiedad=$1',[id])).rows[0];
 if(!propiedad)fail('Propiedad no encontrada.',404);
 const cargos=(await db.query(`SELECT l.*,c.tipo_cargo,c.tipo_programacion,
  CASE WHEN l.id_regla='' THEN c.programacion ELSE (SELECT jsonb_agg(r) FROM jsonb_array_elements(c.programacion) r WHERE r->>'id_regla'=l.id_regla) END programacion,
  c.activo,c.banco_pago,c.termina_planificacion,p.nombre_proveedor,
  (SELECT count(*)::int FROM direccion_propiedades_cargos s WHERE s.id_cargo_recurrente=c.id_cargo_recurrente AND s.estado='vigente') propiedades_vinculadas
  FROM direccion_propiedades_cargos l JOIN tesoreria_cargos_recurrentes c USING(id_cargo_recurrente)
  LEFT JOIN administracion_proveedores p USING(id_proveedor) WHERE l.id_propiedad=$1 ORDER BY l.estado DESC,c.id_cargo_recurrente`,[id])).rows;
 // También muestra futuros movimientos asociados al cargo; los explícitos conservan su relación histórica.
 const movimientos=(await db.query(`SELECT m.id_linea_banco,m.banco,m.fecha_operativa,m.fecha_valor,m.concepto,m.importe,m.estado_revision,
  COALESCE(l.relacion,'cargo') relacion,COALESCE(l.notas,'') notas
  FROM tesoreria_movimientos_bancarios m LEFT JOIN direccion_propiedades_movimientos l ON l.id_linea_banco=m.id_linea_banco AND l.id_propiedad=$1
  WHERE l.id_propiedad IS NOT NULL OR EXISTS(SELECT 1 FROM direccion_propiedades_cargos c WHERE c.id_propiedad=$1 AND c.id_cargo_recurrente=m.id_cargo_recurrente)
  ORDER BY p3_income_date(m.fecha_operativa) DESC,m.id_linea_banco`,[id])).rows;
 return {propiedad,cargos,movimientos};
}
