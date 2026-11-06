import {NextResponse} from 'next/server';
import {getRepositoryContents,getRepositoryMaterials,getContentServiceGroups,getPendingMagazineContents} from '@/server/features/produccion/ProductionRepository.js';
export const runtime='nodejs';
export async function GET(request) {
 try {
  const params=new URL(request.url).searchParams;
  if(params.get('tipo')==='grupos')return NextResponse.json(await getContentServiceGroups());
  if(params.get('tipo')==='pendientes-revista')return NextResponse.json(await getPendingMagazineContents());
  return NextResponse.json(params.get('tipo')==='materiales'?await getRepositoryMaterials(params.get('contenido')||''):await getRepositoryContents());
 } catch(error) {return NextResponse.json({message:error.message},{status:500});}
}
