'use client';
import {useEffect,useState} from 'react';
import apiClient from '@/app/apiClient';
import {productionMagazineFamilies,productionMagazineFamily,magazineNumberLabel} from '@/app/config/productionMagazineFilters';
import ModuleTabs from '@/app/components/ModuleTabs';
import Folder from './Folder';
export default function CharlyPage(){
 const [family,setFamily]=useState('vidrio-espana'),[rows,setRows]=useState<any[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{const c=new AbortController();apiClient.get('/api/v1/produccion/gestiones-produccion',{params:{pendientes:'1'},signal:c.signal}).then(r=>setRows(r.data||[])).catch(()=>{if(!c.signal.aborted)setError('No se pudieron cargar las revistas.');}).finally(()=>{if(!c.signal.aborted)setLoading(false);});return()=>c.abort();},[]);
 const visible=rows.filter(row=>productionMagazineFamily(row)===family&&Number(row.contenidos_pendientes)>0);
 return <main className="min-h-screen bg-gray-100 p-6 text-slate-900 lg:p-12"><h1 className="mb-6 text-3xl font-semibold text-blue-950">Charly</h1><section className="rounded-xl bg-white p-6"><h2 className="mb-5 text-xl font-semibold">Contenidos para revista pendientes publicar</h2><ModuleTabs label="Filtrar por revista" value={family} onChange={setFamily} items={productionMagazineFamilies.map(([value,label])=>({value,label}))}/>{error&&<p role="alert">{error}</p>}{loading?<p role="status">Cargando revistas…</p>:<div className="flex flex-wrap gap-5 py-6">{visible.map(row=><Folder key={row.id_revista} href={`/dashboard/produccion/charly/${encodeURIComponent(row.id_revista)}`} label={magazineNumberLabel(row)} detail={`${row.contenidos_pendientes} contenidos pendientes`}/>)}{!visible.length&&<p>No hay números pendientes en esta revista.</p>}</div>}</section></main>;
}
