import { NextResponse } from 'next/server';
import { getCanal,saveCanal } from '@/server/features/servicio/CanalRepository';
export const runtime='nodejs';
export async function GET(request,context){try{const {id}=await context.params;const canal=await getCanal(id);return NextResponse.json(canal || {message:'Canal no encontrado.'},{status:canal?200:404});}catch{return NextResponse.json({message:'No se pudo cargar el canal.'},{status:500});}}
export async function PUT(request,context){try{const {id}=await context.params;return NextResponse.json(await saveCanal(id,await request.json()));}catch(error){return NextResponse.json({message:error.status?error.message:'No se pudo guardar el canal.'},{status:error.status || 500});}}
