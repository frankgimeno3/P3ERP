'use client';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import MiddleNav from '../../../../../general_components/componentes_recurrentes/MiddleNav';
type Item={fecha_hora:string;tipo:string;detalles:string;descripcion:Record<string,unknown>[]};
export default function HistoryDetail({params}:{params:Promise<{id:string}>}) {
  const {id}=use(params); const [item,setItem]=useState<Item|null>(null); const [error,setError]=useState('');
  useEffect(()=>{fetch(`/api/v1/operaciones/tiger/historial/${id}`).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.message);setItem(d)}).catch(e=>setError(e.message))},[id]);
  return <div className="min-h-screen bg-gray-200 text-gray-700"><MiddleNav tituloprincipal="Detalle de actualización Tiger"/><main className="m-8 rounded-xl bg-white p-8 shadow-xl"><Link href="/dashboard/operaciones/data" className="cursor-pointer text-blue-800 hover:underline">← Volver al historial</Link>{error&&<p className="mt-6 text-red-600">{error}</p>}{!item&&!error&&<p className="mt-6">Cargando…</p>}{item&&<><dl className="mt-6 grid gap-4 sm:grid-cols-3"><div><dt className="font-bold">Fecha y hora</dt><dd>{new Date(item.fecha_hora).toLocaleString('es-ES')}</dd></div><div><dt className="font-bold">Tipo</dt><dd className="capitalize">{item.tipo}</dd></div><div><dt className="font-bold">Detalles</dt><dd>{item.detalles}</dd></div></dl><h2 className="mb-4 mt-8 text-xl font-bold">Cambios realizados</h2><div className="space-y-4">{item.descripcion.map((entry,i)=><section key={i} className="rounded border bg-gray-50 p-4"><pre className="whitespace-pre-wrap break-words text-sm">{JSON.stringify(entry,null,2)}</pre></section>)}{!item.descripcion.length&&<p>No hubo cambios en registros.</p>}</div></>}</main></div>;
}
