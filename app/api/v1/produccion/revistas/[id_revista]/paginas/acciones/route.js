import { NextResponse } from "next/server";
import { assignContentToPages, deletePublicationPages, insertPagesAfterRow } from "../../../../../../../../server/features/revista/RevistaRepository.js";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  try {
    const { id_revista: id } = await params;
    const body = await request.json();
    if (body.action === "assign_content") return NextResponse.json(await assignContentToPages(id, body));
    if (body.action === "delete_pages") return NextResponse.json(await deletePublicationPages(id, body));
    if (body.action === "insert_pages_after_row") return NextResponse.json(await insertPagesAfterRow(id, body));
    return NextResponse.json({ message: "Accion no valida" }, { status: 400 });
  } catch (error) {
    const status = error.code === "PAGE_CONTENT_CONFLICT" ? 409 : 400;
    return NextResponse.json({ message: error.message, code: error.code }, { status });
  }
}
