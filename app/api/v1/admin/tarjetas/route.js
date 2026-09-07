import { getTarjetas, saveTarjeta } from '@/server/features/proveedor/TarjetaRepository.js';
import { adminError } from '@/server/features/proveedor/SupplierAdminRepository.js';
export const runtime = 'nodejs';
export async function GET() { try { return Response.json(await getTarjetas()); } catch (error) { return adminError(error); } }
export async function POST(request) { try { return Response.json(await saveTarjeta(null,await request.json()),{status:201}); } catch (error) { return adminError(error); } }
