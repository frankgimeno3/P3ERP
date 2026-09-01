import { NextResponse } from "next/server";
import { getEligibleContracts } from "../../../../../../server/features/factura/FacturaClienteRepository.js";

export const runtime = "nodejs";
export async function GET() {
  try { return NextResponse.json(await getEligibleContracts()); }
  catch (error) { return NextResponse.json({ message: "Error al cargar contratos", detail: error.message }, { status: 500 }); }
}
