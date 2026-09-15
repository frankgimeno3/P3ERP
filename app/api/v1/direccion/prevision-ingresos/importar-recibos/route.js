import { NextResponse } from 'next/server';
import { parseReceiptExcel } from '../../../../../../server/features/prevision/ReceiptExcel.js';
import { importReceipts } from '../../../../../../server/features/prevision/ReceiptImportRepository.js';
import { requestActor } from '../../../../../../server/features/comentario/AccountActivity.js';

export const runtime = 'nodejs';

export async function POST(request) {
  let rows, action;
  try {
    const form = await request.formData();
    const file = form.get('file');
    action = form.get('action');
    if (!['preview', 'import'].includes(action)) throw new Error('Acción de importación no válida.');
    if (!file || typeof file.arrayBuffer !== 'function' || !/\.(xlsx|xls)$/i.test(file.name)) throw new Error('Selecciona un archivo Excel .xlsx o .xls.');
    if (!file.size || file.size > 10 * 1024 * 1024) throw new Error('El archivo debe tener contenido y no superar 10 MB.');
    rows = parseReceiptExcel(Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    return NextResponse.json({ message: error.message || 'No se pudo leer el Excel.' }, { status: 400 });
  }
  if (action === 'preview') return NextResponse.json({ total: rows.length, rows: rows.slice(0, 20) });
  try {
    return NextResponse.json(await importReceipts(rows, undefined, requestActor(request)));
  } catch (error) {
    console.error('Error al importar recibos:', error);
    return NextResponse.json({ message: error.status === 409 ? error.message : 'No se ha importado ningún recibo. No se pudo guardar el archivo; vuelve a intentarlo.' }, { status: error.status || 500 });
  }
}
