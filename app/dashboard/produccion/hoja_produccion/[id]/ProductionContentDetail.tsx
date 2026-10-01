'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import apiClient from '@/app/apiClient';
import { ContenidoService } from '@/app/service/ContenidoService';
import { MaterialService } from '@/app/service/MaterialService';
import ContentFieldsEditor from './ContentFieldsEditor';

type Material = { id_material:string; nombre_material:string; validacion_produccion:string; comentarios:string; fecha_aportado?:string; archivo_url?:string };
type Magazine = { id_revista:string; revista:string; edicion:string; numero_publicacion:string };
const fields:[string,string][]=[['nombre_contenido','Nombre'],['especificaciones_contenido','Especificaciones'],['nombre_cuenta','Empresa'],['cliente_hoja','Cliente'],['id_agente','Agente'],['tipo_revista_servicio','Servicio'],['publicacion_num_web','Publicación / Nº web'],['id_contrato','Contrato'],['deadline_contenido','Fecha límite'],['estado_contenido','Estado']];

function ContenidoHojaProduccionDetail({backHref,backLabel}:{backHref:string;backLabel:string}) {
  const {id}=useParams<{id:string}>();const search=useSearchParams();
  const [content,setContent]=useState<any>(null),[materials,setMaterials]=useState<Material[]>([]),[magazines,setMagazines]=useState<Magazine[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[modal,setModal]=useState(false),[busy,setBusy]=useState(false);
  const [file,setFile]=useState<File|null>(null),[name,setName]=useState(''),[magazine,setMagazine]=useState(''),[type,setType]=useState<'articulos'|'anuncios'>('anuncios');
  const refresh=async()=>{const [c,m]=await Promise.all([ContenidoService.getContenidoById(id),MaterialService.getMateriales()]);setContent(c);setMaterials(Array.isArray(m)?m:[]);};
  useEffect(()=>{if(!id)return;setLoading(true);Promise.all([ContenidoService.getContenidoById(id),MaterialService.getMateriales(),apiClient.get(`/api/v1/produccion/gestiones-produccion/para-contenido/${encodeURIComponent(id)}`)]).then(([c,m,r])=>{setContent(c);setMaterials(Array.isArray(m)?m:[]);setMagazines(r.data||[]);setMagazine(search.get('revista')||r.data?.[0]?.id_revista||'');setType(search.get('tipo')==='articulos'?'articulos':'anuncios');}).catch(reason=>setError(reason.response?.data?.message||reason.message)).finally(()=>setLoading(false));},[id,search]);
  useEffect(()=>{if(!modal)return;const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setModal(false);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[modal]);
  const upload=async(event:React.FormEvent)=>{event.preventDefault();if(!file||busy)return;setBusy(true);setError('');try{
    const destination={id_contenido:id,id_revista:magazine,tipo:type,filename:file.name,contentType:file.type||'application/octet-stream'};
    const signed=(await apiClient.post('/api/v1/produccion/gestiones-produccion/materiales/presign',destination)).data;
    const uploaded=await fetch(signed.uploadUrl,{method:'PUT',headers:{'Content-Type':destination.contentType},body:file});
    if(!uploaded.ok)throw new Error('No se pudo subir el archivo a S3.');
    await apiClient.post('/api/v1/produccion/gestiones-produccion/materiales',{...destination,mediaId:signed.mediaId,s3Key:signed.s3Key,cdnUrl:signed.cdnUrl,nombre_material:name.trim()||file.name});
    await refresh();setModal(false);setFile(null);setName('');
  }catch(reason:any){setError(reason.response?.data?.message||reason.message);}finally{setBusy(false);}};
  const linked=materials.filter(material=>(content?.array_ids_materiales||[]).includes(material.id_material));
  const openMaterial=async(id:string)=>{try{const response=await apiClient.get(`/api/v1/produccion/gestiones-produccion/materiales/${encodeURIComponent(id)}/descarga`);window.location.assign(response.data.url);}catch(reason:any){setError(reason.response?.data?.message||reason.message);}};
  return <main className="min-h-screen bg-gray-100 px-6 py-8 text-slate-900 lg:px-12"><Link href={backHref} className="cursor-pointer text-blue-900 hover:underline">← {backLabel}</Link>
    {loading?<p className="mt-6">Cargando…</p>:!content?<p role="alert" className="mt-6 text-red-700">{error||'Contenido no encontrado'}</p>:<><h1 className="mt-5 text-2xl font-semibold">{content.nombre_contenido||content.id_contenido}</h1><p className="text-sm text-slate-500">{content.id_contenido}</p>
      {error&&<p role="alert" className="mt-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}
      <section className="mt-6 grid gap-4 rounded border bg-white p-5 sm:grid-cols-2 lg:grid-cols-3">{fields.filter(([key])=>!['especificaciones_contenido','publicacion_num_web','id_agente','deadline_contenido','estado_contenido'].includes(key)).map(([key,label])=><div key={key}><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p>{String((key==='cliente_hoja'?content.nombre_cuenta||content[key]:content[key])||'—')}</p></div>)}<ContentFieldsEditor key={content.id_contenido} content={content} onSaved={setContent}/></section>
      <section className="mt-6 rounded border bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Materiales</h2><p className="text-sm text-slate-500">Un archivo por material, vinculado a este contenido.</p></div><button onClick={()=>setModal(true)} className="cursor-pointer rounded bg-blue-950 px-4 py-2 text-white hover:bg-blue-800">Agregar materiales</button></div>
        {!linked.length?<p className="mt-5 text-sm text-slate-500">No hay materiales aportados.</p>:<ul className="mt-5 space-y-3">{linked.map(material=><li key={material.id_material} className="flex flex-wrap items-center justify-between gap-3 rounded border p-3"><span className="font-medium">{material.nombre_material}</span><span className="text-sm text-slate-600">{material.fecha_aportado?new Date(material.fecha_aportado).toLocaleDateString('es-ES'):'—'} · {material.validacion_produccion}</span><button type="button" onClick={()=>openMaterial(material.id_material)} className="cursor-pointer text-blue-900 hover:underline">Abrir archivo</button></li>)}</ul>}
      </section></>}
    {modal&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><section role="dialog" aria-modal="true" aria-labelledby="material-title" className="relative w-full max-w-lg rounded bg-white p-6 shadow-xl"><button type="button" onClick={()=>setModal(false)} aria-label="Cerrar" className="absolute right-3 top-2 cursor-pointer rounded px-2 text-2xl hover:bg-slate-100">×</button><h2 id="material-title" className="mb-5 text-xl font-semibold">Agregar material</h2><form onSubmit={upload} className="space-y-4"><label className="block">Tipo<select value={type} onChange={event=>setType(event.target.value as 'articulos'|'anuncios')} className="mt-1 w-full cursor-pointer rounded border p-2 hover:border-blue-900"><option value="anuncios">Anuncio</option><option value="articulos">Artículo</option></select></label>{magazines.length>0&&<label className="block">Revista<select value={magazine} onChange={event=>setMagazine(event.target.value)} className="mt-1 w-full cursor-pointer rounded border p-2 hover:border-blue-900">{magazines.map(row=><option key={row.id_revista} value={row.id_revista}>{row.revista} · {row.edicion} · {row.numero_publicacion}</option>)}</select></label>}<label className="block">Nombre del material<input value={name} onChange={event=>setName(event.target.value)} placeholder="Nombre del archivo" className="mt-1 w-full rounded border p-2" /></label><label className="block">Archivo<input required type="file" onChange={event=>setFile(event.target.files?.[0]||null)} className="mt-1 w-full cursor-pointer rounded border p-2 hover:border-blue-900" /></label><button disabled={busy||!file} className="cursor-pointer rounded bg-blue-950 px-4 py-2 text-white hover:bg-blue-800 disabled:cursor-default disabled:opacity-50">{busy?'Subiendo…':'Subir y registrar'}</button></form></section></div>}
  </main>;
}

export default function ContenidoHojaProduccionPage({backHref='/dashboard/produccion/hoja_produccion',backLabel='Volver a hoja de producción'}:{backHref?:string;backLabel?:string}) {
  return <Suspense fallback={<p className="p-8">Cargando contenido…</p>}><ContenidoHojaProduccionDetail backHref={backHref} backLabel={backLabel}/></Suspense>;
}
