'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { HorasJuanService } from '@/app/service/HorasJuanService';
import { InformeJuan, MESES } from '../types';

import { juanReportBlocks, validateJuanReport } from '@/app/lib/horasJuanReport.js';
export default function InformeJuanPage() {
  const { id } = useParams<{ id: string }>(), router = useRouter();
  const [report, setReport] = useState<InformeJuan | null>(null), [error, setError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false), [deletePhase, setDeletePhase] = useState(1), [dependents, setDependents] = useState<InformeJuan[]>([]), [deleting, setDeleting] = useState(false);
  useEffect(() => { HorasJuanService.getById(id).then(setReport).catch((e: Error) => setError(e.message || 'No se pudo cargar el informe')); }, [id]);
  useEffect(() => { if (!deleteOpen) return; const close = (event: KeyboardEvent) => { if (event.key === 'Escape' && !deleting) setDeleteOpen(false); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [deleteOpen, deleting]);
  const beginDelete = async () => { try { const impact = await HorasJuanService.getDeleteImpact(id); setDependents(impact.dependientes || []); setDeletePhase(1); setDeleteOpen(true); } catch (e: any) { setError(e.message || 'No se pudo comprobar la eliminación'); } };
  const confirmDelete = async () => { if (report?.tipo === 'anticipo' && dependents.length && deletePhase === 1) { setDeletePhase(2); return; } setDeleting(true); try { await HorasJuanService.remove(id, report?.tipo === 'anticipo'); router.push('/dashboard/direccion/horas-juan'); } catch (e: any) { setError(e.message || 'No se pudo eliminar el informe'); setDeleteOpen(false); setDeleting(false); } };
  if (error && !report) return <div className="p-12 text-red-700">{error}</div>;
  if (!report) return <div className="p-12 text-gray-600">Cargando…</div>;
  const missing = validateJuanReport(report);
  return <div className="min-h-screen bg-gray-100 px-6 py-10 text-gray-900">
    <div className="mx-auto mb-4 flex max-w-3xl flex-wrap justify-between gap-3"><button type="button" onClick={() => router.push('/dashboard/direccion/horas-juan')} className="cursor-pointer rounded border bg-white px-4 py-2 text-sm transition hover:bg-blue-50">← Volver</button><div className="flex gap-2"><button type="button" onClick={beginDelete} className="cursor-pointer rounded border border-red-600 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50">Eliminar informe</button><button type="button" disabled={missing.length > 0} onClick={() => { window.location.href = `/api/v1/direccion/horas-juan/${id}/pdf`; }} className="cursor-pointer rounded bg-blue-950 px-4 py-2 text-sm text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:hover:bg-gray-400">Guardar PDF</button></div></div>
    {error && <p className="mx-auto mb-4 max-w-3xl rounded border border-red-200 bg-red-50 p-3 text-red-800">{error}</p>}
    {missing.length > 0 && <p role="alert" className="mx-auto mb-4 max-w-3xl rounded border border-amber-300 bg-amber-50 p-3 text-amber-900">No se puede guardar el PDF. Faltan datos o no son válidos: {missing.join(', ')}.</p>}
    <article className="mx-auto min-h-[800px] max-w-3xl bg-white px-16 py-20 text-[17px] leading-8 shadow-sm">
      {juanReportBlocks(report).map((block: { text: string; bold: boolean; gap: boolean }, index: number) => index === 0 ? <h1 key={index} className="text-xl font-semibold">{block.text}</h1> : <p key={index} className={(block.gap ? 'mt-6 ' : '') + (block.bold ? 'font-semibold' : '')}>{block.text}</p>)}
      {report.tipo !== 'informativa' && <div className="mt-16 h-28 border-b" />}
    </article>
    {deleteOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"><div className="flex justify-between"><h2 className="text-lg font-semibold">{deletePhase === 1 ? 'Eliminar informe' : 'Confirmar eliminación relacionada'}</h2><button type="button" disabled={deleting} onClick={() => setDeleteOpen(false)} aria-label="Cerrar" className="cursor-pointer text-2xl text-slate-500 hover:text-slate-900 disabled:cursor-not-allowed">×</button></div>{deletePhase === 1 ? <p className="mt-4 text-sm">¿Quieres eliminar definitivamente el informe #{id}? El adeudo generado por él dejará de aparecer.</p> : <div className="mt-4 text-sm"><p className="font-semibold text-red-800">También se eliminarán los informes posteriores vinculados para evitar desajustes:</p><ul className="mt-3 list-disc pl-5">{dependents.map(item => <li key={item.id_horas_juan}>{item.tipo} de {MESES[item.mes - 1]} de {item.anio} (#{item.id_horas_juan})</li>)}</ul></div>}<div className="mt-6 flex justify-end gap-2"><button type="button" disabled={deleting} onClick={() => setDeleteOpen(false)} className="cursor-pointer rounded border px-4 py-2 hover:bg-slate-100 disabled:cursor-not-allowed">Cancelar</button><button type="button" disabled={deleting} onClick={confirmDelete} className="cursor-pointer rounded bg-red-700 px-4 py-2 font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-400">{deletePhase === 1 && report.tipo === 'anticipo' && dependents.length ? 'Continuar' : deleting ? 'Eliminando…' : 'Confirmar eliminación'}</button></div></div></div>}
  </div>;
}
