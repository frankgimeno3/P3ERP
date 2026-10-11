import {getPgPool} from '../../database/pgClient.js';
import {getFolderIdByPath} from './MediatecaRepository.js';
export const mediatecaRoles=['base','comercial','administracion','operaciones','direccion','superadmin'];
const protectedRoles={documentos_direccion:['direccion','superadmin'],documentos_administracion:['administracion','operaciones','direccion','superadmin'],contratos_firmados:['comercial','administracion','operaciones','direccion','superadmin']};
const role=value=>String(value||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');
export function folderAccess(rows){
 const byId=new Map(rows.map(r=>[r.mediateca_folder_id,r])),cache=new Map();
 function resolve(id,visited=new Set()){
  if(!id)return mediatecaRoles;
  if(cache.has(id))return cache.get(id);
  const row=byId.get(id);if(!row||visited.has(id))return ['superadmin'];
  const parent=resolve(row.mediateca_parent_folder_id,new Set([...visited,id]));
  let configured=Array.isArray(row.allowed_roles)?row.allowed_roles.map(role):[];
  if(!configured.length&&!row.mediateca_parent_folder_id)configured=protectedRoles[row.mediateca_folder_name]||[];
  const effective=[...new Set([...parent.filter(r=>!configured.length||configured.includes(r)),'superadmin'])];
  cache.set(id,effective);return effective;
 }
 return {roles:resolve,rows:byId};
}
export async function mediatecaAccess(db=getPgPool()){
 return folderAccess((await db.query('SELECT mediateca_folder_id,mediateca_parent_folder_id,mediateca_folder_name,allowed_roles FROM mediateca_carpetas')).rows);
}
export function requestMediatecaRole(request){
 const value=role(request.headers.get('x-p3-actor-role'));
 if(!request.headers.get('x-p3-actor-id')||!mediatecaRoles.includes(value))throw Object.assign(new Error('No autenticado.'),{status:401});
 return value;
}
export async function assertMediatecaAccess(request,{folderId,path,mediaId}={},db=getPgPool()){
 const actor=requestMediatecaRole(request),access=await mediatecaAccess(db);
 if(mediaId){
  const media=(await db.query('SELECT mediateca_folder_id FROM mediateca_archivos WHERE mediateca_content_id=$1',[mediaId])).rows[0];
  if(!media)throw Object.assign(new Error('Archivo no encontrado.'),{status:404});folderId=media.mediateca_folder_id;
 }
 if(path){folderId=await getFolderIdByPath(path);if(!folderId)throw Object.assign(new Error('Carpeta no encontrada.'),{status:404});}
 if(folderId&&!access.rows.has(folderId))throw Object.assign(new Error('Carpeta no encontrada.'),{status:404});
 if(!access.roles(folderId).includes(actor))throw Object.assign(new Error('No tienes acceso a esta carpeta.'),{status:403});
 return {folderId,roles:access.roles(folderId),access,actor};
}
export async function guardMediatecaRequest(request){
 const url=new URL(request.url),path=url.pathname;
 if(path.endsWith('/access'))return;
 const actor=requestMediatecaRole(request);
 if(path.includes('/papelera')){
  if(request.method==='POST'){
   const row=(await getPgPool().query('SELECT folders,media FROM mediateca_papelera WHERE id=$1 AND restored_at IS NULL',[(await request.clone().json()).id])).rows[0];
   if(row&&!await canAccessTrash(row,actor))throw Object.assign(new Error('No tienes acceso a esta eliminación.'),{status:403});
  }
  return;
 }
 const media=path.match(/\/media\/([^/]+)$/),folder=path.match(/\/folders\/([^/]+)$/);
 if(media&&media[1]!=='presign')await assertMediatecaAccess(request,{mediaId:decodeURIComponent(media[1])});
 else if(folder&&folder[1]!=='by-path'){
  const {folderId,access}=await assertMediatecaAccess(request,{folderId:decodeURIComponent(folder[1])});
  if(request.method==='DELETE'){
   const descendants=new Set([folderId]);let changed=true;
   while(changed){changed=false;for(const [id,row] of access.rows)if(descendants.has(row.mediateca_parent_folder_id)&&!descendants.has(id)){descendants.add(id);changed=true;}}
   if([...descendants].some(id=>!access.roles(id).includes(actor)))throw Object.assign(new Error('La carpeta contiene subcarpetas a las que no tienes acceso.'),{status:403});
  }
 }
 else await assertMediatecaAccess(request,{folderId:url.searchParams.get('folderId'),path:url.searchParams.get('path')||url.searchParams.get('folderPath')});
 if(['POST','PATCH'].includes(request.method)){
  const body=await request.clone().json();
  if(body.folderId||body.folderPath||body.path)await assertMediatecaAccess(request,{folderId:body.folderId,path:body.folderPath||body.path});
  if(body.prefix){
   const prefix=String(body.prefix).replace(/^mediateca\//,'').replace(/\/$/,'');
   await assertMediatecaAccess(request,{path:prefix});
  }
 }
}
export async function canAccessTrash(row,actor,db=getPgPool()){
 const existing=(await db.query('SELECT * FROM mediateca_carpetas')).rows;
 const combined=new Map(existing.map(r=>[r.mediateca_folder_id,r]));for(const archived of row.folders||[])combined.set(archived.mediateca_folder_id,archived);
 const access=folderAccess([...combined.values()]);
 return [...(row.folders||[]).map(r=>r.mediateca_folder_id),...(row.media||[]).map(r=>r.mediateca_folder_id)].every(id=>access.roles(id).includes(actor));
}
