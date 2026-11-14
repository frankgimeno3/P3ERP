import {getMagazineLayout,saveMagazineLayout} from '@/server/features/produccion/MagazineLayoutRepository.js';
export const runtime='nodejs';
export async function GET(request,{params}) {
  try {return Response.json(await getMagazineLayout((await params).id_revista,new URL(request.url).searchParams.get('soporte')||'impresa'),{headers:{'Cache-Control':'private, no-store'}});}
  catch(error){return Response.json({message:error.message},{status:error.status||500});}
}
export async function POST(request,{params}) {
  try{return Response.json(await saveMagazineLayout((await params).id_revista,await request.json()));}
  catch(error){return Response.json({message:error.message},{status:error.status||400});}
}
