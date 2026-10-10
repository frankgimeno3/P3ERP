import {getLiquidacionFile} from '@/server/features/proveedor/LiquidacionesRepository.js';
import {adminError} from '@/server/features/proveedor/SupplierAdminRepository.js';
export const runtime='nodejs';
export async function GET(_r,{params}){try{return await getLiquidacionFile((await params).id);}catch(e){return adminError(e);}}
