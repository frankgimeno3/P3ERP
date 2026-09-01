import { NextResponse } from "next/server";
import { getPaginasPublicacion, setNumeroPaginas } from "../../../../../../../server/features/revista/RevistaRepository.js";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  try {
    const { id_revista: id } = await params;
    const result = await getPaginasPublicacion(id);
    return result ? NextResponse.json(result) : NextResponse.json({ message: "Publicacion no encontrada" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id_revista: id } = await params;
    const body = await request.json();
    const numPaginas = Math.max(9, Number(body.num_paginas) || 9);
    if (numPaginas % 2 === 0) return NextResponse.json({ message: "El planillo debe tener un numero impar de paginas" }, { status: 400 });
    const result = await setNumeroPaginas(id, numPaginas);
    return result ? NextResponse.json(result) : NextResponse.json({ message: "Publicacion no encontrada" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
