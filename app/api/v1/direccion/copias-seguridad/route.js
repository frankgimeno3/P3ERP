import { NextResponse } from 'next/server';
import { getBackupRegistry } from '../../../../../server/features/copiasSeguridad/CopiasSeguridadRepository.js';

export const runtime = 'nodejs';

export async function GET() {
  try {
    return NextResponse.json(await getBackupRegistry());
  } catch (error) {
    return NextResponse.json({ message: error.message || 'No se pudo cargar el registro de copias.' }, { status: 500 });
  }
}
