import { deleteTarjeta, saveTarjeta } from '@/server/features/proveedor/TarjetaRepository.js';
import { adminError } from '@/server/features/proveedor/SupplierAdminRepository.js';
export const runtime = 'nodejs';
export async function PUT(request,{params}) { try { return Response.json(await saveTarjeta((await params).id_tarjeta,await request.json())); } catch (error) { return adminError(error); } }
export async function DELETE(_request,{params}) { try { return Response.json(await deleteTarjeta((await params).id_tarjeta)); } catch (error) { return adminError(error); } }
