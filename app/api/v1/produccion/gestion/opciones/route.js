import { NextResponse } from 'next/server';
import { getContentIntakeOptions } from '@/server/features/produccion/ContentIntakeRepository.js';
export const runtime = 'nodejs';
export async function GET(request) {
  try { return NextResponse.json(await getContentIntakeOptions(Object.fromEntries(new URL(request.url).searchParams))); }
  catch (error) { return NextResponse.json({ message: error.message }, { status: 400 }); }
}
