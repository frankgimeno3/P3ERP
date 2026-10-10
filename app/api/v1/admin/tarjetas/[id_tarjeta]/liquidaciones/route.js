import {resolveIdentifier} from '@/server/features/identifiers/IdentifierAliases.js';
import {createLiquidacion} from '@/server/features/proveedor/LiquidacionesRepository.js';
import {adminError} from '@/server/features/proveedor/SupplierAdminRepository.js';
export const runtime='nodejs';
export async function POST(r,{params}){try{return Response.json(await createLiquidacion(await resolveIdentifier('tarjeta',(await params).id_tarjeta),await r.json()));}catch(e){return adminError(e);}}
