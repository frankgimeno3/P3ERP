import { NextResponse } from 'next/server';
import { getControlRedaccion } from '../../../../../server/features/controlRedaccion/ControlRedaccionRepository.js';
export const runtime = 'nodejs';
export async function GET() {
  try { return NextResponse.json(await getControlRedaccion()); }
  catch (error) {
    console.error('Error in GET /api/v1/produccion/control-redaccion:', error);
    return NextResponse.json({ message: 'Error al cargar el control de redacción', detail: process.env.NODE_ENV === 'development' ? error.message : undefined }, { status: 500 });
  }
}
