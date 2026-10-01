import { NextResponse } from 'next/server';
import { setRevistaPublicationStatus } from '@/server/features/revista/RevistaRepository.js';
export const runtime='nodejs';
export async function PATCH(request,{params}){
  try{const {id_revista}=await params;const {estado}=await request.json();const result=await setRevistaPublicationStatus(id_revista,estado);return result?NextResponse.json(result):NextResponse.json({message:'Revista no encontrada'},{status:404});}
  catch(error){return NextResponse.json({message:error.message},{status:400});}
}
