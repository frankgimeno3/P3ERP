import {getTicket,updateTicket} from '@/server/features/proveedor/TicketDetailRepository.js';
import {adminError} from '@/server/features/proveedor/SupplierAdminRepository.js';
export const runtime='nodejs';
export async function GET(_r,{params}){try{return Response.json(await getTicket((await params).id_ticket));}catch(e){return adminError(e);}}
export async function PUT(r,{params}){try{return Response.json(await updateTicket((await params).id_ticket,await r.json()));}catch(e){return adminError(e);}}
