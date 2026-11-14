'use client';
import {useEffect,useState} from 'react';
import SearchableSelect from '@/app/components/SearchableSelect';
import {contentDisplayName,versionLabel,productionStage} from '@/app/lib/productionWorkflow';
import {contentLayoutDefaults,layoutKey,layoutFormatMatches,validateLayoutEntry} from '@/app/lib/magazineLayout';

export default function LayoutEntryModal({data,initialKey='',busy,serverError='',onClose,onSave}:{data:any;initialKey?:string;busy:boolean;serverError?:string;onClose:()=>void;onSave:(entry:any)=>Promise<boolean>}) {
  const choices=data.contenidos.filter((row:any)=>layoutFormatMatches(row,data.soporte)&&productionStage(row)==='publicacion');
  const initial=choices.find((row:any)=>layoutKey(row)===initialKey);
  const draftFor=(row:any)=>data.entradas.find((entry:any)=>layoutKey(entry)===layoutKey(row))||contentLayoutDefaults(row);
  const [key,setKey]=useState(initialKey),[draft,setDraft]=useState<any>(initial?draftFor(initial):{posicion:'',paginas:'',seccion:'',id_material:''}),[error,setError]=useState('');
  const content=choices.find((row:any)=>layoutKey(row)===key);
  useEffect(()=>{const close=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose();};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[onClose]);
  const submit=async(event:React.FormEvent)=>{event.preventDefault();setError('');try{if(!content)throw Error('Selecciona un contenido.');const entry=validateLayoutEntry({...draft,id_contenido:content.id_contenido,tipo:content.tipo});if(await onSave(entry))onClose();}catch(reason:any){setError(reason.message);}};
  const control='mt-1 w-full rounded border p-2 disabled:bg-slate-100';
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><section role="dialog" aria-modal="true" aria-labelledby="layout-entry-title" className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 text-slate-900">
    <button type="button" aria-label="Cerrar configuración de maqueta" onClick={onClose} className="absolute right-3 top-2 cursor-pointer rounded px-2 text-2xl hover:bg-blue-50">×</button>
    <h3 id="layout-entry-title" className="mb-4 pr-8 text-xl font-semibold text-blue-950">Contenido en la maqueta {data.soporte}</h3>
    <form onSubmit={submit} className="space-y-4"><fieldset disabled={busy} className="space-y-4">
      <SearchableSelect label="Contenido de la maqueta" value={key} required disabled={busy} options={choices.map((row:any)=>({value:layoutKey(row),label:`${contentDisplayName(row)} · ${row.tipo==='articulos'?'Artículo':'Anuncio'}`}))} onChange={value=>{setKey(value);const next=choices.find((row:any)=>layoutKey(row)===value);setDraft(next?draftFor(next):{posicion:'',paginas:'',seccion:'',id_material:''});}}/>
      <SearchableSelect label="PDF final de la maqueta" value={draft.id_material} required disabled={busy||!content} options={(content?.materiales||[]).filter((m:any)=>m.es_version_acabada&&!m.eliminado_at&&m.material_valido!==false).map((m:any)=>({value:m.id_material,label:`${versionLabel(m.numero_version)} · ${m.nombre_material}${m.pdf_paginas?` · ${m.pdf_paginas} páginas`:' · páginas por validar'}`}))} onChange={value=>{const file=content?.materiales.find((m:any)=>m.id_material===value);setDraft((old:any)=>({...old,id_material:value,...(file?.pdf_paginas?{paginas:file.pdf_paginas}:{})}));}}/>
      <div className="grid gap-4 sm:grid-cols-3"><label className="text-sm">Páginas del PDF<input required type="number" min="1" max="1000" step="1" className={control} value={draft.paginas} onChange={e=>setDraft((old:any)=>({...old,paginas:e.target.value}))}/></label><label className="text-sm">Sección<input required maxLength={120} className={control} value={draft.seccion} onChange={e=>setDraft((old:any)=>({...old,seccion:e.target.value}))}/></label><label className="text-sm">Posición inicial<input required type="number" min="-1" max="998" step="1" className={control} value={draft.posicion} onChange={e=>setDraft((old:any)=>({...old,posicion:e.target.value}))}/></label></div>
      <p className="text-xs text-slate-600">−1: portada; 0: interior de portada; 1: primera página numerada, tercera página física. El número de páginas debe coincidir con el PDF. Los ajustes solo afectan a esta revista y a este soporte.</p>
    </fieldset>{(error||serverError)&&<p role="alert" className="text-red-700">{error||serverError}</p>}<button type="submit" disabled={busy||!content} className="rounded bg-blue-950 px-4 py-2 text-white enabled:cursor-pointer enabled:hover:bg-blue-800 disabled:cursor-default disabled:opacity-50">{busy?'Guardando…':'Guardar en maqueta'}</button></form>
  </section></div>;
}
