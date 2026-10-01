import {NextResponse} from 'next/server';
import {getFeriaCatalogById} from '@/server/features/feria/FeriaRepository.js';
export const runtime='nodejs';
export async function GET(_request,{params}){try{const {id}=await params;const row=await getFeriaCatalogById(id);return row?NextResponse.json(row):NextResponse.json({message:'Feria no encontrada'},{status:404});}catch{return NextResponse.json({message:'No se pudo cargar la feria'},{status:500});}}
