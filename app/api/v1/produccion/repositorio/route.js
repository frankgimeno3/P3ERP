import {NextResponse} from 'next/server';
import {getRepositoryContents,getRepositoryMaterials} from '@/server/features/produccion/ProductionRepository.js';
export const runtime='nodejs';
export async function GET(request) {
 try {
  const params=new URL(request.url).searchParams;
  return NextResponse.json(params.get('tipo')==='materiales'?await getRepositoryMaterials(params.get('contenido')||''):await getRepositoryContents());
 } catch(error) {return NextResponse.json({message:error.message},{status:500});}
}
