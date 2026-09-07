import { saveSupplierPrice, adminError } from '@/server/features/proveedor/SupplierAdminRepository.js';
export const runtime = 'nodejs';
export async function POST(request,{params}) { try { return Response.json(await saveSupplierPrice((await params).id_proveedor,null,await request.json()),{status:201}); } catch (error) { return adminError(error); } }
