import { NextResponse } from 'next/server';
import { getMagazineList } from '@/server/features/produccion/GestionesProduccionRepository.js';
export const runtime = 'nodejs';
export async function GET() {
  try { return NextResponse.json(await getMagazineList()); }
  catch (error) { return NextResponse.json({ message: error.message }, { status: 500 }); }
}
