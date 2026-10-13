import {getPgPool} from '../../database/pgClient.js';
import {getUserEventContext} from './EventContext.js';
// For successful changes outside PostgreSQL (e.g. Cognito). Never pass a
// password, token, cookie or full SDK response: caller supplies a safe snapshot.
export async function externalUserEvent(type,entity,id,before,after){
 const context=await getUserEventContext();if(!context?.enabled)return;
 const fields=[...new Set([...Object.keys(before||{}),...Object.keys(after||{})])].filter(k=>JSON.stringify(before?.[k])!==JSON.stringify(after?.[k]));
 if(type==='editar'&&!fields.length)return;
 const changes=fields.map(k=>({campo:k,antes:before?.[k]??null,despues:after?.[k]??null}));
 const name=context.actorName||context.actorId;
 const description=`El usuario ${name} ha ${type==='crear'?'creado':type==='borrar'?'borrado':'editado'} ${entity} «${id}». `+changes.map(c=>`${c.campo}: ${JSON.stringify(c.antes)} → ${JSON.stringify(c.despues)}`).join('; ');
 await getPgPool().query(`INSERT INTO eventos_de_usuarios(id_usuario,usuario,tipo,descripcion,ip,origen_ip,tabla,clave,datos_anteriores,datos_nuevos,campos_modificados,cambios,id_solicitud,transaccion,ruta,metodo,pagina_origen)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12::jsonb,$13,txid_current(),$14,$15,$16)`,[context.actorId,name,type,description,context.ip||null,context.ipSource||'no_disponible',entity,JSON.stringify({id}),JSON.stringify(before),JSON.stringify(after),fields,JSON.stringify(changes),context.requestId,context.route,context.method,context.page||null]);
}
