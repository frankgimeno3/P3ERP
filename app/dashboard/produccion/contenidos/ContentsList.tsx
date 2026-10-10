'use client';
import SortableTable from '@/app/components/SortableTable';

import { matchesTableFilter } from "@/app/lib/dateFilters";
import TableFilters from '@/app/components/TableFilters';
import {useUrlState} from '@/app/lib/useUrlState';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import apiClient from '@/app/apiClient';
import {ContenidoService} from '@/app/service/ContenidoService';
import TableColumnFilter from '@/app/components/TableColumnFilter';
import ModuleTabs from '@/app/components/ModuleTabs';

type Revista={id_revista:string;revista:string;region:string;sector:string;numero_publicacion:string};
type Content={id_contenido:string;nombre_cuenta:string;id_cuenta:string;contenido:string;estado:string;servicio:string;nombre_servicio:string;id_publicacion:string;deadline_contenido:string};
const magazineColumns=[['numero_publicacion','Número'],['revista','Revista'],['region','Región'],['sector','Sector']] as const;
const contentColumns=[['id_contenido','ID contenido'],['nombre_cuenta','Cuenta'],['contenido','Contenido'],['nombre_servicio','Servicio'],['estado','Estado'],['deadline_contenido','Fecha límite']] as const;
export default function ContentsList(){
  const [tab,setTab]=useUrlState<'revista'|'todos'>('contents.tab','revista'),[magazines,setMagazines]=useState<Revista[]>([]),[contents,setContents]=useState<Content[]>([]),[filters,setFilters]=useUrlState<Record<string,string>>('contents.filters',Object.fromEntries([...magazineColumns,...contentColumns].map(([key])=>[key,'']))),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  useEffect(()=>{let active=true;setLoading(true);setError('');const request=tab==='revista'?apiClient.get('/api/v1/produccion/gestiones-produccion').then(r=>r.data):ContenidoService.getContenidos();request.then(data=>{if(!active)return;if(tab==='revista')setMagazines(Array.isArray(data)?data:[]);else setContents(Array.isArray(data)?data:[]);}).catch(reason=>{if(active)setError(reason.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[tab]);
  const columns=tab==='revista'?magazineColumns:contentColumns;
  const rows=tab==='revista'?magazines:contents;
  const visible=rows.filter(row=>columns.every(([key])=>matchesTableFilter(String((row as any)[key]||(key==='nombre_cuenta'?(row as any).id_cuenta:key==='nombre_servicio'?(row as any).servicio:'')).toLocaleLowerCase('es'), (filters[key]||'').trim().toLocaleLowerCase('es'))));
  return <section><ModuleTabs sub label="Vista de contenidos" value={tab} items={[{value:"revista",label:"Filtrar por revista"},{value:"todos",label:"Todos los contenidos"}]} onChange={value=>{setTab(value as "revista"|"todos");setFilters({});}}/><div data-subpanel className="rounded-b-lg border border-blue-200 border-t-0 bg-white p-5">
    {error&&<p role="alert" className="mb-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}
    <div className="overflow-x-auto rounded border bg-white"><TableFilters>{columns.map(([key,label])=><div key={key}><TableColumnFilter label={label} value={filters[key]||''} onChange={value=>setFilters(previous=>({...previous,[key]:value}))}/></div>)}</TableFilters><SortableTable className="w-full text-left text-xs"><thead className="bg-blue-950 text-white"><tr>{columns.map(([key,label])=><th key={key} className="p-3">{label}</th>)}</tr></thead><tbody>{visible.map(row=>{const id=tab==='revista'?(row as Revista).id_revista:(row as Content).id_contenido;return <tr key={id} className="border-t hover:bg-blue-50">{columns.map(([key])=><td key={key} className="p-3"><Link href={tab==='revista'?`/dashboard/produccion/contenidos/revistas/${encodeURIComponent(id)}/contenidos`:`/dashboard/produccion/contenidos/${encodeURIComponent(id)}`} className="block cursor-pointer hover:text-blue-950">{String((row as any)[key]||(key==='nombre_cuenta'?(row as any).id_cuenta:key==='nombre_servicio'?(row as any).servicio:'')||'—')}</Link></td>)}</tr>;})}</tbody></SortableTable>{loading?<p className="p-5">Cargando...</p>:!visible.length&&<p className="p-5">No hay contenidos con estos filtros.</p>}</div>
  </div></section>;
}
