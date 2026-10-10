import {resolveIdentifier} from '@/server/features/identifiers/IdentifierAliases.js';
import { NextResponse } from 'next/server';
import { getContentMagazineOptions } from '@/server/features/produccion/GestionesProduccionRepository.js';
export const runtime = 'nodejs';
export async function GET(_request, { params }) {
  try {
    const id_contenido=await resolveIdentifier('contenido',(await params).id_contenido);
    const rows = await getContentMagazineOptions(id_contenido);
    return rows ? NextResponse.json(rows) : NextResponse.json({ message: 'Contenido no encontrado' }, { status: 404 });
  } catch (error) { return NextResponse.json({ message: error.message }, { status: 500 }); }
}
