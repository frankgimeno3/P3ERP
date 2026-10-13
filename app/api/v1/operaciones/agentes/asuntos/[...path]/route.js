import * as laboral from '@/app/api/v1/direccion/laboral/[...path]/route.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function handle(request,context){
 const params=await context.params;
 const [kind,id,child,childId]=params.path;
 const employee=kind==='empleados'&&((!id&&request.method==='GET')||(id&&!child&&request.method==='GET')||(id&&child==='libres'&&!childId&&request.method==='PUT')||(id&&['ausencias','comentarios','documentos'].includes(child)));
 const advance=kind==='anticipos'&&params.path.length<=2&&['GET','POST','PUT'].includes(request.method);
 if(!employee&&!advance)return Response.json({message:'Asunto no disponible.'},{status:404});
 if(advance&&request.method!=='GET'){
  const body=await request.clone().json();
  if(!body.fecha_prevista||!body.banco_pago)return Response.json({message:'Indica la fecha prevista y el banco del anticipo.'},{status:422});
 }
 return laboral[request.method](request,{params:Promise.resolve(params)});
}
export const GET=handle;
export const POST=handle;
export const PUT=handle;
export const DELETE=handle;
