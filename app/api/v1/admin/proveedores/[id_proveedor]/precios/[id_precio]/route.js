import { saveSupplierPrice, deleteSupplierPrice, adminError } from '@/server/features/proveedor/SupplierAdminRepository.js';
export const runtime = 'nodejs';
export async function PUT(request,{params}) { try { const p=await params; return Response.json(await saveSupplierPrice(p.id_proveedor,p.id_precio,await request.json())); } catch (error) { return adminError(error); } }
export async function DELETE(_request,{params}) { try { const p=await params; return Response.json(await deleteSupplierPrice(p.id_proveedor,p.id_precio)); } catch (error) { return adminError(error); } }
