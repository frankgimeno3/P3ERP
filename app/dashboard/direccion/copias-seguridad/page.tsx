'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type RegistryRow = { id_copia_seguridad: string; nombre: string; fecha: string; detalles: string; estado: 'correcta' | 'error' };

export default function CopiasSeguridadPage() {
  const [rows, setRows] = useState<RegistryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/v1/direccion/copias-seguridad', { cache: 'no-store' })
      .then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.message || 'No se pudo cargar el registro.'); setRows(body); })
      .catch((reason) => setError(reason.message)).finally(() => setLoading(false));
  }, []);

  return <main className="min-h-screen bg-gray-100 px-8 py-8 text-gray-900 lg:px-12">
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold text-slate-800">Copias de seguridad</h1><p className="mt-1 text-sm text-slate-600">Registro informativo de las copias generadas.</p></div><Link href="/dashboard/direccion/copias-seguridad/nueva" className="cursor-pointer rounded bg-blue-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 hover:shadow-md">Hacer nueva copia de seguridad</Link></header>
    {error && <p className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-sm"><thead className="bg-blue-950 text-left text-white"><tr><th className="px-4 py-3">ID</th><th className="px-4 py-3">Nombre de la copia</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Detalles</th></tr></thead><tbody>
      {loading ? <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-600">Cargando…</td></tr> : rows.length === 0 ? <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-600">Todavía no se ha generado ninguna copia.</td></tr> : rows.map((row) => <tr key={row.id_copia_seguridad} className={`border-t border-slate-200 ${row.estado === 'error' ? 'bg-red-50' : 'bg-white'}`}><td className="px-4 py-3 font-mono text-xs text-slate-700">{row.id_copia_seguridad}</td><td className="px-4 py-3 font-semibold text-slate-900">{row.nombre}</td><td className="whitespace-nowrap px-4 py-3 text-slate-800">{new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(row.fecha))}</td><td className={row.estado === 'error' ? 'px-4 py-3 text-red-800' : 'px-4 py-3 text-slate-800'}>{row.estado === 'error' ? `Error: ${row.detalles}` : row.detalles || '—'}</td></tr>)}
    </tbody></table></div></section><p className="mt-3 text-xs text-slate-500">Este registro no almacena el archivo generado ni permite volver a descargarlo.</p>
  </main>;
}
