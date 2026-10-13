import assert from 'node:assert/strict';
import {getPgPool} from '../server/database/pgClient.js';
import {getTicketFile} from '../server/features/proveedor/TicketRepository.js';
const pool=getPgPool(),original=pool.query.bind(pool);let privateSource=false,byteReads=0;
pool.query=async(sql,params=[])=>{
 if(sql.startsWith('SELECT archivo_nombre'))return {rows:[{archivo_nombre:'E.26.0052.pdf',archivo_tipo:'application/pdf',archivo_contenido:null,id_archivo_mediateca:'alias',datos_importacion:{documento_ticket_id:1}}]};
 if(sql.startsWith('SELECT id_archivo_mediateca FROM administracion_tickets'))return {rows:[{id_archivo_mediateca:'source'}]};
 if(sql.startsWith('SELECT archivo_contenido FROM administracion_tickets')){byteReads++;return {rows:[{archivo_contenido:Buffer.from('%PDF-one-copy')}]};}
 if(sql.includes('FROM mediateca_archivos'))return {rows:[{mediateca_folder_id:params[0]==='source'&&privateSource?'private':'admin'}]};
 return {rows:[{mediateca_folder_id:'admin',mediateca_parent_folder_id:null,mediateca_folder_name:'documentos_administracion',allowed_roles:[]},{mediateca_folder_id:'private',mediateca_parent_folder_id:null,mediateca_folder_name:'documentos_direccion',allowed_roles:[]}]};
};
const request=new Request('https://erp.test/api/v1/admin/tickets/2/archivo',{headers:{'x-p3-actor-id':'agent','x-p3-actor-role':'administracion'}});
try{
 assert.equal(await (await getTicketFile('2',request)).text(),'%PDF-one-copy');assert.equal(byteReads,1);
 privateSource=true;byteReads=0;await assert.rejects(()=>getTicketFile('2',request),error=>error.status===403);assert.equal(byteReads,0,'Un enlace compartido no evita los permisos del original.');
 console.log('PASS: justificante único compartido sin ampliar acceso a su carpeta original.');
}finally{pool.query=original;await pool.end();}
