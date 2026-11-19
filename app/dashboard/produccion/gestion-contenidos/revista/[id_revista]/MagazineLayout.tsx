'use client';
import Link from 'next/link';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import apiClient from '@/app/apiClient';
import ModuleTabs from '@/app/components/ModuleTabs';
import TableFilters from '@/app/components/TableFilters';
import {buildMagazineLayout,layoutKey,layoutSupports} from '@/app/lib/magazineLayout';
import {contentDisplayName} from '@/app/lib/productionWorkflow';
import {charlyReservedPages} from '@/app/lib/charlyPlanning';
import {mergeMagazinePdf} from '@/app/lib/mergeMagazinePdf';
import LayoutEntryModal from './LayoutEntryModal';
import PdfLayoutThumbnail from './PdfLayoutThumbnail';

const button='rounded border border-blue-950 px-3 py-2 text-sm text-blue-950 enabled:cursor-pointer enabled:hover:bg-blue-50 disabled:cursor-default disabled:opacity-40';
const rowHeight=246;
type PlanRow = { id_contenido: string; tipo: string; planning: { posicion: string | number; paginas: string | number; seccion: string }; provisional: boolean };
type PreviewPage = { posicion: number; label: string; parte: number; item: { tipo: string; id_material: string; key: string } | null };
const emptyPlanning: PlanRow[] = [];
const pageType = (position: number, type?: string) => position === -1 ? 'Portada' : position === 0 ? 'Interior de portada'
  : charlyReservedPages[position as keyof typeof charlyReservedPages] || (type === 'articulos' ? 'Artículo' : type === 'anuncios' ? 'Anuncio' : 'Sin contenido');
