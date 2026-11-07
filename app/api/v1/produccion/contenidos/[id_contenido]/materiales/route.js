import {NextResponse} from 'next/server';
import {productionMaterialAction} from '@/server/features/produccion/ProductionMaterialActions.js';
export const runtime='nodejs';
export async function POST(request,{params}){
 try{const result=await productionMaterialAction((await params).id_contenido,await request.json());
  return result.zip?new Response(result.zip,{headers:{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="materiales.zip"','Cache-Control':'no-store'}}):NextResponse.json(result);}
 catch(e){return NextResponse.json({message:e.message},{status:e.status||400});}
}
