import { NextResponse } from 'next/server';
import { createHorasJuan, getHorasJuan } from '../../../../../server/features/horasJuan/HorasJuanRepository.js';
export const runtime = 'nodejs';
export async function GET() { try { return NextResponse.json(await getHorasJuan()); } catch (error) { return NextResponse.json({ message: error.message || 'Error al cargar los informes' }, { status: 500 }); } }
export async function POST(request) { try { return NextResponse.json(await createHorasJuan(await request.json()), { status: 201 }); } catch (error) { return NextResponse.json({ message: error.message || 'Error al crear el informe' }, { status: 400 }); } }
