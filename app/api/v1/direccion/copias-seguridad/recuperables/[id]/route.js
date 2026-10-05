import {readBackup,backupRoot} from '@/server/features/copiasSeguridad/RecoverableBackup.js';
import {createReadStream} from 'node:fs';
import {Readable} from 'node:stream';
import path from 'node:path';
export const runtime='nodejs';
export async function GET(request,{params}){
  try{const {id}=await params,job=await readBackup(id);if(!new URL(request.url).searchParams.has('download'))return Response.json(job);
    if(job.state!=='ready')return Response.json({message:'La copia no está disponible todavía.'},{status:409});
    return new Response(Readable.toWeb(createReadStream(path.join(backupRoot(),id,'backup.tar.gz'))),{headers:{'Content-Type':'application/gzip','Content-Disposition':`attachment; filename="p3erp-${id}.tar.gz"`,'Cache-Control':'no-store','X-Checksum-SHA256':job.sha256}});
  }catch(error){return Response.json({message:'No se pudo leer la copia.'},{status:error.status||404});}
}
