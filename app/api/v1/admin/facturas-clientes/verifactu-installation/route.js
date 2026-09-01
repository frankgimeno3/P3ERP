import { NextResponse } from "next/server";
import { getVerifactuInstallation } from "../../../../../../server/features/factura/FacturaClienteRepository.js";

export const runtime = "nodejs";
export async function GET() {
  try { return NextResponse.json(await getVerifactuInstallation()); }
  catch (error) { return NextResponse.json({ message: "No se pudo cargar la información legal", detail: error.message }, { status: 500 }); }
}
