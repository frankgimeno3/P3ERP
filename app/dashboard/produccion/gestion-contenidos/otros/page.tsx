'use client';
import {useCallback,useEffect,useState} from 'react';
import apiClient from '@/app/apiClient';
import {contentPending,contentTypes,materialType} from '@/app/lib/productionManagement';
import ManagementHeader from '../ManagementHeader';
import ProductionTable from '../ProductionTable';
import MaterialUploadModal from '../MaterialUploadModal';
import ContentMaterialActions from '../ContentMaterialActions';
export default function OtherManagementPage() {
 const [rows,setRows]=useState<any[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[upload,setUpload]=useState<any>(null);
 const load=useCallback(async(signal?:AbortSignal)=>{try{const r=await apiClient.get('/api/v1/produccion/repositorio',{signal});if(!signal?.aborted){setRows(r.data||[]);setError('');}}catch(e:any){if(!signal?.aborted)setError(e.message);}finally{if(!signal?.aborted)setLoading(false);}},[]);
 useEffect(()=>{const c=new AbortController();void load(c.signal);return()=>c.abort();},[load]);
 return <main className="min-h-screen bg-gray-100 p-6 text-slate-900 lg:p-12"><ManagementHeader magazine={false}/>{error&&<p role="alert" className="mb-4 text-red-700">{error}</p>}{loading?<p role="status">Cargando contenidos…</p>:<ProductionTable rows={rows.filter(row=>!row.es_revista&&contentPending(row))} columns={ [['nombre_contenido','Contenido'],['nombre_servicio','Servicio'],['nombre_cuenta','Empresa'],['nombre_completo_agente','Agente'],['estado_contenido','Estado']] } href={row=>`/dashboard/produccion/repositorio/contenidos/${encodeURIComponent(row.id_contenido)}`} actions={row=><ContentMaterialActions onUpload={finished=>setUpload({id:row.id_contenido,type:materialType(contentTypes(row)[0]),finished})}/>}/>}{upload&&<MaterialUploadModal contentId={upload.id} type={upload.type} finished={upload.finished} onClose={()=>setUpload(null)} onSaved={()=>void load()}/>}</main>;
}
