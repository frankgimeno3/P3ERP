import { getTicketFile } from '@/server/features/proveedor/TicketRepository.js';
import { adminError } from '@/server/features/proveedor/SupplierAdminRepository.js';
export const runtime = 'nodejs';
export async function GET(request,{params}) { try { return await getTicketFile((await params).id_ticket,request); } catch (error) { return adminError(error); } }
