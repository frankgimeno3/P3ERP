import { NextResponse } from "next/server";
import { createTicket, getTickets } from "../../../../../server/features/proveedor/TicketRepository.js";
export const runtime = "nodejs";
export async function GET(request) {
  try { return NextResponse.json(await getTickets(new URL(request.url).searchParams.get("id_proveedor") || "")); }
  catch (error) { return NextResponse.json({message:"Error al cargar tickets",detail:error.message},{status:500}); }
}
export async function POST(request) {
  try {
    const data = await request.json();
    if (!data.fecha_ticket || (!data.id_proveedor && !data.nombre_personalizado_proveedor) || data.base_imponible === "" || data.importe_total === "" || !data.forma_pago || !data.documento_src) return NextResponse.json({message:"Completa todos los campos"},{status:400});
    return NextResponse.json(await createTicket(data),{status:201});
  } catch (error) { return NextResponse.json({message:"Error al crear ticket",detail:error.message},{status:400}); }
}
