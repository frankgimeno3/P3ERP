'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import apiClient from '@/app/apiClient';
import MiddleNav from '@/app/general_components/componentes_recurrentes/MiddleNav';

type Template={id_plantilla:string;nombre:string;versiones:Record<string,unknown[]>;updated_at:string};
export default function PlantillasPropuestasPage(){
  const [rows,setRows]=useState<Template[]>([]),[error,setError]=useState('');
  useEffect(()=>{apiClient.get('/api/v1/comercial/propuestas/plantillas').then(response=>setRows(response.data)).catch(reason=>setError(reason.response?.data?.message||reason.message));},[]);
  return <main className="min-h-screen bg-gray-100 text-slate-900"><MiddleNav tituloprincipal="Plantillas de propuestas"/><div className="mx-auto max-w-6xl p-8"><div className="mb-5 flex items-center justify-between"><h1 className="text-xl font-semibold">Plantillas</h1><Link href="/dashboard/comercial/propuestas/plantillas/crear" className="cursor-pointer rounded bg-blue-950 px-4 py-2 text-white hover:bg-blue-900">Crear plantilla</Link></div>{error&&<p role="alert" className="mb-4 text-red-700">{error}</p>}<div className="overflow-x-auto rounded border bg-white"><table className="w-full text-left text-sm"><thead className="bg-blue-950 text-white"><tr><th className="p-3">Nombre</th><th className="p-3">Idiomas</th><th className="p-3">Productos en español</th><th className="p-3">Actualizada</th></tr></thead><tbody>{rows.map(row=><tr key={row.id_plantilla} className="border-t hover:bg-blue-50"><td className="p-3"><Link href={`/dashboard/comercial/propuestas/plantillas/${row.id_plantilla}`} className="cursor-pointer font-medium text-blue-900 hover:underline">{row.nombre}</Link></td><td className="p-3">{Object.keys(row.versiones).join(', ')}</td><td className="p-3">{row.versiones.es?.length||0}</td><td className="p-3">{new Date(row.updated_at).toLocaleDateString('es-ES')}</td></tr>)}</tbody></table>{!rows.length&&<p className="p-5 text-sm text-slate-500">Todavía no hay plantillas.</p>}</div></div></main>;
}
