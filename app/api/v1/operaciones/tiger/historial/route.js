import { NextResponse } from 'next/server';
import { getTigerHistory } from '../../../../../../server/features/tiger/TigerImportRepository.js';
export const runtime = 'nodejs';
export async function GET(request) {
  try {
    const type = new URL(request.url).searchParams.get('tipo') || '';
    return NextResponse.json(await getTigerHistory(type));
  } catch (error) {
    return NextResponse.json({ message: 'No se pudo cargar el historial', detail: error.message }, { status: 500 });
  }
}
