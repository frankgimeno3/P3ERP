import { NextResponse } from 'next/server';
import { validateContentUpload } from '@/server/features/produccion/ContentIntakeRepository.js';
export const runtime = 'nodejs';
export async function POST(request) {
  try { return NextResponse.json(await validateContentUpload(await request.json())); }
  catch (error) { return NextResponse.json({ message: error.message }, { status: 400 }); }
}
