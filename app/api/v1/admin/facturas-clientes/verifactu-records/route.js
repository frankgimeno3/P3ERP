import { NextResponse } from "next/server";
import { getVerifactuRecords } from "../../../../../../server/features/factura/FacturaClienteRepository.js";

export const runtime = "nodejs";
export async function GET() {
  try { return NextResponse.json(await getVerifactuRecords()); }
  catch (error) { return NextResponse.json({ message: "No se pudieron cargar los registros VERI*FACTU", detail: error.message }, { status: 500 }); }
}
