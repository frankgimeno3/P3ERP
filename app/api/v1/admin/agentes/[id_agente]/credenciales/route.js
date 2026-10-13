import {getPgPool} from '@/server/database/pgClient.js';
import {getAllUsers,updateUser} from '@/server/features/user/UserSerivce.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const error=(message,status)=>Object.assign(new Error(message),{status});
async function linkedUsers(request,params){
 if(request.headers.get('x-p3-actor-role')!=='superadmin')throw error('Solo Superadmin puede modificar contraseñas.',403);
 const id=(await params).id_agente;
 const agent=(await getPgPool().query('SELECT email_agente,cognito_emails FROM agentes_db WHERE id_agente=$1',[id])).rows[0];
 if(!agent)throw error('Agente no encontrado.',404);
 const emails=new Set([agent.email_agente,...(Array.isArray(agent.cognito_emails)?agent.cognito_emails:[])].filter(Boolean).map(e=>e.trim().toLowerCase()));
 return (await getAllUsers()).flatMap(u=>{const a=Object.fromEntries((u.Attributes||[]).map(a=>[a.Name,a.Value]));return emails.has(String(a.email||u.Username).toLowerCase())?[{username:u.Username,email:a.email||u.Username,enabled:u.Enabled}]:[];});
}
export async function GET(request,{params}){try{return Response.json({cuentas:await linkedUsers(request,params)});}catch(e){return Response.json({message:e.status?e.message:'No se pudieron comprobar las cuentas de Cognito.'},{status:e.status||503});}}
export async function PUT(request,{params}){try{
 const users=await linkedUsers(request,params),body=await request.json();
 if(!users.some(u=>u.username===body.username))throw error('Selecciona una cuenta de Cognito vinculada a este agente.',422);
 if(typeof body.password!=='string'||body.password.length<9||body.password.length>256)throw error('La contraseña debe tener entre 9 y 256 caracteres.',422);
 await updateUser({username:body.username,password:body.password});return Response.json({message:'Contraseña actualizada en Cognito.'});
 }catch(e){return Response.json({message:e.status?e.message:e.name==='InvalidPasswordException'?'Cognito exige una contraseña más fuerte: comprueba mayúsculas, minúsculas, números y símbolos.':'No se pudo actualizar la contraseña en Cognito.'},{status:e.status||(e.name==='InvalidPasswordException'?422:503)});}}
