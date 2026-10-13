import {getContenidosProduccion} from '@/server/features/contenido/ContenidoRepository.js';
export const runtime='nodejs';
export async function GET(request,{params}) {
  const {id_cuenta}=await params;
  const query=new URL(request.url).searchParams;
  try{return Response.json(await getContenidosProduccion({id_cuenta,estado:query.get('estado')||'',tipo_valor:query.get('tipo_valor')||''}));}
  catch{return Response.json({message:'No se pudieron cargar los contenidos de la cuenta.'},{status:500});}
}
