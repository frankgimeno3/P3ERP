import {NextResponse} from 'next/server';
import {requestActor} from '@/server/features/comentario/AccountActivity.js';
import {applyCustomerCreditNote} from '@/server/features/factura/CreditNotes.js';
import {getCustomerInvoice} from '@/server/features/factura/FacturaClienteRepository.js';
export const runtime='nodejs';
export async function POST(request,{params}){
  try{const id=(await params).id_factura;await applyCustomerCreditNote(id,requestActor(request));return NextResponse.json(await getCustomerInvoice(id));}
  catch(error){return NextResponse.json({message:'No se pudo aplicar el abono',detail:error.message},{status:400});}
}
