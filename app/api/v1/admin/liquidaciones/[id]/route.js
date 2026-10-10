import {getLiquidacion,saveLiquidacion} from '@/server/features/proveedor/LiquidacionesRepository.js';
import {adminError} from '@/server/features/proveedor/SupplierAdminRepository.js';
import {requestActor} from '@/server/features/comentario/AccountActivity.js';
export const runtime='nodejs';
export async function GET(_r,{params}){try{return Response.json(await getLiquidacion((await params).id));}catch(e){return adminError(e);}}
export async function PUT(r,{params}){try{return Response.json(await saveLiquidacion((await params).id,await r.json(),requestActor(r)));}catch(e){return adminError(e);}}
