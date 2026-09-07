import { NextResponse } from 'next/server';
import { generateBackup } from '../../../../../../server/features/copiasSeguridad/CopiasSeguridadRepository.js';

export const runtime = 'nodejs';

const jsonReplacer = (_key, value) => typeof value === 'bigint' ? value.toString() : value;

export async function POST(request) {
  try {
    const payload = await request.json();
    const backup = await generateBackup(payload);
    const filename = String(payload.nombre || 'copia-seguridad').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '') || 'copia-seguridad';
    return new NextResponse(JSON.stringify(backup, jsonReplacer, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.json"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json({ message: error.message || 'No se pudo generar la copia.' }, { status: 500 });
  }
}
