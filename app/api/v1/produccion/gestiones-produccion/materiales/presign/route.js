import { NextResponse } from 'next/server';
import { presignProductionMaterial } from '@/server/features/produccion/GestionesProduccionRepository.js';
export const runtime = 'nodejs';
export async function POST(request) {
  try { return NextResponse.json(await presignProductionMaterial(await request.json())); }
  catch (error) { return NextResponse.json({ message: error.message }, { status: 400 }); }
}
