import { NextResponse } from 'next/server';
import { addProductionMaterial,addProductionMaterials } from '@/server/features/produccion/GestionesProduccionRepository.js';
export const runtime = 'nodejs';
export async function POST(request) {
  try {const data=await request.json();return NextResponse.json(await (Array.isArray(data.materiales)?addProductionMaterials(data):addProductionMaterial(data)), { status: 201 }); }
  catch (error) { return NextResponse.json({ message: error.message }, { status: 400 }); }
}
