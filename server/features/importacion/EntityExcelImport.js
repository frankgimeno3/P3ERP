import { createHash } from 'node:crypto';
import { getPgPool } from '../../database/pgClient.js';
export const entityImportFields = {
  cuentas: ['id_cuenta','nombre_empresa','nombre_fiscal','pais_cuenta','website','id_edisoft','correo_principal','vat_code','cif','mail_contabilidad','direccion_facturacion','poblacion_facturacion','cp_facturacion','pais_facturacion','descripcion_cuenta'],
  contactos: ['id_contacto','id_cuenta','nombre_contacto','apellidos_contacto','nombre_completo_contacto','email_contacto','telefono_contacto','cargo_contacto','pais_contacto','nombre_empresa','idiomas','otros_datos_interes'],
};
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail = (message,status=400) => { throw Object.assign(new Error(message),{status}); };
export async function importEntityExcel({entity,rows,mode='mantener',action='preview',fingerprint},pool=getPgPool()) {
  const fields=entityImportFields[entity];if(!fields)fail('Tipo de importación no válido.');
  if(!['mantener','sustituir_todo','sustituir_blanco_manteniendo','sustituir_blanco_borrando'].includes(mode))fail('Selecciona cómo tratar las coincidencias.');
  if(!Array.isArray(rows)||!rows.length||rows.length>2000)fail('Importa entre 1 y 2.000 filas por operación.');
  const table=entity==='cuentas'?'comercial_cuentas':'comercial_contactos',idField=fields[0],db=await pool.connect();
  try {
    await db.query('BEGIN');await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`excel-import:${entity}`]);
    const payloadHash=digest({entity,mode,rows});
    if(action==='apply'&&fingerprint){const prior=(await db.query('SELECT payload_hash,result FROM operaciones_importaciones_aplicadas WHERE fingerprint=$1',[fingerprint])).rows[0];if(prior){if(prior.payload_hash!==payloadHash)fail('La revisión pertenece a otros datos.',409);await db.query('COMMIT');return prior.result;}}
    const normalized=rows.map(row=>Object.fromEntries(fields.filter(key=>Object.hasOwn(row,key)).map(key=>[key,String(row[key]??'').trim()])));
    const ids=new Set();
    for(const row of normalized){
      if(!row[idField])fail(`Cada fila debe tener ${idField}. No se crean identidades por nombre.`);
      if(ids.has(row[idField]))fail(`La identidad ${row[idField]} aparece varias veces en el archivo.`);ids.add(row[idField]);
      if(entity==='cuentas'&&!row.nombre_empresa)fail(`Falta el nombre de la cuenta ${row[idField]}.`);
      if(entity==='contactos'&&(!row.nombre_contacto||!row.email_contacto||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email_contacto)))fail(`Revisa nombre y email del contacto ${row[idField]}.`);
      if(entity==='contactos'&&row.id_cuenta&&!(await db.query('SELECT 1 FROM comercial_cuentas WHERE id_cuenta=$1',[row.id_cuenta])).rowCount)fail(`La cuenta ${row.id_cuenta} no existe.`);
    }
    const existing=(await db.query(`SELECT * FROM ${table} WHERE ${idField}=ANY($1::text[]) FOR UPDATE`,[[...ids]])).rows;
    const plan=normalized.map((input,index)=>{const before=existing.find(x=>x[idField]===input[idField]);const row={...input};
      if(before&&mode.startsWith('sustituir_blanco'))for(const key of Object.keys(row))if(String(before[key]??'').trim() && !(mode==='sustituir_blanco_borrando'&&row[key]===''))row[key]=String(before[key]);
      const changes=Object.keys(row).filter(key=>String(before?.[key]??'')!==row[key]);return {line:index+2,id:row[idField],operation:!before?'crear':mode==='mantener'?'omitir':changes.length?'actualizar':'sin cambios',changes,before:before?Object.fromEntries(Object.keys(row).map(key=>[key,before[key]??null])):null,after:row};});
    const token=digest({entity,mode,plan});
    if(action==='apply'){
      if(token!==fingerprint)fail('Los datos han cambiado desde la revisión. Vuelve a revisar las diferencias.',409);
      for(const item of plan){const row=item.after,keys=Object.keys(row),values=keys.map(key=>row[key]);
        if(item.operation==='crear')await db.query(`INSERT INTO ${table}(${keys.join(',')}) VALUES(${keys.map((_,i)=>`$${i+1}`).join(',')})`,values);
        if(item.operation==='actualizar'){const update=keys.filter(key=>key!==idField);await db.query(`UPDATE ${table} SET ${update.map((key,i)=>`${key}=$${i+1}`).join(',')},updated_at=now() WHERE ${idField}=$${update.length+1}`,[...update.map(key=>row[key]),item.id]);}
      }
      if(entity==='contactos'){
        const affected=[...new Set([...existing.map(row=>row.id_cuenta),...normalized.map(row=>row.id_cuenta)].filter(Boolean))];
        for(const id of affected)await db.query("UPDATE comercial_cuentas c SET array_contactos_cuenta=COALESCE((SELECT jsonb_agg(jsonb_build_object('id_contacto',p.id_contacto) ORDER BY p.id_contacto) FROM comercial_contactos p WHERE p.id_cuenta=c.id_cuenta),'[]'::jsonb),datos_comerciales=CASE WHEN NOT EXISTS(SELECT 1 FROM comercial_contactos p WHERE p.id_cuenta=c.id_cuenta AND p.id_contacto=c.datos_comerciales->>'contacto_principal') THEN c.datos_comerciales-'contacto_principal' ELSE c.datos_comerciales END,updated_at=now() WHERE id_cuenta=$1",[id]);
      }
    }else if(action!=='preview')fail('Operación no válida.');
    const result={plan,fingerprint:token,applied:action==='apply'};
    if(action==='apply')await db.query('INSERT INTO operaciones_importaciones_aplicadas(fingerprint,payload_hash,result) VALUES($1,$2,$3::jsonb)',[token,payloadHash,JSON.stringify(result)]);
    await db.query('COMMIT');return result;
  }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
