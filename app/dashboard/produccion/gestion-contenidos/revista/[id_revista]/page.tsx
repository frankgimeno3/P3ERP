'use client';
import {useCallback,useEffect,useState} from 'react';
import {useParams} from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/app/apiClient';
import ModuleTabs from '@/app/components/ModuleTabs';
import {contentPending} from '@/app/lib/productionManagement';
import {productionStages,productionStage} from '@/app/lib/productionWorkflow';
import ProductionTable from '../../ProductionTable';
import MaterialUploadModal from '../../MaterialUploadModal';
import ContentMaterialActions from '../../ContentMaterialActions';
export default function MagazineWorkflowPage() {
 const {id_revista}=useParams<{id_revista:string}>();
 const [data,setData]=useState<any>(null),[stage,setStage]=useState('recibir'),[type,setType]=useState('anuncios'),[loading,setLoading]=useState(true),[error,setError]=useState(''),[upload,setUpload]=useState<any>(null);
 const load=useCallback(async(signal?:AbortSignal)=>{try{const r=await apiClient.get(`/api/v1/produccion/gestiones-produccion/${encodeURIComponent(id_revista)}`,{signal});if(!signal?.aborted){setData(r.data);setError('');}}catch(e:any){if(!signal?.aborted)setError(e.message);}finally{if(!signal?.aborted)setLoading(false);}},[id_revista]);
 useEffect(()=>{const c=new AbortController();void load(c.signal);return()=>c.abort();},[load]);
 const pending=(data?.contenidos||[]).filter(contentPending);
 const selected=pending.filter((row:any)=>stage==='todo'||productionStage(row)===stage);
 const rows=selected.filter((row:any)=>row.tipo===type).map((row:any)=>({...row,nombre_contenido:row.nombre_contenido||row.especificaciones_contenido||row.id_contenido,paginas:row.paginas_definitivas?.length?row.paginas_definitivas.map((page:number)=>page===-1?'Portada':page===0?'Interior portada':page).join(', '):row.pagina_hoja||'Sin asignar',nombre_cuenta:row.nombre_empresa||row.cliente_hoja,nombre_agente:row.nombre_completo_agente||row.id_agente}));
 return <main className="min-h-screen bg-gray-100 p-6 text-slate-900 lg:p-12"><Link href="/dashboard/produccion/gestion-contenidos/revista" className="cursor-pointer text-blue-900 hover:underline">← Volver a contenido revista</Link>{error&&<p role="alert" className="mt-4 text-red-700">{error}</p>}{loading&&!data?<p role="status" className="mt-5">Cargando revista…</p>:data&&<><h1 className="my-6 text-2xl font-semibold text-blue-950">{data.revista.revista} · {data.revista.edicion} · {data.revista.numero_publicacion}</h1><div className="overflow-x-auto"><div className="min-w-max"><ModuleTabs plain label="Fase de producción" value={stage} onChange={setStage} items={productionStages}/></div></div><section role="tabpanel" className="rounded-b-lg border bg-white p-5"><ModuleTabs sub label="Tipo de contenido" value={type} onChange={setType} items={[{value:'anuncios',label:`Anuncios (${selected.filter((row:any)=>row.tipo==='anuncios').length})`},{value:'articulos',label:`Artículos (${selected.filter((row:any)=>row.tipo==='articulos').length})`}]}/><div role="tabpanel" className="pt-4"><ProductionTable key={stage+type} rows={rows} columns={ [['nombre_contenido','Contenido'],['paginas','Páginas'],['nombre_cuenta','Empresa'],['nombre_agente','Agente']] } href={row=>`/dashboard/produccion/repositorio/contenidos/${encodeURIComponent(row.id_contenido)}`} actions={row=><ContentMaterialActions onUpload={finished=>setUpload({id:row.id_contenido,finished})}/>}/></div></section></>}{upload&&<MaterialUploadModal contentId={upload.id} magazineId={id_revista} type={type} finished={upload.finished} onClose={()=>setUpload(null)} onSaved={()=>void load()}/>}</main>;
}
