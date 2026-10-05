'use client';
import TableFilters from '@/app/components/TableFilters';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import apiClient from '@/app/apiClient';
import TableColumnFilter from '@/app/components/TableColumnFilter';
export default function TasksEmployees(){
 const [rows,setRows]=useState<any[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[filters,setFilters]=useState<Record<string,string>>({});
 useEffect(()=>{apiClient.get('/api/v1/tareas/agentes').then(r=>setRows(r.data)).catch(e=>setError(e.response?.data?.message||'No se pudieron cargar los agentes.')).finally(()=>setLoading(false));},[]);
 const columns=[['nombre','Agente empleado'],['pendientes','Pendientes'],['terminadas','Terminadas']];
 const visible=rows.filter(row=>columns.every(([key])=>String(row[key]).toLocaleLowerCase('es').includes((filters[key]||'').toLocaleLowerCase('es'))));
 return <main className="space-y-5 bg-gray-100 p-8"><h1 className="text-2xl font-semibold">Tareas por empleado</h1>{error?<p role="alert" className="text-red-700">{error}</p>:<><TableFilters>{columns.map(([key,label])=><div key={key}><TableColumnFilter label={label} value={filters[key]||''} onChange={value=>setFilters(f=>({...f,[key]:value}))}/></div>)}</TableFilters><table className="w-full rounded border border-gray-100 bg-white text-left"><thead><tr>{columns.map(([key,label])=><th key={key} className="p-3">{label}</th>)}</tr></thead><tbody>{visible.map(row=><tr key={row.id_agente} className="border-t border-gray-100"><td className="p-3"><Link href={'/dashboard/operaciones/tareas/'+encodeURIComponent(row.id_agente)} className="cursor-pointer text-blue-900 hover:underline">{row.nombre}</Link></td><td className="p-3">{row.pendientes}</td><td className="p-3">{row.terminadas}</td></tr>)}{(loading||!visible.length)&&<tr><td colSpan={3} className="p-5">{loading?'Cargando…':'No hay empleados con estos filtros.'}</td></tr>}</tbody></table></>}</main>;
}
