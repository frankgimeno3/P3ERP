'use client';
import {useCallback,useEffect,useState} from 'react';
import {useParams} from 'next/navigation';
import {contentMagazineFormatLabel} from '@/app/lib/contentMagazineFormat';
import ProductionPhaseIcon from '@/app/components/ProductionPhaseIcon';
import apiClient from '@/app/apiClient';
import ModuleTabs from '@/app/components/ModuleTabs';
import {magazineNumberLabel} from '@/app/config/productionMagazineFilters';
import {contentPending} from '@/app/lib/productionManagement';
import {productionStages,productionStage,productionSubstage,productionPhaseName,contentDisplayName} from '@/app/lib/productionWorkflow';
import ProductionTable from '../../ProductionTable';
export default function MagazineWorkflowPage(){
 const {id_revista}=useParams<{id_revista:string}>();
 const [data,setData]=useState<any>(null),[stage,setStage]=useState('recibir'),[sub,setSub]=useState('3.1'),[type,setType]=useState('anuncios'),[error,setError]=useState('');
 const load=useCallback(async(signal:AbortSignal)=>{try{const r=await apiClient.get(`/api/v1/produccion/gestiones-produccion/${encodeURIComponent(id_revista)}`,{signal});if(!signal.aborted){setData(r.data);setError('');}}catch(e:any){if(!signal.aborted)setError(e.message);}},[id_revista]);
 useEffect(()=>{const c=new AbortController();void load(c.signal);return()=>c.abort();},[load]);
 const pending=(data?.contenidos||[]).filter(contentPending);
 const selected=pending.filter((row:any)=>stage==='todo'||productionStage(row)===stage);
 const subdivided=selected.filter((row:any)=>!['maquetacion','correccion'].includes(stage)||productionSubstage(row)===sub);
 const editorialOnly=['correccion','revision'].includes(stage),positionFirst=['todo','publicacion'].includes(stage);
 const selectedType=editorialOnly?'articulos':type;
 const rows=subdivided.filter((row:any)=>stage==='todo'||row.tipo===selectedType).map((row:any)=>({...row,
  nombre_contenido:contentDisplayName(row),fase_nombre:productionPhaseName(row),formato:contentMagazineFormatLabel(row),
  tipo_nombre:row.tipo==='articulos'?'Artículo':'Anuncio',paginas_ocupadas:row.paginas_ocupadas??'Sin indicar',
  posicion:row.posicion_revista??(row.paginas_definitivas?.length?Math.min(...row.paginas_definitivas):null),
  nombre_cuenta:row.nombre_empresa||row.cliente_hoja,nombre_agente:row.nombre_completo_agente||row.id_agente}));
 const changeStage=(value:string)=>{setStage(value);setSub(value==='correccion'?'gm':'3.1');};
 const subs=stage==='maquetacion'?[{value:'3.1',label:'3.1 · Contenido no descargado'},{value:'3.2',label:'3.2 · Pendiente enviar corrección'}]:[{value:'gm',label:'Corrección GM'},{value:'otros',label:'Corrección otros'}];
 return <main className="min-h-screen bg-gray-100 p-6 text-slate-900 lg:p-12">{error&&<p role="alert" className="text-red-700">{error}</p>}{!data&&!error?<p role="status">Cargando revista…</p>:data&&<>
  <h1 className="my-6 text-2xl font-semibold text-blue-950">{data.revista.revista} · {data.revista.edicion} · {magazineNumberLabel(data.revista)}</h1>
  <ModuleTabs plain splitLast label="Fase de producción" value={stage} onChange={changeStage} items={productionStages.map(item=>({...item,label:`${item.label} (${pending.filter((row:any)=>item.value==='todo'||productionStage(row)===item.value).length})`,icon:<ProductionPhaseIcon phase={item.value}/>}))}/>
  <section role="tabpanel" className="rounded-b-lg bg-white p-5"><h2 className="mb-4 text-xl font-semibold text-blue-950">{productionStages.find(item=>item.value===stage)?.title}</h2>
   {['maquetacion','correccion'].includes(stage)&&<ModuleTabs sub label="Subfase" value={sub} onChange={setSub} items={subs.map(item=>({...item,label:`${item.label} (${selected.filter((row:any)=>productionSubstage(row)===item.value).length})`}))}/>}
   {stage!=='todo'&&<ModuleTabs sub label="Tipo de contenido" value={selectedType} onChange={setType} items={(editorialOnly?['articulos']:['anuncios','articulos']).map(value=>({value,label:`${stage==='maquetacion'?(value==='anuncios'?'Anuncios a revisar y descargar':'Artículos a maquetar'):(value==='anuncios'?'Anuncios':'Artículos')} (${subdivided.filter((row:any)=>row.tipo===value).length})`}))}/>}
   <div className="pt-4"><ProductionTable key={stage+sub+selectedType} rows={rows} initialSortColumn={positionFirst?0:undefined} columns={[
    ...(positionFirst?[['posicion','Posición'] as const]:[]),['nombre_contenido','Contenido'],...(stage==='todo'?[['tipo_nombre','Tipo'] as const]:[]),
    ['fase_nombre','Fase'],['formato','Formato'],['paginas_ocupadas','Páginas ocupadas'],['nombre_cuenta','Empresa'],['nombre_agente','Agente']
   ]} href={row=>`/dashboard/produccion/repositorio/contenidos/${encodeURIComponent(row.id_contenido)}`}/></div>
  </section></>}</main>;
}
