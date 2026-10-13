import {importPersonalStatement,personalStatementStatus} from '@/server/features/proveedor/LiquidacionesRepository.js';
import {adminError,ProveedorError} from '@/server/features/proveedor/SupplierAdminRepository.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request,{params}){try{return Response.json(await personalStatementStatus((await params).id_tarjeta,new URL(request.url).searchParams.get('mes')));}catch(e){return adminError(e);}}
export async function POST(request,{params}){try{
 if(Number(request.headers.get('content-length'))>16*1024*1024)throw new ProveedorError('Máximo 15 MB.',413);
 const form=await request.formData();return Response.json(await importPersonalStatement((await params).id_tarjeta,form.get('file'),form.get('formato'),form.get('mes'),form.get('action')==='import'));
}catch(e){return adminError(e);}}
