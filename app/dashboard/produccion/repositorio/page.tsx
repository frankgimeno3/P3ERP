'use client';
import {useEffect,useState} from 'react';
import apiClient from '@/app/apiClient';
import ModuleTabs from '@/app/components/ModuleTabs';
import {contentMagazineFormatLabel} from '@/app/lib/contentMagazineFormat';
import {versionLabel} from '@/app/lib/productionWorkflow';
import ProductionTable from '../gestion-contenidos/ProductionTable';
export default function RepositoryPage() {
 const [tab,setTab]=useState('contenidos'),[rows,setRows]=useState<any[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{const c=new AbortController();setLoading(true);setRows([]);setError('');apiClient.get('/api/v1/produccion/repositorio',{params:{tipo:tab},signal:c.signal}).then(r=>{if(!c.signal.aborted)setRows(r.data||[]);}).catch(e=>{if(!c.signal.aborted)setError(e.message);}).finally(()=>{if(!c.signal.aborted)setLoading(false);});return()=>c.abort();},[tab]);
 const materials=tab==='materiales';
 const [onlyArticles,setOnlyArticles]=useState(false);
 useEffect(()=>setOnlyArticles(new URLSearchParams(window.location.search).get('tipo')==='articulos'),[]);
 const shown=rows.filter(row=>materials||!onlyArticles||row.tipo_contenido==='articulo'||row.es_editorial||row.categorias_gestion?.includes('articulo')).map(row=>({...row,formato:row.es_revista?contentMagazineFormatLabel(row):'',nombre_contenido:row.nombre_contenido||row.especificaciones_contenido||row.id_contenido,version:row.es_version_acabada?versionLabel(row.numero_version):'Material',estado_contenido:row.estado_contenido||'Sin estado'}));
 return <main className="min-h-screen bg-gray-100 p-6 text-slate-900 lg:p-12"><h1 className="mb-3 text-2xl font-semibold text-blue-950">Almacenamiento</h1><p className="mb-6 text-sm text-slate-600">Todos los contenidos y materiales: pendientes, publicados y cancelados. Usa los filtros para encontrarlos.</p><ModuleTabs plain label="Almacenamiento" value={tab} onChange={setTab} items={[{value:'contenidos',label:'Contenidos'},{value:'materiales',label:'Materiales'}]}/><section role="tabpanel" className="rounded-b-lg bg-white p-5">{error&&<p role="alert" className="mb-4 text-red-700">{error}</p>}{loading?<p role="status">Cargando almacenamiento…</p>:<ProductionTable key={tab} rows={shown} filterOptions={{estado_contenido:Array.from(new Set(shown.map(row=>row.estado_contenido))).sort()}} columns={materials?[['id_material','ID material'],['nombre_material','Material'],['nombre_contenido','Contenido'],['nombre_cuenta','Empresa'],['estado_contenido','Estado contenido'],['version','Versión']]:[['id_contenido','ID contenido'],['nombre_contenido','Contenido'],['nombre_servicio','Servicio'],['formato','Formato revista'],['nombre_cuenta','Empresa'],['nombre_completo_agente','Agente'],['estado_contenido','Estado']]} href={row=>`/dashboard/produccion/repositorio/${materials?'materiales':'contenidos'}/${encodeURIComponent(materials?row.id_material:row.id_contenido)}`}/>}</section></main>;
}
