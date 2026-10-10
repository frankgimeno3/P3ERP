import {resolveIdentifier} from '@/server/features/identifiers/IdentifierAliases.js';
import {getRecurringCharge,updateRecurringCharge} from '@/server/features/prevision/RecurringChargeRepository.js';
import {adminError,ProveedorError} from '@/server/features/proveedor/SupplierAdminRepository.js';
export const runtime='nodejs';
export async function GET(_request,{params}){try{const {id_tarjeta:oldCard,id_cargo}=await params;const id_tarjeta=await resolveIdentifier('tarjeta',oldCard);const charge=await getRecurringCharge(id_cargo);if(charge.id_tarjeta!==id_tarjeta)throw new ProveedorError('La suscripción no pertenece a esta tarjeta.',404);return Response.json(charge);}catch(e){return adminError(e);}}
export async function PUT(request,{params}){try{const {id_tarjeta:oldCard,id_cargo}=await params;const id_tarjeta=await resolveIdentifier('tarjeta',oldCard);return Response.json(await updateRecurringCharge(id_cargo,await request.json(),id_tarjeta));}catch(e){return adminError(e);}}
