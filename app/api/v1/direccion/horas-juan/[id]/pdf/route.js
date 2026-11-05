import { NextResponse } from 'next/server';
import { getHorasJuanById } from '../../../../../../../server/features/horasJuan/HorasJuanRepository.js';
import { createHorasJuanPdf } from '../../../../../../../server/features/horasJuan/HorasJuanPdf.js';
import { validateJuanReport } from '@/app/lib/horasJuanReport.js';
export const runtime = 'nodejs';
export async function GET(_request, { params }) { const { id } = await params; const report = await getHorasJuanById(id); if (!report) return NextResponse.json({ message: 'Informe no encontrado' }, { status: 404 }); const missing = validateJuanReport(report); if (missing.length) return NextResponse.json({ message: `No se puede guardar el PDF. Faltan datos o no son válidos: ${missing.join(', ')}.` }, { status: 422 }); return new NextResponse(createHorasJuanPdf(report), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="informe-juan-${id}.pdf"`, 'Cache-Control': 'no-store' } }); }
