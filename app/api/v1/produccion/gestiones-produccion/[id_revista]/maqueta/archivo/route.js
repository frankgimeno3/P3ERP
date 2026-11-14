import {getLayoutFile} from '@/server/features/produccion/MagazineLayoutRepository.js';
export const runtime='nodejs';
export async function GET(request,{params}) {
  try {const query=new URL(request.url).searchParams;return Response.json(await getLayoutFile((await params).id_revista,query.get('soporte')||'impresa',query.get('material')),{headers:{'Cache-Control':'private, no-store'}});}
  catch(error){return Response.json({message:error.message},{status:error.status||500});}
}
