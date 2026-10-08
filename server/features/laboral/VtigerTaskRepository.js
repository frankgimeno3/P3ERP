import {createHash} from 'node:crypto';
import {getPgPool} from '../../database/pgClient.js';
import {requireTaskIdentity} from './TaskAccess.js';
import {parseTaskCsv,vtigerDate,vtigerStates} from '../../../app/config/vtigerTasks.js';
const fail = message => { throw Object.assign(new Error(message),{status:400}); };
const association=(map,key)=>Object.hasOwn(map,key)&&typeof map[key]==='string'&&map[key]?map[key]:null;
export function prepareVtigerTasks(csv) {
  if (typeof csv !== 'string' || Buffer.byteLength(csv,'utf8') > 10 * 1024 * 1024) fail('Selecciona un CSV de hasta 10 MB.');
  let rows; try { rows = parseTaskCsv(csv); } catch (error) { fail(error.message); }
  const occurrences = new Map();
  return rows.map((raw,index) => {
    try {
      if (!raw.Asunto.trim() || raw.Asunto.trim().length > 250) throw new Error('El asunto debe tener entre 1 y 250 caracteres.');
      if (!Object.hasOwn(vtigerStates,raw.Estado)) throw new Error(`Estado desconocido: ${raw.Estado}`);
      const start=vtigerDate(raw['Fecha y Hora Inicio'],raw['Time Start']),end=vtigerDate(raw['Fecha y Hora Fin'],raw['End Time']);
      const warnings=[];
      if(start && raw['Fecha y Hora Inicio'].length===10 && !raw['Time Start'])warnings.push('Inicio sin hora en vtiger; se representa a las 00:00.');
      if(end && raw['Fecha y Hora Fin'].length===10 && !raw['End Time'])warnings.push('Fin sin hora en vtiger; se representa a las 00:00.');
      if (start && end && end < start && !warnings.length) throw new Error('La fecha final precede al inicio.');
      const canonical=JSON.stringify(Object.keys(raw).sort().map(key=>[key,raw[key]]));
      const hash=createHash('sha256').update(canonical).digest('hex'), occurrence=(occurrences.get(hash)||0)+1;
      occurrences.set(hash,occurrence);
      return {raw,start,end,warnings,key:`vtiger:${hash}:${occurrence}`,estado:vtigerStates[raw.Estado]};
    } catch(error) { fail(`Registro ${index+1}: ${error.message}`); }
  });
}
export async function taskImportOptions(actor) {
  requireTaskIdentity(actor,true);
  const db=getPgPool();
  const [agents,accounts]=await Promise.all([
    db.query("SELECT id_agente value,COALESCE(NULLIF(nombre_completo_agente,''),NULLIF(nombre_agente,''),id_agente) label FROM agentes_db ORDER BY label"),
    db.query('SELECT id_cuenta value,nombre_empresa label FROM comercial_cuentas ORDER BY nombre_empresa')
  ]);
  return {agents:agents.rows,accounts:accounts.rows};
}
export async function importVtigerTasks(actor,body,commit=false) {
  requireTaskIdentity(actor,true);
  const tasks=prepareVtigerTasks(body.csv),agents=body.agents||{},accounts=body.accounts||{};
  const options=await taskImportOptions(actor);
  for (const [map,valid] of [[agents,options.agents],[accounts,options.accounts]]) {
    if (!map || typeof map!=='object' || Array.isArray(map)) fail('Revisa las asociaciones.');
    for (const id of Object.values(map)) if (id && !valid.some(option=>option.value===id)) fail('Una asociación ya no existe. Revisa los agentes y cuentas.');
  }
  const db=await getPgPool().connect();
  try {
    if(commit)await db.query('BEGIN');
    const existing=new Set((await db.query('SELECT importacion_clave FROM laboral_tareas_empleado WHERE importacion_clave=ANY($1::text[])',[tasks.map(task=>task.key)])).rows.map(row=>row.importacion_clave));
    let inserted=0;
    if(commit){
      const batch=tasks.map(task=>({id:`tarea_vtiger_${task.key.slice(7)}`,nombre:task.raw.Asunto.trim(),descripcion:task.raw['Descripción'],estado:task.estado,
        agente:association(agents,task.raw['Asignado a']),id_cuenta:association(accounts,task.raw['En relación con']),fecha_inicio:task.start,fecha_fin:task.end,vtiger_original:task.raw,importacion_clave:task.key}));
      const result=await db.query(`INSERT INTO laboral_tareas_empleado(id,nombre,descripcion,estado,agente,id_cuenta,fecha_inicio,fecha_fin,vtiger_original,importacion_clave)
        SELECT id,nombre,descripcion,estado,agente,id_cuenta,fecha_inicio,fecha_fin,vtiger_original,importacion_clave
        FROM jsonb_to_recordset($1::jsonb) AS x(id text,nombre text,descripcion text,estado text,agente text,id_cuenta text,
          fecha_inicio timestamp,fecha_fin timestamp,vtiger_original jsonb,importacion_clave text)
        ON CONFLICT(importacion_clave) DO NOTHING`,[JSON.stringify(batch)]);
      inserted=result.rowCount;
    }
    if(commit)await db.query('COMMIT');
    return {total:tasks.length,existing:existing.size,new:tasks.length-existing.size,inserted,
      warnings:tasks.flatMap((task,index)=>task.warnings.map(message=>`Registro ${index+1}: ${message}`)),
      unassigned:tasks.filter(task=>!association(agents,task.raw['Asignado a'])).length,
      unlinked:tasks.filter(task=>!association(accounts,task.raw['En relación con'])).length};
  } catch(error) { if(commit)await db.query('ROLLBACK'); if(error.code==='42703')throw Object.assign(new Error('Falta aplicar la migración de tareas vtiger.'),{status:409}); throw error; }
  finally { db.release(); }
}
