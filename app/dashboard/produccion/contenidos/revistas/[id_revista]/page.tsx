'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import apiClient from '@/app/apiClient';

type Material = { id_material:string; nombre_material:string; fecha_aportado:string; validacion_produccion:string; comentarios:string; archivo_url:string };
type Content = { id_contenido:string; tipo:'articulos'|'anuncios'; nombre_empresa?:string; cliente_hoja?:string; nombre_contenido?:string; especificaciones_contenido?:string; nombre_completo_agente?:string; id_agente?:string; materiales:Material[] };
type Detail = { revista:{revista:string;edicion:string;numero_publicacion:string}; contenidos:Content[] };
const states=['no revisado produccion','incidencia','ok produccion'];
const sections=['no revisados','incidencia','ok','no recibidos'] as const;
function section(content:Content) {
  if(!content.materiales.length)return 'no recibidos';
  if(content.materiales.some(m=>m.validacion_produccion==='incidencia'))return 'incidencia';
  if(content.materiales.every(m=>m.validacion_produccion==='ok produccion'))return 'ok';
  return 'no revisados';
}

export default function GestionRevistaPage() {
  const {id_revista}=useParams<{id_revista:string}>();
  const [data,setData]=useState<Detail|null>(null),[tab,setTab]=useState<'anuncios'|'articulos'>('anuncios'),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  useEffect(()=>{if(!id_revista)return;setLoading(true);apiClient.get(`/api/v1/produccion/gestiones-produccion/${encodeURIComponent(id_revista)}`).then(response=>setData(response.data)).catch(reason=>setError(reason.response?.data?.message||reason.message)).finally(()=>setLoading(false));},[id_revista]);
  const visible=useMemo(()=>data?.contenidos.filter(item=>item.tipo===tab)||[],[data,tab]);
  const save=async(contentId:string,material:Material,patch:Partial<Material>)=>{setError('');try{
    const response=await apiClient.patch(`/api/v1/produccion/gestiones-produccion/materiales/${encodeURIComponent(material.id_material)}`,{validacion_produccion:patch.validacion_produccion??material.validacion_produccion,comentarios:patch.comentarios??material.comentarios});
    setData(current=>current&&({...current,contenidos:current.contenidos.map(item=>item.id_contenido===contentId?{...item,materiales:item.materiales.map(m=>m.id_material===material.id_material?response.data:m)}:item)}));
  }catch(reason:any){setError(reason.response?.data?.message||reason.message);}};
  const openMaterial=async(id:string)=>{try{const response=await apiClient.get(`/api/v1/produccion/gestiones-produccion/materiales/${encodeURIComponent(id)}/descarga`);window.location.assign(response.data.url);}catch(reason:any){setError(reason.response?.data?.message||reason.message);}};
  return <main className="min-h-screen bg-gray-100 px-6 py-8 text-slate-900 lg:px-12"><Link href="/dashboard/produccion/contenidos" className="cursor-pointer rounded text-blue-900 hover:underline">← Volver a contenidos</Link>
    {loading?<p className="mt-6">Cargando…</p>:!data?<p role="alert" className="mt-6 text-red-700">{error||'Revista no encontrada'}</p>:<><h1 className="mt-5 text-2xl font-semibold">{data.revista.revista} · {data.revista.edicion} · {data.revista.numero_publicacion}</h1>
      <nav className="mt-6 flex gap-2" aria-label="Tipo de contenido">{(['anuncios','articulos'] as const).map(tipo=><button key={tipo} type="button" onClick={()=>setTab(tipo)} className={`cursor-pointer rounded px-4 py-2 capitalize transition hover:bg-blue-100 ${tab===tipo?'bg-blue-950 text-white hover:bg-blue-900':'bg-white'}`}>{tipo==='articulos'?'Artículos':'Anuncios'}</button>)}</nav>
      {error&&<p role="alert" className="mt-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}
      {sections.map(group=><section key={group} className="mt-7"><h2 className="mb-3 text-lg font-semibold capitalize">{group==='no recibidos'?'No recibidos':group==='no revisados'?'No revisados':group==='ok'?'OK producción':'Incidencia'} <span className="text-sm text-slate-500">({visible.filter(item=>section(item)===group).length})</span></h2>
        <div className="space-y-3">{visible.filter(item=>section(item)===group).map(item=><details key={`${item.id_contenido}-${item.tipo}`} className="rounded border border-slate-200 bg-white shadow-sm"><summary className="grid cursor-pointer gap-2 rounded p-4 transition hover:bg-blue-50 md:grid-cols-4"><span><strong className="block text-xs text-slate-500">Empresa</strong>{item.nombre_empresa||item.cliente_hoja||'—'}</span><span><strong className="block text-xs text-slate-500">Contenido</strong>{item.nombre_contenido||item.especificaciones_contenido||item.id_contenido}</span><span><strong className="block text-xs text-slate-500">Fecha recepción</strong>{item.materiales[0]?.fecha_aportado?new Date(item.materiales[0].fecha_aportado).toLocaleDateString('es-ES'):'No recibido'}</span><span><strong className="block text-xs text-slate-500">Agente</strong>{item.nombre_completo_agente||item.id_agente||'—'}</span></summary><div className="border-t p-4"><Link href={`/dashboard/produccion/contenidos/${encodeURIComponent(item.id_contenido)}?revista=${encodeURIComponent(id_revista)}&tipo=${tab}`} className="mb-3 inline-block cursor-pointer text-sm text-blue-900 hover:underline">Ver contenido y agregar materiales →</Link>{!item.materiales.length?<p className="text-sm text-slate-500">Todavía no se han aportado materiales.</p>:<div className="space-y-3">{item.materiales.map(material=><div key={material.id_material} className="grid gap-3 rounded bg-slate-50 p-3 lg:grid-cols-[minmax(0,1fr)_140px_200px_minmax(0,1fr)]"><button type="button" onClick={()=>openMaterial(material.id_material)} className="cursor-pointer text-left text-blue-900 hover:underline">{material.nombre_material}</button><span className="text-sm">{new Date(material.fecha_aportado).toLocaleDateString('es-ES')}</span><select aria-label={`Estado de ${material.nombre_material}`} value={material.validacion_produccion} onChange={event=>save(item.id_contenido,material,{validacion_produccion:event.target.value})} className="cursor-pointer rounded border p-2 hover:border-blue-900">{states.map(state=><option key={state} value={state}>{state}</option>)}</select><label className="text-xs text-slate-600">Comentarios producción<textarea key={`${material.id_material}-${material.comentarios}`} defaultValue={material.comentarios||''} onBlur={event=>{if(event.target.value!==material.comentarios)save(item.id_contenido,material,{comentarios:event.target.value});}} className="mt-1 min-h-16 w-full rounded border p-2 text-sm" /></label></div>)}</div>}</div></details>)}{!visible.some(item=>section(item)===group)&&<p className="rounded border border-dashed bg-white p-4 text-sm text-slate-500">Sin contenidos en esta sección.</p>}</div></section>)}
    </>}
  </main>;
}
