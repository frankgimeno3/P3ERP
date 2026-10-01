import { NextResponse } from 'next/server';
import { getProposalTemplate, updateProposalTemplate } from '@/server/features/propuesta/ProposalTemplateRepository.js';
export const runtime='nodejs';
export async function GET(_request,{params}) {try{const {id_plantilla}=await params;const row=await getProposalTemplate(id_plantilla);return row?NextResponse.json(row):NextResponse.json({message:'Plantilla no encontrada'},{status:404});}catch(error){return NextResponse.json({message:error.message},{status:400});}}
export async function PATCH(request,{params}) {try{const {id_plantilla}=await params;const row=await updateProposalTemplate(id_plantilla,await request.json());return row?NextResponse.json(row):NextResponse.json({message:'Plantilla no encontrada'},{status:404});}catch(error){return NextResponse.json({message:error.message},{status:400});}}
