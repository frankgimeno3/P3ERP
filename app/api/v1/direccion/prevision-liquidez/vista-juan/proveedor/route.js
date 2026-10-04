import {getProveedores} from '../../../../../../../server/features/proveedor/ProveedorRepository.js';
import {createSupplier,updateSupplier,adminError} from '../../../../../../../server/features/proveedor/SupplierAdminRepository.js';
import {associateJuanProvider} from '../../../../../../../server/features/prevision/JuanProviderRepository.js';
export const runtime='nodejs';
export async function GET(){try{return Response.json(await getProveedores());}catch(error){return adminError(error);}}
export async function POST(request){try{const body=await request.json();return Response.json(body.action==='associate'?await associateJuanProvider(body):await createSupplier(body.provider));}catch(error){return adminError(error);}}
export async function PATCH(request){try{const body=await request.json();return Response.json(await updateSupplier(body.providerId,body.provider));}catch(error){return adminError(error);}}
