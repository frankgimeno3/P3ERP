import {importLiquidacion} from '@/server/features/proveedor/LiquidacionesRepository.js';
import {adminError,ProveedorError} from '@/server/features/proveedor/SupplierAdminRepository.js';
export const runtime='nodejs';
export async function POST(r,{params}){try{if(Number(r.headers.get('content-length'))>16*1024*1024)throw new ProveedorError('Máximo 15 MB.',413);const f=await r.formData();return Response.json(await importLiquidacion((await params).id,f.get('file'),f.get('banco'),f.get('version'),f.get('action')==='import'));}catch(e){return adminError(e);}}
