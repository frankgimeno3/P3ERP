import {getMagazineDownload} from '@/server/features/produccion/MagazineLayoutRepository.js';
export const runtime='nodejs';
export async function GET(request,{params}) {
  try {const query=new URL(request.url).searchParams;return Response.json(await getMagazineDownload((await params).id_revista,query.get('soporte')||'impresa',query.get('revision')),{headers:{'Cache-Control':'private, no-store'}});}
  catch(error){return Response.json({message:error.message},{status:error.status||500});}
}
