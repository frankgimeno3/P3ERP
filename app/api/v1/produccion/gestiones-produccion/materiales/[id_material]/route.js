import { NextResponse } from 'next/server';
import { reviewProductionMaterial } from '@/server/features/produccion/GestionesProduccionRepository.js';
export const runtime = 'nodejs';
export async function PATCH(request, { params }) {
  try {
    const { id_material } = await params;
    const updated = await reviewProductionMaterial(id_material, await request.json());
    return updated ? NextResponse.json(updated) : NextResponse.json({ message: 'Material no encontrado' }, { status: 404 });
  } catch (error) { return NextResponse.json({ message: error.message }, { status: 400 }); }
}
