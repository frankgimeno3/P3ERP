import { NextResponse } from "next/server";
import { getEligibleContracts, getUninvoicedContracts } from "../../../../../../server/features/factura/FacturaClienteRepository.js";

export const runtime = "nodejs";
export async function GET(request) {
  try { return NextResponse.json(await (new URL(request.url).searchParams.get('sin_facturar')==='true'?getUninvoicedContracts():getEligibleContracts())); }
  catch (error) { return NextResponse.json({ message: "Error al cargar contratos", detail: error.message }, { status: 500 }); }
}
