import { NextResponse } from 'next/server';
import { getCanales,saveCanal } from '@/server/features/servicio/CanalRepository';
export const runtime='nodejs';
export async function GET(){try{return NextResponse.json(await getCanales());}catch{return NextResponse.json({message:'No se pudieron cargar los canales.'},{status:500});}}
export async function POST(request){try{const data=await request.json();return NextResponse.json(await saveCanal(String(data.id_medio || '').trim(),data,true),{status:201});}catch(error){return NextResponse.json({message:error.code==='23505'?'Ese código de canal ya existe.':error.status?error.message:'No se pudo crear el canal.'},{status:error.code==='23505'?409:error.status || 500});}}
