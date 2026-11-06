'use client';
import {useEffect,useState} from 'react';
import apiClient from '@/app/apiClient';
import ModuleTabs from '@/app/components/ModuleTabs';
import {productionMagazineFamilies,productionMagazineFamily,magazineNumberLabel} from '@/app/config/productionMagazineFilters';
import ManagementHeader from '../ManagementHeader';
import ProductionTable from '../ProductionTable';
export default function MagazineManagementPage() {
 const [family,setFamily]=useState('vidrio-espana'),[rows,setRows]=useState<any[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();apiClient.get('/api/v1/produccion/gestiones-produccion',{signal:controller.signal}).then(r=>{if(!controller.signal.aborted)setRows(r.data||[]);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[]);
 return <main className="min-h-screen bg-gray-100 p-6 text-slate-900 lg:p-12"><ManagementHeader magazine/><ModuleTabs plain label="Publicación" value={family} onChange={setFamily} items={productionMagazineFamilies.map(([value,label])=>({value,label}))}/><section role="tabpanel" className="rounded-b-lg bg-white p-5">{error&&<p role="alert" className="mb-4 text-red-700">{error}</p>}{loading?<p role="status">Cargando publicaciones…</p>:<ProductionTable key={family} rows={rows.filter(row=>productionMagazineFamily(row)===family).map(row=>({...row,numero_formato:magazineNumberLabel(row)}))} columns={ [['numero_formato','Número'],['revista','Publicación'],['edicion','Edición'],['fecha_publicacion','Fecha publicación']] } href={row=>`/dashboard/produccion/gestion-contenidos/revista/${encodeURIComponent(row.id_revista)}`}/>}</section></main>;
}
