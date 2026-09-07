import { NextResponse } from 'next/server';
import { getHorasJuanSuggestion } from '../../../../../../server/features/horasJuan/HorasJuanRepository.js';
export const runtime = 'nodejs';
export async function GET(request) { try { const p = request.nextUrl.searchParams; return NextResponse.json(await getHorasJuanSuggestion({ nombre: p.get('nombre') || 'Juan', mes: Number(p.get('mes')), anio: Number(p.get('anio')), tipo: p.get('tipo') })); } catch (error) { return NextResponse.json({ message: error.message || 'Error al calcular el ajuste' }, { status: 400 }); } }
