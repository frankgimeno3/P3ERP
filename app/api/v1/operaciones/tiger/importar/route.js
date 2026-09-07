import { NextResponse } from 'next/server';
import { importTiger } from '../../../../../../server/features/tiger/TigerImportRepository.js';
import { TIGER_HEADERS } from '../../../../../dashboard/operaciones/data/tigerFormat.ts';
export const runtime = 'nodejs';
export async function POST(request) {
  try {
    const { tipo, modo, headers, rows } = await request.json();
    if (!['cuentas','contactos'].includes(tipo) || !['crear','rellenar','sustituir'].includes(modo)) return NextResponse.json({ message: 'Configuración no válida' }, { status: 400 });
    if (JSON.stringify(headers) !== JSON.stringify(TIGER_HEADERS[tipo])) return NextResponse.json({ message: 'Las columnas no coinciden con el formato Tiger' }, { status: 400 });
    if (!Array.isArray(rows) || !rows.length) return NextResponse.json({ message: 'El archivo no contiene datos' }, { status: 400 });
    return NextResponse.json(await importTiger(tipo, rows, modo));
  } catch (error) {
    return NextResponse.json({ message: 'Error durante la importación', detail: error.message }, { status: 500 });
  }
}