function saveFile(blob:Blob,name:string) {const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name.replace(/[\\/\x00-\x1f]/g,'_');document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}
export default function MagazineLayout({magazineId,fixedSupport,planning=emptyPlanning}:{magazineId:string;fixedSupport?:string;planning?:PlanRow[]}) {
  const base=`/api/v1/produccion/gestiones-produccion/${encodeURIComponent(magazineId)}/maqueta`;
  const [support,setSupport]=useState(fixedSupport||'impresa'),[states,setStates]=useState<Record<string,string>>({impresa:'pendiente',digital:'pendiente'});
  const [data,setData]=useState<any>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[downloading,setDownloading]=useState(false),[progress,setProgress]=useState(''),[total,setTotal]=useState('8');
  const [modal,setModal]=useState<string|null>(null),[selected,setSelected]=useState<number|null>(null),[query,setQuery]=useState(''),[type,setType]=useState(''),[section,setSection]=useState('');
  const pdfs=useRef(new Map<string,Promise<any>>());
  const [preview,setPreview]=useState<number|null>(null);
  const load=useCallback(async(signal?:AbortSignal)=>{setLoading(true);try{const response=await apiClient.get(base,{params:{soporte:support},signal});if(!signal?.aborted){setData(response.data);setStates(response.data.estados);setTotal(String(response.data.total_paginas));setError('');}}catch(reason:any){if(!signal?.aborted)setError(reason.response?.data?.message||'No se pudo cargar la maqueta.');}finally{if(!signal?.aborted)setLoading(false);}},[base,support]);
  useEffect(()=>{const controller=new AbortController();setData(null);setModal(null);setQuery('');setType('');setSection('');setSelected(null);void load(controller.signal);const cache=pdfs.current;return()=>{controller.abort();for(const document of cache.values())void document.then(pdf=>pdf.destroy()).catch(()=>{});cache.clear();};},[load]);
  const model=useMemo(()=>data?buildMagazineLayout(data.contenidos,data.entradas,support,data.total_paginas,data.estado==='publicada'):null,[data,support]);
  const displayModel=useMemo(() => {
    if (!data || !model || !planning.length) return model;
    const needed = Math.min(1000, Math.max(8, ...planning.map(row => Number(row.planning.posicion) + Number(row.planning.paginas) + 1)));
    return needed > model.total ? buildMagazineLayout(data.contenidos,data.entradas,support,needed,data.estado==='publicada') : model;
  }, [data, model, planning, support]);
  const previewPage: PreviewPage | null | undefined = preview === null ? null : displayModel?.pages.find(page => page.posicion === preview);
  const plannedAt = (position: number) => Object.hasOwn(charlyReservedPages, position) ? [] :
    planning.filter(row => position >= Number(row.planning.posicion) && position < Number(row.planning.posicion) + Number(row.planning.paginas));
  useEffect(() => {
    if (preview === null) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setPreview(null); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [preview]);
  const save=async(change:any)=>{if(!data||busy)return false;setBusy(true);setError('');try{const response=await apiClient.post(base,{...change,soporte:support,expectedVersion:data.version,revision:data.revision});setData(response.data);setStates(response.data.estados);setTotal(String(response.data.total_paginas));return true;}catch(reason:any){setError(reason.response?.data?.message||'No se pudo guardar la maqueta.');return false;}finally{setBusy(false);}};
  const loadPdf=useCallback((id:string)=>{
    if(!pdfs.current.has(id))pdfs.current.set(id,(async()=>{const {data:file}=await apiClient.get(base+'/archivo',{params:{soporte:support,material:id}});const pdfjs=await import('pdfjs-dist');pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url).toString();return pdfjs.getDocument({url:file.url,withCredentials:false}).promise;})());
    return pdfs.current.get(id)!;
  },[base,support]);
  const download=async(material?:string)=>{if(downloading||!data)return;setDownloading(true);setError('');setProgress('Preparando descarga…');try{
    if(material){const {data:file}=await apiClient.get(base+'/archivo',{params:{soporte:support,material}});const response=await fetch(file.url);if(!response.ok)throw Error('No se pudo descargar el PDF.');saveFile(await response.blob(),`contenido-${material}.pdf`);}
    else {const {data:manifest}=await apiClient.get(base+'/descarga',{params:{soporte:support,revision:data.revision}});const bytes=await mergeMagazinePdf(manifest,undefined,setProgress);saveFile(new Blob([bytes as BlobPart],{type:'application/pdf'}),manifest.nombre);}
  }catch(reason:any){setError(reason.response?.data?.message||reason.message||'No se pudo descargar.');}finally{setDownloading(false);setProgress('');}};
  const choosePage=(position:number)=>{setSelected(position);document.getElementById(`maqueta-${support}-${position}`)?.scrollIntoView({block:'nearest',behavior:'smooth'});};
  const disabled=busy||downloading,editable=data?.estado!=='publicada';
  const cards=model?.pages.filter((page:any)=>{const item=page.item;if(!item)return false;return (!type||item.tipo===type)&&(!section||item.seccion===section)&&`${item.nombre} ${item.empresa}`.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es'));})||[];
  return <div className="pt-4">
    {!fixedSupport&&<ModuleTabs sub label="Soporte de la maqueta" value={support} disabled={disabled} onChange={setSupport} items={layoutSupports.map(value=>({value,label:`${value==='impresa'?'Impresa':'Digital'} - ${states[value]}`}))}/>}
    {error&&<p role="alert" className="my-4 rounded border border-red-200 bg-red-50 p-3 text-red-800">{error}</p>}
    {loading?<p role="status" className="py-6">Cargando maqueta…</p>:data&&model&&displayModel&&<>
      <div className="my-5 flex flex-wrap items-end justify-between gap-4"><div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">Estado de la maqueta<select aria-label="Estado de la maqueta" disabled={disabled} value={data.estado} onChange={event=>void save({accion:'estado',estado:event.target.value})} className="mt-1 block rounded border bg-white p-2 enabled:cursor-pointer enabled:hover:border-blue-900 disabled:opacity-50"><option value="pendiente">Pendiente</option><option value="publicada">Publicada</option></select></label>
        <label className="text-sm">Páginas físicas<input type="number" min="2" max="1000" step="2" value={total} disabled={disabled||!editable} onChange={event=>setTotal(event.target.value)} className="mt-1 block w-28 rounded border p-2 disabled:bg-slate-100"/></label>
        <button type="button" disabled={disabled||!editable} onClick={()=>void save({accion:'paginas',total_paginas:Number(total)})} className={button}>Guardar páginas</button>
        <button type="button" disabled={disabled||!editable} onClick={()=>setModal('')} className={button}>Configurar contenido</button>
      </div><div className="flex flex-wrap gap-2"><button type="button" disabled={disabled} onClick={()=>void load()} className={button}>Actualizar</button><button type="button" disabled={disabled||!model.items.length||!!model.issues.length} onClick={()=>void download()} className="rounded bg-blue-950 px-4 py-2 text-sm text-white enabled:cursor-pointer enabled:hover:bg-blue-800 disabled:cursor-default disabled:opacity-40">Descargar todos (PDF)</button></div></div>
      <p className="mb-4 text-xs text-slate-600">Portada −1 e interior 0 no llevan número impreso. La página 1 es la tercera página física. Los huecos se descargan como páginas en blanco. Para editar una maqueta publicada, cambia su estado a pendiente.</p>
      {progress&&<p role="status" className="mb-4 text-sm text-blue-900">{progress}</p>}
      {!!model.issues.length&&<details className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><summary className="cursor-pointer font-medium hover:text-amber-700">Pendiente de completar ({model.issues.length})</summary><ul className="mt-2 list-disc pl-5">{model.issues.map((issue:string)=><li key={issue}>{issue}</li>)}</ul></details>}
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-6">
        <section aria-label="Miniatura de la maqueta" className="min-w-0 rounded-lg border border-slate-200 p-3"><h3 className="mb-4 font-semibold text-blue-950">Maqueta</h3>
          <div className="grid grid-cols-[minmax(90px,1fr)_minmax(0,340px)] items-start gap-3">
            <div aria-label="Secciones de la revista" className="relative" style={{height:displayModel.spreads.length*rowHeight}}>{displayModel.sections.map((run:any,index:number)=><div key={index} title={`${run.name}: ${run.from} — ${run.to}`} className={`absolute inset-x-0 flex flex-col justify-center overflow-hidden rounded border p-2 text-xs ${run.name==='Sin contenido'?'border-dashed border-slate-200 bg-slate-50 text-slate-500':'border-blue-200 bg-blue-50 text-blue-950'}`} style={{top:run.top*rowHeight,height:Math.max(0,run.height*rowHeight-6)}}><strong className="break-words">{run.name}</strong><span className="mt-1 text-[10px]">{run.from}{run.from!==run.to?` — ${run.to}`:''}</span></div>)}</div>
            <div>{displayModel.spreads.map((spread:any[],index:number)=><div key={index} className="grid grid-cols-2 gap-2 pb-2" style={{height:rowHeight}}>{spread.map((page:any,column:number)=>{
              if(!page)return <div key={column} aria-hidden="true"/>;
              const provisional=plannedAt(page.posicion).filter(row=>layoutKey(row)!==page.item?.key);
              const label=pageType(page.posicion,page.item?.tipo || provisional[0]?.tipo);
              return <button type="button" key={page.posicion} id={`maqueta-${support}-${page.posicion}`} aria-label={`${page.label}, página física ${page.fisica} · ${label}${page.item ? `, ${page.item.nombre}, parte ${page.parte}/${page.item.paginas}` : ''}`}
                onClick={()=>{setSelected(page.posicion);setPreview(page.posicion);}}
                className={`min-w-0 cursor-pointer overflow-hidden rounded border p-1 text-left transition hover:border-blue-800 hover:bg-blue-50 ${selected===page.posicion?'border-blue-900 ring-2 ring-blue-300':'border-slate-300 bg-white'}`}>
                {page.item ? <PdfLayoutThumbnail material={page.item.id_material} page={page.parte} loadPdf={loadPdf}/> :
                  <span className="flex h-[178px] flex-col justify-center gap-2 bg-slate-50 p-2 text-xs text-slate-600">
                    {provisional.length ? provisional.map(row=><span key={layoutKey(row)}>{pageType(page.posicion,row.tipo)} · {contentDisplayName(row)} · {row.planning.seccion}{row.provisional?' · Provisional':''}</span>) : label}
                  </span>}
                <span className="mt-1 block truncate text-[10px] font-semibold">{page.label} · {label}</span>
                {page.item&&<span className="block truncate text-[10px] text-slate-500">{page.parte}/{page.item.paginas} · {page.item.nombre}</span>}
                {page.item&&provisional.length>0&&<span className="block truncate text-[10px] text-slate-600">{provisional.map(row=>contentDisplayName(row)).join(' · ')}</span>}
              </button>;
            })}</div>)}</div>
          </div>
        </section>
        <section aria-label="Contenidos de la maqueta" className="min-w-0 rounded-lg border border-slate-200 p-4"><h3 className="mb-4 font-semibold text-blue-950">Contenidos</h3>
          <TableFilters><label className="text-xs">Contenido o empresa<input aria-label="Filtrar contenidos de maqueta" value={query} onChange={event=>setQuery(event.target.value)} className="mt-1 w-full rounded border p-2"/></label><label className="text-xs">Tipo<select value={type} onChange={event=>setType(event.target.value)} className="mt-1 w-full rounded border bg-white p-2"><option value="">Todos</option><option value="articulos">Artículo</option><option value="anuncios">Anuncio</option></select></label><label className="text-xs">Sección<select value={section} onChange={event=>setSection(event.target.value)} className="mt-1 w-full rounded border bg-white p-2"><option value="">Todas</option>{[...new Set(model.items.map((item:any)=>item.seccion))].map(value=><option key={String(value)} value={String(value)}>{String(value)}</option>)}</select></label></TableFilters>
          <div className="space-y-3">{cards.map((page:any)=><article key={page.posicion} className={`rounded border p-4 ${selected===page.posicion?'border-blue-900 bg-blue-50':'border-slate-200 bg-white'}`}>
            <div className="flex items-start justify-between gap-3"><Link href={`/dashboard/produccion/repositorio/contenidos/${encodeURIComponent(page.item.id_contenido)}`} className="cursor-pointer font-semibold text-blue-950 hover:underline">{page.item.nombre}</Link><button type="button" onClick={()=>choosePage(page.posicion)} className="shrink-0 cursor-pointer rounded px-1 text-xs text-blue-900 hover:bg-blue-100">{page.label}</button></div>
            <p className="mt-1 text-sm text-slate-600">{page.item.empresa}</p><p className="mt-1 text-xs text-slate-500">{page.item.seccion}</p>
            <div className="mt-3 flex justify-between gap-3 text-xs"><span>Tipo: {page.item.tipo==='articulos'?'artículo':'anuncio'}</span><span>Parte {page.parte}/{page.item.paginas}</span></div>
            {page.parte===1&&<div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={disabled||!editable} onClick={()=>setModal(page.item.key)} className={button}>Editar posición / PDF</button><button type="button" disabled={disabled} onClick={()=>void download(page.item.id_material)} className={button}>Descargar PDF del contenido</button></div>}
          </article>)}</div>{!cards.length&&<p className="py-4 text-sm text-slate-500">No hay contenidos con estos filtros.</p>}
          {!!model.unplaced.length&&<div className="mt-5 border-t pt-4"><h4 className="mb-3 text-sm font-semibold text-amber-900">Sin configuración completa</h4>{model.unplaced.map((content:any)=><div key={layoutKey(content)} className="mb-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm"><p>{content.titulo_articulo||content.nombre_contenido||content.id_contenido}</p><p className="mt-1 text-xs text-amber-900">{content.error}</p><button type="button" disabled={disabled||!editable} onClick={()=>setModal(layoutKey(content))} className={button+' mt-2'}>Completar maqueta</button></div>)}</div>}
          {!!model.orphans.length&&<div className="mt-4 space-y-3">{model.orphans.map((entry:any)=><div key={layoutKey(entry)} className="rounded border border-amber-200 bg-amber-50 p-3 text-sm"><p>{entry.id_contenido} · asignación fuera de fase 6 o de este formato</p><button type="button" disabled={disabled||!editable} onClick={()=>void save({accion:'retirar',id_contenido:entry.id_contenido,tipo:entry.tipo})} className={button+' mt-2'}>Retirar de esta maqueta</button></div>)}</div>}
        </section>
      </div>
      {modal!==null&&<LayoutEntryModal data={data} initialKey={modal} busy={busy} serverError={error} onClose={()=>setModal(null)} onSave={entry=>save({accion:'contenido',entrada:entry})}/>}
      {previewPage&&<div className="fixed inset-0 z-50 grid place-items-center overflow-auto bg-black/50 p-4">
        <section role="dialog" aria-modal="true" aria-label={`Vista de ${previewPage.label}`} className="relative max-h-[90vh] w-full max-w-3xl space-y-3 overflow-auto rounded-lg bg-white p-5">
          <button type="button" aria-label="Cerrar" className="absolute right-3 top-2 cursor-pointer rounded px-2 text-xl hover:bg-gray-100" onClick={()=>setPreview(null)}>×</button>
          <h3 className="pr-8 text-lg font-semibold">{previewPage.label} · {pageType(previewPage.posicion,previewPage.item?.tipo || plannedAt(previewPage.posicion)[0]?.tipo)}</h3>
          {previewPage.item&&<PdfLayoutThumbnail material={previewPage.item.id_material} page={previewPage.parte} loadPdf={loadPdf} large />}
          {plannedAt(previewPage.posicion).filter(row=>layoutKey(row)!==previewPage.item?.key).map(row=><div key={layoutKey(row)} className="rounded-lg border bg-blue-50 p-4">
            <p className="font-semibold">{contentDisplayName(row)}</p><p>{pageType(previewPage.posicion,row.tipo)} · {row.planning.seccion}{row.provisional?' · Provisional':''}</p>
          </div>)}
          {!previewPage.item&&!plannedAt(previewPage.posicion).length&&<p>No hay vista de archivo para esta página.</p>}
        </section>
      </div>}
    </>}
  </div>;
}
