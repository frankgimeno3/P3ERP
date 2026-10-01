import {NextResponse} from 'next/server';
import {getUnassignedInvoices,linkOrderToInvoice} from '../../../../../../../server/features/factura/FacturaClienteRepository.js';
import {requestActor} from '../../../../../../../server/features/comentario/AccountActivity.js';
export const runtime='nodejs';
export async function GET(request){try{const idCuenta=new URL(request.url).searchParams.get('id_cuenta');if(!idCuenta)return NextResponse.json({message:'Indica la cuenta'},{status:400});return NextResponse.json(await getUnassignedInvoices(idCuenta));}catch(error){return NextResponse.json({message:'No se pudieron cargar las facturas',detail:error.message},{status:500});}}
export async function POST(request){try{const body=await request.json();if(!body.id_orden||!body.id_factura)return NextResponse.json({message:'Indica orden y factura'},{status:400});return NextResponse.json(await linkOrderToInvoice(body.id_orden,body.id_factura,requestActor(request)));}catch(error){return NextResponse.json({message:'No se pudo vincular la factura',detail:error.message},{status:400});}}
