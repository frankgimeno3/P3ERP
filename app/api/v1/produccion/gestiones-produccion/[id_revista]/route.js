import { NextResponse } from 'next/server';
import { getMagazineManagement } from '@/server/features/produccion/GestionesProduccionRepository.js';
export const runtime = 'nodejs';
export async function GET(_request, { params }) {
  try {
    const { id_revista } = await params;
    const data = await getMagazineManagement(id_revista);
    return data ? NextResponse.json(data) : NextResponse.json({ message: 'Revista no encontrada' }, { status: 404 });
  } catch (error) { return NextResponse.json({ message: error.message }, { status: 500 }); }
}
