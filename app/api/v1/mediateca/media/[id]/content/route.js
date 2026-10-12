import {assertMediatecaAccess} from '@/server/features/mediateca/MediatecaAccess.js';
import {getMediaById} from '@/server/features/mediateca/MediatecaRepository.js';
import {createPresignedDownload} from '@/server/features/mediateca/S3Service.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request,{params}) {
  try {
    const {id}=await params;
    await assertMediatecaAccess(request,{mediaId:id});
    const media=await getMediaById(id);
    if(!media?.s3Key)return Response.json({message:'El archivo no está almacenado en S3.'},{status:404});
    const headers={};const range=request.headers.get('range');if(range)headers.Range=range;
    const source=await fetch(await createPresignedDownload(media.s3Key),{headers,cache:'no-store',signal:AbortSignal.timeout(20000)});
    if(!source.ok)return Response.json({message:'No se pudo descargar el archivo.'},{status:502});
    const responseHeaders=new Headers({'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
    for(const name of ['content-type','content-length','content-range','accept-ranges'])if(source.headers.has(name))responseHeaders.set(name,source.headers.get(name));
    if(!/^(application\/pdf|image\/(png|jpeg|gif|webp|avif))(?:;|$)/i.test(source.headers.get('content-type')||'')){
      responseHeaders.set('Content-Disposition','attachment');
      responseHeaders.set('Content-Security-Policy',"sandbox; default-src 'none'");
    }
    return new Response(source.body,{status:source.status,headers:responseHeaders});
  }catch(error){return Response.json({message:error.status?error.message:'No se pudo abrir el archivo.'},{status:error.status||503});}
}
