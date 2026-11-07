import {NextResponse} from 'next/server';
import {productionMaterialAction} from '@/server/features/produccion/ProductionMaterialActions.js';
import {changeProductionMaterial} from '@/server/features/produccion/ProductionMaterialTrash.js';
export const runtime='nodejs';
export async function POST(request,{params}){
 try{const id=(await params).id_contenido,data=await request.json();const result=['eliminar','restaurar','editar'].includes(data.accion)?await changeProductionMaterial(id,data):await productionMaterialAction(id,data);
  return result.zip?new Response(result.zip,{headers:{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="materiales.zip"','Cache-Control':'no-store'}}):NextResponse.json(result);}
 catch(e){return NextResponse.json({message:e.message},{status:e.status||400});}
}
