import {createHash} from 'node:crypto';
import {createFolder,getFolderIdByPath,getFolderPathById,getMediaById,createMedia} from '../mediateca/MediatecaRepository.js';
import {createPresignedUpload,assertObjectExistsInS3} from '../mediateca/S3Service.js';
import {ensureMediatecaStructure} from '../mediateca/MediatecaStructure.js';
export function validateTicketDocument(file){
 const bytes=Buffer.from(file.bytes);if(!bytes.length||bytes.length>15*1024*1024)throw Error('Justificante vacío o superior a 15 MB.');
 const type=bytes.subarray(0,5).toString()==='%PDF-'?'application/pdf':bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':'';
 if(!type)throw Error('El justificante debe ser PDF, JPG o PNG.');
 return {...file,bytes,type,sha256:createHash('sha256').update(bytes).digest('hex')};
}
export async function ensureTicketFolder(ticket){
 const path=`documentos_administracion/liquidaciones/tickets/${ticket.forma_pago}/${ticket.fecha.slice(0,4)}`+(ticket.forma_pago==='tarjeta'?`/${ticket.bank.toLowerCase()}_${ticket.digits}`:'');
 await ensureMediatecaStructure();
 let parent='';for(const name of path.split('/')){const target=parent?parent+'/'+name:name;if(!await getFolderIdByPath(target))await createFolder({name,path:parent});parent=target;}
 return getFolderIdByPath(path);
}
export async function storeTicketDocument(file,folderId,code){
 const document=validateTicketDocument(file),id=ticketMediaIdentifier(code,document.sha256);
 const existing=await getMediaById(id);
 if(existing){await assertObjectExistsInS3(existing.s3Key);return {...document,id,url:existing.url,s3Key:existing.s3Key};}
 const path=await getFolderPathById(folderId);
 const upload=await createPresignedUpload({filename:document.name,contentType:document.type,prefix:'mediateca/'+path,mediaId:id});
 const result=await fetch(upload.uploadUrl,{method:'PUT',headers:{'Content-Type':document.type},body:document.bytes,signal:AbortSignal.timeout(30000)});
 if(!result.ok)throw Error('No se pudo subir '+code+' a Mediateca (HTTP '+result.status+').');
 await assertObjectExistsInS3(upload.s3Key);
 const media=await createMedia({mediaId:id,folderId,contentName:document.name,preserveName:true,s3Key:upload.s3Key,contentType:document.type});
 return {...document,id,url:media.url,s3Key:upload.s3Key};
}
export function ticketMediaIdentifier(code,sha256){
 const hex=createHash('sha256').update(code+':'+sha256).digest('hex').slice(0,32);
 return hex.slice(0,8)+'-'+hex.slice(8,12)+'-5'+hex.slice(13,16)+'-a'+hex.slice(17,20)+'-'+hex.slice(20);
}
