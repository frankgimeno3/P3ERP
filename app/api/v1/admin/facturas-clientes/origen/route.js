import {NextResponse} from 'next/server';
import {invoiceSourcePreview} from '../../../../../../server/features/factura/InvoiceSelection.js';
export const runtime='nodejs';
export async function GET(request){
 try{const query=new URL(request.url).searchParams,source=query.get('origen'),id=query.get('id');if(!['contrato','orden'].includes(source)||!id)return NextResponse.json({message:'Selecciona un contrato o una orden.'},{status:400});
  return NextResponse.json(await invoiceSourcePreview(source,id),{headers:{'Cache-Control':'no-store'}});
 }catch(error){return NextResponse.json({message:error.message},{status:400});}
}
