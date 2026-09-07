import { createTicket, getTickets } from "@/server/features/proveedor/TicketRepository.js";
import { adminError, ProveedorError } from "@/server/features/proveedor/SupplierAdminRepository.js";
export const runtime = "nodejs";
export async function GET(request) {
  try { const query = new URL(request.url).searchParams; return Response.json(await getTickets(query.get("id_proveedor") || "",query.get("ambito") || "")); }
  catch (error) { return adminError(error); }
}
export async function POST(request) {
  try {
    if (Number(request.headers.get('content-length')) > 15 * 1024 * 1024 + 65536) throw new ProveedorError('El archivo supera los 15 MB.',413);
    const form = await request.formData();
    const data = JSON.parse(String(form.get('data') || '{}'));
    return Response.json(await createTicket(data,form.get('file')),{status:201});
  } catch (error) { return adminError(error); }
}
