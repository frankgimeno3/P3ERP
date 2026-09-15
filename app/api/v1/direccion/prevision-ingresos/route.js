import { NextResponse } from "next/server";
import { getPrevisionIngresosOrdenes } from "../../../../../server/features/orden/OrdenRepository.js";
import { createIngresoAdicional, getIngresosAdicionales } from "../../../../../server/features/prevision/PrevisionRepository.js";
import { getImportedReceipts, getRemesas, mergeReceiptForecast } from "../../../../../server/features/prevision/ReceiptImportRepository.js";
import { requestActor } from "../../../../../server/features/comentario/AccountActivity.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo") || "todos";
    if (!["todos", "recibos", "transfers", "remesas"].includes(tipo)) return NextResponse.json({ message: "Tipo de previsión no válido" }, { status: 400 });
    if (tipo === "remesas") return NextResponse.json(await getRemesas());
    const [ordenes, adicionales, receipts] = await Promise.all([getPrevisionIngresosOrdenes(tipo), getIngresosAdicionales(tipo), tipo === "transfers" ? [] : getImportedReceipts()]);
    const dateKey = (value) => String(value || "").split("/").reverse().join("-") || "9999-99-99";
    return NextResponse.json(mergeReceiptForecast([...ordenes, ...adicionales], receipts).sort((a, b) => dateKey(a.fecha_teorica_cobro).localeCompare(dateKey(b.fecha_teorica_cobro))));
  } catch (error) {
    console.error("Error in GET /api/v1/direccion/prevision-ingresos:", error);
    return NextResponse.json(
      { message: "Error al cargar la previsión de ingresos", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body?.id_cuenta && !String(body?.cliente_manual || "").trim()) return NextResponse.json({ message: "Selecciona una cuenta o introduce un cliente" }, { status: 400 });
    if (!["recibo", "transferencia"].includes(body?.tipo_ingreso)) return NextResponse.json({ message: "Tipo de ingreso no válido" }, { status: 400 });
    if (body?.asociado_factura && !String(body?.numero_factura || "").trim()) return NextResponse.json({ message: "Indica el número de factura" }, { status: 400 });
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(body?.fecha_teorica || "")) return NextResponse.json({ message: "Fecha teórica no válida" }, { status: 400 });
    if (!["recibo", "transferencia", "pagaré", "tarjeta", "efectivo"].includes(body?.forma_cobro)) return NextResponse.json({ message: "Forma de cobro no válida" }, { status: 400 });
    if (!["Sabadell", "Santander"].includes(body?.banco)) return NextResponse.json({ message: "Banco no válido" }, { status: 400 });
    if (!(Number(body?.base_imponible) > 0)) return NextResponse.json({ message: "La base imponible debe ser mayor que cero" }, { status: 400 });
    return NextResponse.json(await createIngresoAdicional(body, requestActor(request)), { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/v1/direccion/prevision-ingresos:", error);
    return NextResponse.json({ message: "No se ha podido crear el ingreso adicional" }, { status: 500 });
  }
}
