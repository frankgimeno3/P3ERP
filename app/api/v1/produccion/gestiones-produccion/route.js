import { NextResponse } from 'next/server';
import { getMagazineList } from '@/server/features/produccion/GestionesProduccionRepository.js';
import {getPendingMagazineOverview} from '@/server/features/produccion/ProductionRepository.js';
export const runtime = 'nodejs';
export async function GET(request) {
  try { return NextResponse.json(await (new URL(request.url).searchParams.get('pendientes')==='1'?getPendingMagazineOverview():getMagazineList())); }
  catch (error) { return NextResponse.json({ message: error.message }, { status: 500 }); }
}
