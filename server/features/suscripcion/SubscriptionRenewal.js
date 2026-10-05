import {getPgPool} from '../../database/pgClient.js';
import {getPropuestaById,createPropuesta} from '../propuesta/PropuestaRepository.js';
import {createHash} from 'node:crypto';
export async function renewSubscription(id,{first,last,confirm=false},actor=''){
  if(confirm){
    const lock=await getPgPool().connect();
    try{
      await lock.query("SELECT pg_advisory_lock(hashtext($1))",[`subscription-renewal:${id}`]);
      return await prepareRenewal(id,{first,last,confirm},actor);
    }finally{try{await lock.query("SELECT pg_advisory_unlock(hashtext($1))",[`subscription-renewal:${id}`]);}finally{lock.release();}}
  }
  return prepareRenewal(id,{first,last,confirm},actor);
}
async function prepareRenewal(id,{first,last,confirm},actor){
  const pool=getPgPool(),row=(await pool.query('SELECT * FROM comercial_suscripciones WHERE id_suscripcion=$1',[id])).rows[0];
  if(!row)throw Object.assign(new Error('Suscripción no encontrada.'),{status:404});
  if(!row.revista||!row.edicion)throw Object.assign(new Error('Completa la revista y edición de la suscripción.'),{status:400});
  first=Number(first);last=Number(last);
  if(!Number.isInteger(first)||!Number.isInteger(last)||first<=Number(row.num_final||0)||last<first||last-first>100)throw Object.assign(new Error('Revisa el primer y último número de renovación.'),{status:400});
  const idPropuesta=`prop_renew_${createHash('sha256').update(JSON.stringify([id,first,last])).digest('hex').slice(0,24)}`;
  const before=row.id_propuesta?await getPropuestaById(row.id_propuesta):null;
  if(row.renovacion_propuesta_id&&row.renovacion_propuesta_id!==idPropuesta){
    const existing=await getPropuestaById(row.renovacion_propuesta_id);
    if(existing&&!['rechazada','cancelada'].includes(String(existing.estado_propuesta||'').trim().toLowerCase()))throw Object.assign(new Error(`Ya existe una propuesta de renovación: ${row.renovacion_propuesta_id}. Revisa esa propuesta antes de crear otra para un periodo distinto.`),{status:409});
  }
  const title=`Renovación ${row.revista} · ${row.edicion} · ${first}–${last}`;
  const result={id_propuesta:idPropuesta,title,first,last,account:row.id_cuenta,services:before?.lineas?.length||0};
  if(!confirm)return result;
  let proposal=await getPropuestaById(idPropuesta);
  if(!proposal){
    const date=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid'}).format(new Date());
    const payload={...(before||{}),id_propuesta:idPropuesta,id_cuenta_propuesta:row.id_cuenta,id_agente_propuesta:actor||before?.id_agente_propuesta||'',estado_propuesta:'Borrador',fase_propuesta:'1',fecha_envio_propuesta:date,nombre_propuesta:title,comentarios_adicionales:`Renovación de ${id}. Números ${first}–${last}. Revisa servicios y precios antes de confirmar.`,lineas:(before?.lineas||[]).map(({id_linea_propuesta,...line})=>({...line,publicacion:`${first}–${last}`,id_publicacion:null})),cobros:[]};
    try{proposal=await createPropuesta(payload,actor);}catch(error){if(error.code!=='23505')throw error;proposal=await getPropuestaById(idPropuesta);if(!proposal)throw error;}
  }
  await pool.query('UPDATE comercial_suscripciones SET renovacion_propuesta_id=$2,updated_at=now() WHERE id_suscripcion=$1',[id,idPropuesta]);
  return {...result,created:true};
}
