import { NextResponse } from 'next/server';
import { getMagazineManagement } from '@/server/features/produccion/GestionesProduccionRepository.js';
import {assignContentMagazine} from '@/server/features/produccion/ProductionRepository.js';
export const runtime = 'nodejs';
export async function GET(_request, { params }) {
  try {
    const { id_revista } = await params;
    const data = await getMagazineManagement(id_revista);
    return data ? NextResponse.json(data) : NextResponse.json({ message: 'Revista no encontrada' }, { status: 404 });
  } catch (error) { return NextResponse.json({ message: error.message }, { status: 500 }); }
}
export async function POST(request,{params}) {
 try {const {id_revista}=await params;return NextResponse.json(await assignContentMagazine(id_revista,await request.json()));}
 catch(error){return NextResponse.json({message:error.message},{status:error.status||400});}
}
