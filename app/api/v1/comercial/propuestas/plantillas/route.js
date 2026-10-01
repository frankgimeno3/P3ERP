import { NextResponse } from 'next/server';
import { createProposalTemplate, listProposalTemplates } from '@/server/features/propuesta/ProposalTemplateRepository.js';
export const runtime='nodejs';
export async function GET() {try{return NextResponse.json(await listProposalTemplates());}catch(error){return NextResponse.json({message:error.message},{status:500});}}
export async function POST(request) {try{return NextResponse.json(await createProposalTemplate(await request.json()),{status:201});}catch(error){return NextResponse.json({message:error.message},{status:400});}}
