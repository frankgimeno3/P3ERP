'use client';
import { matchesTableFilter } from "@/app/lib/dateFilters";
import TableFilters from '@/app/components/TableFilters';
import {useUrlState} from '@/app/lib/useUrlState';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import apiClient from '@/app/apiClient';
import {ContenidoService} from '@/app/service/ContenidoService';
import TableColumnFilter from '@/app/components/TableColumnFilter';
import MiddleNav from '@/app/general_components/componentes_recurrentes/MiddleNav';

type Revista={id_revista:string;revista:string;region:string;sector:string;numero_publicacion:string};
type Content={id_contenido:string;nombre_cuenta:string;id_cuenta:string;contenido:string;estado:string;servicio:string;nombre_servicio:string;id_publicacion:string;deadline_contenido:string};
const magazineColumns=[['numero_publicacion','Número'],['revista','Revista'],['region','Región'],['sector','Sector']] as const;
const contentColumns=[['id_contenido','ID contenido'],['nombre_cuenta','Cuenta'],['contenido','Contenido'],['nombre_servicio','Servicio'],['estado','Estado'],['deadline_contenido','Fecha límite']] as const;
export default function ContenidosPage(){
  const [tab,setTab]=useUrlState<'revista'|'todos'>('contents.tab','revista'),[magazines,setMagazines]=useState<Revista[]>([]),[contents,setContents]=useState<Content[]>([]),[filters,setFilters]=useUrlState<Record<string,string>>('contents.filters',Object.fromEntries([...magazineColumns,...contentColumns].map(([key])=>[key,'']))),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  useEffect(()=>{let active=true;setLoading(true);setError('');const request=tab==='revista'?apiClient.get('/api/v1/produccion/gestiones-produccion').then(r=>r.data):ContenidoService.getContenidos();request.then(data=>{if(!active)return;if(tab==='revista')setMagazines(Array.isArray(data)?data:[]);else setContents(Array.isArray(data)?data:[]);}).catch(reason=>{if(active)setError(reason.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[tab]);
  const columns=tab==='revista'?magazineColumns:contentColumns;
  const rows=tab==='revista'?magazines:contents;
  const visible=rows.filter(row=>columns.every(([key])=>matchesTableFilter(String((row as any)[key]||(key==='nombre_cuenta'?(row as any).id_cuenta:key==='nombre_servicio'?(row as any).servicio:'')).toLocaleLowerCase('es'), (filters[key]||'').trim().toLocaleLowerCase('es'))));
  return <main className="min-h-screen bg-gray-100 text-slate-900"><MiddleNav tituloprincipal="Contenidos"/><div className="mx-auto max-w-7xl p-6"><h1 className="mb-4 text-2xl font-semibold">Contenidos de producción</h1>
    <nav aria-label="Vista de contenidos" className="mb-4 flex gap-2"><button type="button" onClick={()=>{setTab('revista');setFilters({});}} className={`cursor-pointer rounded px-4 py-2 hover:bg-blue-100 ${tab==='revista'?'bg-blue-950 text-white hover:bg-blue-900':'bg-white'}`}>Filtrar por revista</button><button type="button" onClick={()=>{setTab('todos');setFilters({});}} className={`cursor-pointer rounded px-4 py-2 hover:bg-blue-100 ${tab==='todos'?'bg-blue-950 text-white hover:bg-blue-900':'bg-white'}`}>Todos los contenidos</button></nav>
    {error&&<p role="alert" className="mb-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}
    <div className="overflow-x-auto rounded border bg-white"><TableFilters>{columns.map(([key,label])=><div key={key}><TableColumnFilter label={label} value={filters[key]||''} onChange={value=>setFilters(previous=>({...previous,[key]:value}))}/></div>)}</TableFilters><table className="w-full text-left text-xs"><thead className="bg-blue-950 text-white"><tr>{columns.map(([key,label])=><th key={key} className="p-3">{label}</th>)}</tr></thead><tbody>{visible.map(row=>{const id=tab==='revista'?(row as Revista).id_revista:(row as Content).id_contenido;return <tr key={id} className="border-t hover:bg-blue-50">{columns.map(([key])=><td key={key} className="p-3"><Link href={tab==='revista'?`/dashboard/produccion/contenidos/revistas/${encodeURIComponent(id)}`:`/dashboard/produccion/contenidos/${encodeURIComponent(id)}`} className="block cursor-pointer hover:text-blue-950">{String((row as any)[key]||(key==='nombre_cuenta'?(row as any).id_cuenta:key==='nombre_servicio'?(row as any).servicio:'')||'—')}</Link></td>)}</tr>;})}</tbody></table>{loading?<p className="p-5">Cargando...</p>:!visible.length&&<p className="p-5">No hay contenidos con estos filtros.</p>}</div>
  </div></main>;
}
