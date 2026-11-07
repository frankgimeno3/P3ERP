import {NextResponse} from 'next/server';
import {getRepositoryContents,getRepositoryMaterials,getContentServiceGroups,getPendingMagazineContents,getPendingOtherContents} from '@/server/features/produccion/ProductionRepository.js';
export const runtime='nodejs';
export async function GET(request) {
 try {
  const params=new URL(request.url).searchParams;
  if(params.get('tipo')==='grupos')return NextResponse.json(await getContentServiceGroups());
  if(params.get('tipo')==='pendientes-revista')return NextResponse.json(await getPendingMagazineContents());
  if(params.get('tipo')==='pendientes-otros')return NextResponse.json(await getPendingOtherContents());
  return NextResponse.json(params.get('tipo')==='materiales'?await getRepositoryMaterials(params.get('contenido')||'',params.get('papelera')==='1'):await getRepositoryContents());
 } catch(error) {return NextResponse.json({message:error.message},{status:500});}
}
