'use client';
import {useEffect,useRef,useState} from 'react';
import apiClient from '@/app/apiClient';
import {magazineNumberLabel} from '@/app/config/productionMagazineFilters';
import ProductionFilePicker,{uploadDescriptors,type ProductionUpload} from '@/app/components/ProductionFilePicker';
import {validateIntakeFiles} from '@/app/lib/productionManagement';
export default function MaterialUploadModal({contentId,magazineId='',type,types=[],magazines=[],finished,onClose,onSaved}:{contentId:string;magazineId?:string;type:string;types?:{value:string;label:string}[];magazines?:{id_revista:string;revista:string;edicion:string;numero_publicacion:string}[];finished:boolean;onClose:()=>void;onSaved:()=>void|Promise<void>}) {
 const [files,setFiles]=useState<ProductionUpload[]>([]),[busy,setBusy]=useState(false),[started,setStarted]=useState(false),[error,setError]=useState(''),[progress,setProgress]=useState('');
 const uploaded=useRef<Record<string,any>>({});
 const [selectedType,setSelectedType]=useState(type),[selectedMagazine,setSelectedMagazine]=useState(magazineId);
 useEffect(()=>{const close=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose();};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[onClose]);
 const submit=async(event:React.FormEvent)=>{
  event.preventDefault();if(busy)return;setError('');
  const descriptors=uploadDescriptors(files),errors=validateIntakeFiles(descriptors,'archivos');
  if(errors.length){setError(errors.join(' '));return;}
  if(finished&&files.length!==1){setError('Cada versión acabada debe contener un único archivo.');return;}
  setBusy(true);setStarted(true);
  try {
   const destination={id_contenido:contentId,id_revista:selectedType==='otros'?'':selectedMagazine,tipo:selectedType,es_version_acabada:finished};
   for(let index=0;index<files.length;index++){
    const row=files[index];if(uploaded.current[row.id])continue;
    setProgress(`Subiendo ${index+1} de ${files.length}: ${row.nombre_material}`);
    const signed=(await apiClient.post('/api/v1/produccion/gestiones-produccion/materiales/presign',{...destination,...descriptors[index]})).data;
    const response=await fetch(signed.uploadUrl,{method:'PUT',headers:{'Content-Type':descriptors[index].contentType},body:row.file});
    if(!response.ok)throw new Error(`No se pudo subir ${row.file.name}. Puedes reintentar.`);
    uploaded.current[row.id]=signed;
   }
   setProgress('Registrando los materiales…');
   await apiClient.post('/api/v1/produccion/gestiones-produccion/materiales',{...destination,materiales:files.map((row,index)=>({...descriptors[index],mediaId:uploaded.current[row.id].mediaId,s3Key:uploaded.current[row.id].s3Key}))});
   await onSaved();onClose();
  }catch(reason:any){setError(reason.response?.data?.message||reason.message);}finally{setBusy(false);}
 };
 const field='mt-1 block w-full rounded border p-2 disabled:bg-slate-100';
 return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><section role="dialog" aria-modal="true" aria-labelledby="upload-material-title" className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 text-slate-900">
  <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute right-3 top-2 cursor-pointer rounded px-2 text-2xl hover:bg-blue-50">×</button>
  <h2 id="upload-material-title" className="mb-4 pr-8 text-xl font-semibold">{finished?'Subir versión acabada':'Aportar material'}</h2>
  {finished&&<p className="mb-4 text-sm text-slate-600">Se asignará la siguiente versión (V01, V02…). Se conservan las anteriores.</p>}
  <form onSubmit={submit} className="space-y-4"><fieldset disabled={busy||started} className="space-y-4">
   {types.length>1&&<label className="block">Tipo<select value={selectedType} onChange={event=>setSelectedType(event.target.value)} className={`${field} enabled:cursor-pointer enabled:hover:border-blue-900`}>{types.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>}
   {selectedType!=='otros'&&magazines.length>0&&<label className="block">Revista<select value={selectedMagazine} onChange={event=>setSelectedMagazine(event.target.value)} className={`${field} enabled:cursor-pointer enabled:hover:border-blue-900`}><option value="">Todas las revistas del contenido</option>{magazines.map(row=><option key={row.id_revista} value={row.id_revista}>{row.revista} · {row.edicion} · {magazineNumberLabel(row)}</option>)}</select></label>}
   {(types.length>1||magazines.length>1)&&<p className="text-sm text-slate-600">Todos los archivos de esta carga se asociarán al tipo y la revista seleccionados.</p>}
   <ProductionFilePicker files={files} onChange={setFiles} onError={setError} disabled={busy||started} single={finished}/>
  </fieldset>{error&&<p role="alert" className="text-red-700">{error}</p>}{progress&&<p role="status" className="text-sm text-blue-900">{progress}</p>}
  <button type="submit" disabled={busy||!files.length} className="rounded bg-blue-950 px-4 py-2 text-white enabled:cursor-pointer enabled:hover:bg-blue-800 disabled:cursor-default disabled:opacity-40">{busy?'Subiendo…':started?'Reintentar carga':'Subir y registrar'}</button></form>
 </section></div>;
}
