import {createPresignedUpload} from '@/server/features/mediateca/S3Service.js';
import {getPgPool} from '@/server/database/pgClient.js';
import {randomUUID} from 'node:crypto';
export const runtime='nodejs';
export async function POST(request){
  try{const body=await request.json();if(body.contentType!=='application/pdf'||!Number.isSafeInteger(body.size)||body.size<=0||body.size>20*1024*1024)return Response.json({message:'Adjunta un PDF de hasta 20 MB.'},{status:400});
    const upload=await createPresignedUpload({filename:body.filename,contentType:'application/pdf',prefix:'facturas_proveedores'});
    if(!upload.cdnUrl)throw new Error('El acceso documental no está configurado.');
    const id=randomUUID();await getPgPool().query('INSERT INTO administracion_facturas_subidas(id,s3_key,url,actor) VALUES($1,$2,$3,$4)',[id,upload.s3Key,upload.cdnUrl,request.headers.get('x-p3-actor-id')||'']);
    return Response.json({...upload,uploadId:id});
  }catch(error){return Response.json({message:error.message},{status:500});}
}
