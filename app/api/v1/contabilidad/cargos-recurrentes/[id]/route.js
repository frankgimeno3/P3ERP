import { getRecurringCharge, updateRecurringCharge, deleteRecurringCharge } from '@/server/features/prevision/RecurringChargeRepository.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function handle(request,{params}) {
  try {
    const {id}=await params;
    if(!/^\d+$/.test(id))return Response.json({message:'Cargo no válido.'},{status:400});
    return Response.json(request.method==='GET'?await getRecurringCharge(id):request.method==='DELETE'?await deleteRecurringCharge(id,await request.json()):await updateRecurringCharge(id,await request.json()));
  }catch(e){return Response.json({message:e.status?e.message:'No se pudo guardar el cargo previsto.'},{status:e.status||500});}
}
export const GET=handle;
export const PUT=handle;
export const DELETE=handle;
