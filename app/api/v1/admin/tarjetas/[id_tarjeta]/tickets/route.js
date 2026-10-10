import {resolveIdentifier} from '@/server/features/identifiers/IdentifierAliases.js';
import { associateCardTicket } from '@/server/features/proveedor/CardSettlementRepository.js';
import { adminError } from '@/server/features/proveedor/SupplierAdminRepository.js';
export const runtime='nodejs';
export async function POST(request,{params}){try{return Response.json(await associateCardTicket(await resolveIdentifier('tarjeta',(await params).id_tarjeta),await request.json()));}catch(e){return adminError(e);}}
