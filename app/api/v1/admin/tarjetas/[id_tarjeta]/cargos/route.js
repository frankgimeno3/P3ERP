import { associateCardCharge } from '@/server/features/proveedor/CardSettlementRepository.js';
import { listRecurringCharges } from '@/server/features/prevision/RecurringChargeRepository.js';
import { adminError } from '@/server/features/proveedor/SupplierAdminRepository.js';
export const runtime='nodejs';
export async function GET(){try{return Response.json((await listRecurringCharges()).filter(c=>c.tipo_cargo!=='nomina'));}catch(e){return adminError(e);}}
export async function POST(request,{params}){try{return Response.json(await associateCardCharge((await params).id_tarjeta,await request.json()));}catch(e){return adminError(e);}}
