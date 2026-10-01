import { NextResponse } from 'next/server';
import { addProductionMaterial } from '@/server/features/produccion/GestionesProduccionRepository.js';
export const runtime = 'nodejs';
export async function POST(request) {
  try { return NextResponse.json(await addProductionMaterial(await request.json()), { status: 201 }); }
  catch (error) { return NextResponse.json({ message: error.message }, { status: 400 }); }
}
