'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import apiClient from '@/app/apiClient';
import {ContenidoService} from '@/app/service/ContenidoService';
import MiddleNav from '@/app/general_components/componentes_recurrentes/MiddleNav';

type Revista={id_revista:string;revista:string;region:string;sector:string;numero_publicacion:string};
type Content={id_contenido:string;nombre_cuenta:string;id_cuenta:string;contenido:string;estado:string;servicio:string;nombre_servicio:string;id_publicacion:string;deadline_contenido:string};
const magazineColumns=[['revista','Revista'],['region','Región'],['sector','Sector'],['numero_publicacion','Número']] as const;
const contentColumns=[['id_contenido','ID contenido'],['nombre_cuenta','Cuenta'],['contenido','Contenido'],['nombre_servicio','Servicio'],['estado','Estado'],['deadline_contenido','Fecha límite']] as const;
export default function ContenidosPage(){
  const [tab,setTab]=useState<'revista'|'todos'>('revista'),[magazines,setMagazines]=useState<Revista[]>([]),[contents,setContents]=useState<Content[]>([]),[filters,setFilters]=useState<Record<string,string>>({}),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  useEffect(()=>{Promise.all([apiClient.get('/api/v1/produccion/gestiones-produccion'),ContenidoService.getContenidos()]).then(([m,c])=>{setMagazines(m.data||[]);setContents(Array.isArray(c)?c:[]);}).catch(reason=>setError(reason.response?.data?.message||reason.message)).finally(()=>setLoading(false));},[]);
  const columns=tab==='revista'?magazineColumns:contentColumns;
  const rows=tab==='revista'?magazines:contents;
  const visible=rows.filter(row=>columns.every(([key])=>String((row as any)[key]||(key==='nombre_cuenta'?(row as any).id_cuenta:key==='nombre_servicio'?(row as any).servicio:'')).toLocaleLowerCase('es').includes((filters[key]||'').trim().toLocaleLowerCase('es'))));
  return <main className="min-h-screen bg-gray-100 text-slate-900"><MiddleNav tituloprincipal="Contenidos"/><div className="mx-auto max-w-7xl p-6"><h1 className="mb-4 text-2xl font-semibold">Contenidos de producción</h1>
    <nav aria-label="Vista de contenidos" className="mb-4 flex gap-2"><button type="button" onClick={()=>{setTab('revista');setFilters({});}} className={`cursor-pointer rounded px-4 py-2 hover:bg-blue-100 ${tab==='revista'?'bg-blue-950 text-white hover:bg-blue-900':'bg-white'}`}>Filtrar por revista</button><button type="button" onClick={()=>{setTab('todos');setFilters({});}} className={`cursor-pointer rounded px-4 py-2 hover:bg-blue-100 ${tab==='todos'?'bg-blue-950 text-white hover:bg-blue-900':'bg-white'}`}>Todos los contenidos</button></nav>
    {error&&<p role="alert" className="mb-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}
    <details className="mb-4 rounded border bg-white p-3"><summary className="cursor-pointer font-medium hover:text-blue-900">Filtros por columna</summary><div className="mt-3 grid gap-3 md:grid-cols-4">{columns.map(([key,label])=><label key={key} className="text-xs">{label}<input value={filters[key]||''} onChange={event=>setFilters(previous=>({...previous,[key]:event.target.value}))} className="mt-1 w-full rounded border p-2"/></label>)}</div></details>
    <div className="overflow-x-auto rounded border bg-white"><table className="w-full text-left text-xs"><thead className="bg-blue-950 text-white"><tr>{columns.map(([key,label])=><th key={key} className="p-3">{label}</th>)}</tr></thead><tbody>{visible.map(row=>{const id=tab==='revista'?(row as Revista).id_revista:(row as Content).id_contenido;return <tr key={id} className="border-t hover:bg-blue-50"><td colSpan={columns.length}><Link href={tab==='revista'?`/dashboard/produccion/contenidos/revistas/${encodeURIComponent(id)}`:`/dashboard/produccion/contenidos/${encodeURIComponent(id)}`} className="grid cursor-pointer gap-2 p-3 hover:text-blue-950" style={{gridTemplateColumns:`repeat(${columns.length},minmax(0,1fr))`}}>{columns.map(([key])=><span key={key} className="truncate">{String((row as any)[key]||(key==='nombre_cuenta'?(row as any).id_cuenta:key==='nombre_servicio'?(row as any).servicio:'')||'—')}</span>)}</Link></td></tr>;})}</tbody></table>{loading?<p className="p-5">Cargando...</p>:!visible.length&&<p className="p-5">No hay contenidos con estos filtros.</p>}</div>
  </div></main>;
}
