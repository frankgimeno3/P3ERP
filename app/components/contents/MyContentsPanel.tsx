'use client';
import {useCallback,useEffect,useState} from 'react';
import apiClient from '@/app/apiClient';
import ModuleTabs from '@/app/components/ModuleTabs';
import ProductionTable from '@/app/dashboard/produccion/gestion-contenidos/ProductionTable';
import {matchesMyContentTab} from '@/app/lib/myContents';
export default function MyContentsPanel() {
 const [tab,setTab]=useState('atencion'),[rows,setRows]=useState<any[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=useCallback(async(signal?:AbortSignal)=>{setLoading(true);setError('');try{const r=await apiClient.get('/api/v1/dashboard/mis-contenidos',{signal});if(!signal?.aborted)setRows(r.data||[]);}catch(e:any){if(!signal?.aborted)setError(e.response?.data?.message||e.message);}finally{if(!signal?.aborted)setLoading(false);}},[]);
 useEffect(()=>{const c=new AbortController();void load(c.signal);return()=>c.abort();},[load]);
 return <section className="mt-5"><ModuleTabs sub label="Mis contenidos" value={tab} onChange={setTab} items={[{value:'atencion',label:'Requiere atención'},{value:'pendiente',label:'Pendiente'},{value:'proceso',label:'En proceso'}].map(item=>({...item,label:`${item.label} (${rows.filter(row=>matchesMyContentTab(row,item.value)).length})`}))}/><div role="tabpanel" className="bg-white pt-4">{error&&<p role="alert" className="mb-4 rounded bg-red-50 p-3 text-red-700">{error}<button type="button" className="ml-3 cursor-pointer rounded border px-3 py-1 hover:bg-red-100" onClick={()=>void load()}>Reintentar</button></p>}{loading?<p role="status" className="p-4">Cargando tus contenidos…</p>:!error&&<ProductionTable key={tab} rows={rows.filter(row=>matchesMyContentTab(row,tab))} columns={[['nombre_contenido','Contenido'],['nombre_cuenta','Empresa'],['fase_nombre','Fase'],['estado_contenido','Estado'],['deadline_contenido','Fecha límite'],...(tab==='atencion'?[['motivo_atencion','Requiere atención'] as const]:[])]} href={row=>`/dashboard/produccion/repositorio/contenidos/${encodeURIComponent(row.id_contenido)}`}/>}</div></section>;
}
