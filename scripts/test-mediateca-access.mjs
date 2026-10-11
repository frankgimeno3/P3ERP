import assert from 'node:assert/strict';
import {folderAccess,assertMediatecaAccess,guardMediatecaRequest} from '../server/features/mediateca/MediatecaAccess.js';
import {getPgPool} from '../server/database/pgClient.js';
const rows=[{mediateca_folder_id:'root',mediateca_parent_folder_id:null,allowed_roles:['direccion','superadmin']},{mediateca_folder_id:'child',mediateca_parent_folder_id:'root',allowed_roles:[]},{mediateca_folder_id:'attempt',mediateca_parent_folder_id:'root',allowed_roles:['base','direccion']},{mediateca_folder_id:'public',mediateca_parent_folder_id:null,allowed_roles:[]},{mediateca_folder_id:'private',mediateca_parent_folder_id:'public',allowed_roles:['superadmin']}];
const access=folderAccess(rows);
assert.deepEqual(access.roles('child'),['direccion','superadmin']);assert(!access.roles('attempt').includes('base'));assert(access.roles('public').includes('base'));
const db={query:async(sql)=>({rows:sql.includes('mediateca_archivos')?[{mediateca_folder_id:'child'}]:rows})};
const request=(role,path,method='GET',body)=>new Request('https://p3.test/api/v1/mediateca/'+path,{method,headers:{'x-p3-actor-id':'test','x-p3-actor-role':role},...(body?{body:JSON.stringify(body)}:{})});
await assert.rejects(()=>assertMediatecaAccess(request('base','folders'),{folderId:'child'},db),e=>e.status===403);
assert.equal((await assertMediatecaAccess(request('direccion','folders'),{folderId:'child'},db)).roles.includes('direccion'),true);
await assert.rejects(()=>assertMediatecaAccess(request('base','media/file'),{mediaId:'file'},db),e=>e.status===403);
await assert.rejects(()=>assertMediatecaAccess(new Request('https://p3.test'),{},db),e=>e.status===401);
const p=getPgPool(),original=p.query.bind(p);p.query=db.query;
try{
 await assert.rejects(()=>guardMediatecaRequest(request('base','media/file')),e=>e.status===403);
 await assert.rejects(()=>guardMediatecaRequest(request('operaciones','folders/public','DELETE')),e=>e.status===403);
 await assert.rejects(()=>guardMediatecaRequest(request('base','media','POST',{folderId:'child'})),e=>e.status===403);
 await guardMediatecaRequest(request('superadmin','media/file'));
}finally{p.query=original;await p.end();}
console.log('PASS: permisos heredados, bloqueo de ampliación, acceso directo a archivos, destino de movimientos y eliminación de carpetas con hijos privados.');
