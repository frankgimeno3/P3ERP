'use client';
import {useEffect,useState} from 'react';
import apiClient from '@/app/apiClient';
export default function MaterialUploadModal({contentId,magazineId='',type,finished,onClose,onSaved}:{contentId:string;magazineId?:string;type:string;finished:boolean;onClose:()=>void;onSaved:()=>void}) {
 const [file,setFile]=useState<File|null>(null),[name,setName]=useState(''),[description,setDescription]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [uploaded,setUploaded]=useState<any>(null);
 useEffect(()=>{const close=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose();};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[onClose]);
 const submit=async(event:React.FormEvent)=>{event.preventDefault();if(!file||busy)return;setBusy(true);setError('');try {
  const destination={id_contenido:contentId,id_revista:magazineId,tipo:type,filename:file.name,contentType:file.type||'application/octet-stream',es_version_acabada:finished};
  let signed=uploaded;
  if (!signed) {
   signed=(await apiClient.post('/api/v1/produccion/gestiones-produccion/materiales/presign',destination)).data;
   const response=await fetch(signed.uploadUrl,{method:'PUT',headers:{'Content-Type':destination.contentType},body:file});
   if(!response.ok)throw new Error('No se pudo subir el archivo. Puedes reintentar.');setUploaded(signed);
  }
  await apiClient.post('/api/v1/produccion/gestiones-produccion/materiales',{...destination,mediaId:signed.mediaId,s3Key:signed.s3Key,nombre_material:name.trim()||file.name,descripcion:description});
  onSaved();onClose();
 }catch(reason:any){setError(reason.response?.data?.message||reason.message);}finally{setBusy(false);}};
 const field='mt-1 block w-full rounded border p-2 disabled:bg-slate-100';
 return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><section role="dialog" aria-modal="true" aria-labelledby="upload-material-title" className="relative w-full max-w-xl rounded-xl bg-white p-6 text-slate-900"><button type="button" aria-label="Cerrar" onClick={onClose} className="absolute right-3 top-2 cursor-pointer rounded px-2 text-2xl hover:bg-blue-50">×</button><h2 id="upload-material-title" className="mb-4 pr-8 text-xl font-semibold">{finished?'Subir versión acabada':'Aportar material'}</h2>{finished&&<p className="mb-4 text-sm text-slate-600">Se asignará la siguiente versión (V01, V02…). Se conservan las anteriores.</p>}<form onSubmit={submit} className="space-y-4"><fieldset disabled={busy||!!uploaded} className="space-y-4"><label className="block">Nombre<input maxLength={2000} value={name} onChange={event=>setName(event.target.value)} className={field}/></label><label className="block">Descripción<textarea maxLength={10000} value={description} onChange={event=>setDescription(event.target.value)} className={field}/></label><label className="block">Archivo<input type="file" required onChange={event=>setFile(event.target.files?.[0]||null)} className={`${field} enabled:cursor-pointer enabled:hover:border-blue-900`}/></label></fieldset>{error&&<p role="alert" className="text-red-700">{error}</p>}<button type="submit" disabled={busy||!file} className="rounded bg-blue-950 px-4 py-2 text-white enabled:cursor-pointer enabled:hover:bg-blue-800 disabled:cursor-default disabled:opacity-40">{busy?'Subiendo…':uploaded?'Reintentar registro':'Subir y registrar'}</button></form></section></div>;
}
