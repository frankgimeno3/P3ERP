'use client';
import {validateIntakeFiles} from '@/app/lib/productionManagement';
export type ProductionUpload = {id:string;file:File;nombre_material:string;descripcion:string};
export const uploadDescriptors=(files:ProductionUpload[])=>files.map(row=>({filename:row.file.name,size:row.file.size,contentType:row.file.type||(/\.zip$/i.test(row.file.name)?'application/zip':'application/octet-stream'),nombre_material:row.nombre_material.trim(),descripcion:row.descripcion.trim(),webkitRelativePath:row.file.webkitRelativePath||''}));
export default function ProductionFilePicker({files,onChange,onError,disabled=false,single=false,zipOnly=false}:{files:ProductionUpload[];onChange:(files:ProductionUpload[])=>void;onError:(message:string)=>void;disabled?:boolean;single?:boolean;zipOnly?:boolean}) {
 const add=(selected:File[],directory=false)=>{
  if(disabled)return;
  if(directory){onError('No se admiten carpetas. Comprímelas en un archivo ZIP.');return;}
  const additions=selected.map(file=>({id:crypto.randomUUID(),file,nombre_material:file.name,descripcion:''}));
  const next=[...files,...additions];
  if(single&&next.length>1){onError('Selecciona un único archivo para esta carga. Retira el anterior si quieres sustituirlo.');return;}
  const errors=validateIntakeFiles(uploadDescriptors(next),zipOnly?'zip':'archivos');
  if(errors.length){onError(errors.join(' '));return;}
  onChange(next);onError('');
 };
 const field='mt-1 block w-full rounded border bg-white p-2 disabled:bg-slate-100';
 return <div className="space-y-3" onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();const directory=Array.from(event.dataTransfer.items||[]).some(item=>(item as any).webkitGetAsEntry?.()?.isDirectory);add(Array.from(event.dataTransfer.files),directory);}}>
  <p className="text-sm text-slate-600">{single?'Selecciona un archivo.':'Puedes seleccionar varios archivos a la vez o añadirlos en varias selecciones.'} No se admiten carpetas; comprímelas en ZIP. Máximo 200 MB por archivo.</p>
  <label className="block text-sm">{zipOnly?'Seleccionar ZIP':'Añadir archivos'}<input type="file" multiple={!single} accept={zipOnly?'.zip,application/zip':undefined} disabled={disabled} onChange={event=>{add(Array.from(event.target.files||[]));event.target.value='';}} className={`${field} enabled:cursor-pointer enabled:hover:border-blue-900`}/></label>
  <div className="grid gap-3 sm:grid-cols-2">{files.map(row=><article key={row.id} aria-label={`Archivo ${row.file.name}`} className="relative rounded-lg border border-slate-200 bg-slate-50 p-4">
   <button type="button" aria-label={`Retirar ${row.file.name}`} disabled={disabled} onClick={()=>{onChange(files.filter(item=>item.id!==row.id));onError('');}} className="absolute right-2 top-1 rounded px-2 text-xl enabled:cursor-pointer enabled:hover:bg-red-100 enabled:hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40">×</button>
   <p className="mb-3 break-all pr-7 text-xs text-slate-500">{row.file.name} · {(row.file.size/1024/1024).toFixed(2)} MB</p>
   <label className="block text-sm">Nombre del material *<input required maxLength={2000} disabled={disabled} value={row.nombre_material} onChange={event=>onChange(files.map(item=>item.id===row.id?{...item,nombre_material:event.target.value}:item))} className={field}/></label>
   <label className="mt-2 block text-sm">Descripción (opcional)<textarea maxLength={10000} disabled={disabled} value={row.descripcion} onChange={event=>onChange(files.map(item=>item.id===row.id?{...item,descripcion:event.target.value}:item))} className={field}/></label>
  </article>)}</div>
 </div>;
}
