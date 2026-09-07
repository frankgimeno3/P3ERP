import { NextResponse } from 'next/server';
import { getTigerHistoryItem } from '../../../../../../../server/features/tiger/TigerImportRepository.js';
export const runtime = 'nodejs';
export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const item = await getTigerHistoryItem(id);
    return item ? NextResponse.json(item) : NextResponse.json({ message: 'Registro no encontrado' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ message: 'No se pudo cargar el registro', detail: error.message }, { status: 500 });
  }
}
