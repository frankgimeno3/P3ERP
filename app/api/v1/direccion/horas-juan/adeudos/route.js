import { NextResponse } from 'next/server';
import { getHorasJuanDebts } from '../../../../../../server/features/horasJuan/HorasJuanRepository.js';
export const runtime = 'nodejs';
export async function GET() { try { return NextResponse.json(await getHorasJuanDebts()); } catch (error) { return NextResponse.json({ message: error.message || 'No se pudieron cargar los adeudos' }, { status: 500 }); } }
