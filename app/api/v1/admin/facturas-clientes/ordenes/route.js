import {NextResponse} from 'next/server';
import {getEligibleOrders} from '../../../../../../server/features/factura/FacturaClienteRepository.js';
export const runtime='nodejs';
export async function GET(){try{return NextResponse.json(await getEligibleOrders());}catch(error){return NextResponse.json({message:'No se pudieron cargar las órdenes pendientes',detail:error.message},{status:500});}}
