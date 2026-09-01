import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
const filePath = path.join(process.cwd(), "app", "data", "condiciones_verifactu.json");

function valid(items) {
  return Array.isArray(items) && items.every((item) =>
    typeof item?.estado === "boolean"
    && typeof item?.nombre === "string"
    && typeof item?.descripcion === "string",
  );
}

export async function GET() {
  try { return NextResponse.json(JSON.parse(await fs.readFile(filePath, "utf8"))); }
  catch (error) { return NextResponse.json({ message: "No se pudieron cargar las condiciones", detail: error.message }, { status: 500 }); }
}

export async function PUT(request) {
  try {
    const items = await request.json();
    if (!valid(items)) return NextResponse.json({ message: "Formato de condiciones no válido" }, { status: 400 });
    await fs.writeFile(filePath, `${JSON.stringify(items, null, 2)}\n`, "utf8");
    return NextResponse.json(items);
  } catch (error) { return NextResponse.json({ message: "No se pudieron guardar las condiciones", detail: error.message }, { status: 500 }); }
}
