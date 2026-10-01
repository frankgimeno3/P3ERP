import {NextResponse} from 'next/server';
import {getFeriaCatalog,createFeriaCatalog} from '@/server/features/feria/FeriaRepository.js';
export const runtime='nodejs';
export async function GET(){try{return NextResponse.json(await getFeriaCatalog());}catch{return NextResponse.json({message:'No se pudo cargar el catálogo de ferias'},{status:500});}}
export async function POST(request){try{return NextResponse.json(await createFeriaCatalog(await request.json()),{status:201});}catch(error){return NextResponse.json({message:error.code==='23505'?'Ya existe una feria con ese nombre.':error.message},{status:error.code==='23505'?409:error.status||500});}}
