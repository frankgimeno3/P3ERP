import { getRecurringCharge,updateRecurringCharge } from '@/server/features/prevision/RecurringChargeRepository.js';
export const runtime='nodejs';
async function handle(request,{params}) {
  try {
    const {id_proveedor,id}=await params;
    const charge=await getRecurringCharge(id);
    if(charge.id_proveedor!==id_proveedor||charge.tipo_cargo!=='proveedor')return Response.json({message:'Cargo de proveedor no encontrado.'},{status:404});
    if(request.method==='GET')return Response.json(charge);
    const body=await request.json();
    if(body.tipo_cargo!=='proveedor'||body.id_proveedor!==id_proveedor||body.id_agente||body.id_tarjeta)return Response.json({message:'El cargo debe conservar este proveedor.'},{status:400});
    return Response.json(await updateRecurringCharge(id,body,null,id_proveedor));
  }catch(error){return Response.json({message:error.status?error.message:'No se pudo guardar el cargo.'},{status:error.status||500});}
}
export const GET=handle;
export const PUT=handle;
