import { NextResponse } from 'next/server';
import { getReviewAnalysis, changeReviewMemory } from '@/server/features/banco/BankReviewMemoryRepository.js';
import { requestActor } from '@/server/features/comentario/AccountActivity.js';

export const runtime = 'nodejs';
export async function POST(request) {
  try { return NextResponse.json(await getReviewAnalysis(await request.json())); }
  catch (error) { return NextResponse.json({ message: error.message || 'No se pudo analizar la selección.' }, { status: error.status || 500 }); }
}
export async function PUT(request) {
  try { return NextResponse.json(await changeReviewMemory(await request.json(), requestActor(request))); }
  catch (error) { return NextResponse.json({ message: error.message || 'No se pudo guardar la decisión.' }, { status: error.status || 500 }); }
}
