import { NextResponse } from 'next/server';
import { getHorasJuanById } from '../../../../../../../server/features/horasJuan/HorasJuanRepository.js';
import { createHorasJuanPdf } from '../../../../../../../server/features/horasJuan/HorasJuanPdf.js';
export const runtime = 'nodejs';
export async function GET(_request, { params }) { const { id } = await params; const report = await getHorasJuanById(id); if (!report) return NextResponse.json({ message: 'Informe no encontrado' }, { status: 404 }); return new NextResponse(createHorasJuanPdf(report), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="informe-juan-${id}.pdf"`, 'Cache-Control': 'no-store' } }); }
