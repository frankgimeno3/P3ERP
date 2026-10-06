import {getPgPool} from '@/server/database/pgClient.js';
export const runtime='nodejs';
export async function GET(request,context){
  const {id_factura,id_documento}=await context.params;
  const document=(await getPgPool().query('SELECT nombre,contenido FROM administracion_facturas_documentos WHERE id_documento=$1 AND id_factura_cliente=$2',[id_documento,id_factura])).rows[0];
  if(!document)return Response.json({message:'Documento no encontrado.'},{status:404});
  return new Response(document.contenido,{headers:{'Content-Type':'application/pdf','Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(document.nombre).replaceAll("'",'%27')}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
