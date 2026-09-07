import { NextResponse } from 'next/server';
import { getBackupCatalog } from '../../../../../../server/features/copiasSeguridad/CopiasSeguridadRepository.js';

export const runtime = 'nodejs';

export async function GET() {
  try {
    return NextResponse.json(await getBackupCatalog());
  } catch (error) {
    return NextResponse.json({ message: error.message || 'No se pudo cargar el catálogo de tablas.' }, { status: 500 });
  }
}
