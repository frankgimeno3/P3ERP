'use client';
import { useEffect, useRef, useState } from 'react';
import SearchableSelect from '@/app/components/SearchableSelect';
import { administrativeExcelFields } from '@/app/config/administrativeExcelFields';

export default function AdministrativeExcelModal({onClose,onImported}:{onClose:()=>void;onImported:(result:any)=>void}){
  const [file,setFile]=useState<File|null>(null),[headers,setHeaders]=useState<string[]>([]),[mapping,setMapping]=useState<Record<string,string>>({});
  const [preview,setPreview]=useState<any>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const close=useRef<HTMLButtonElement>(null),onCloseRef=useRef(onClose);onCloseRef.current=onClose;
  useEffect(()=>{const previous=document.activeElement as HTMLElement;close.current?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onCloseRef.current();};window.addEventListener('keydown',key);return()=>{window.removeEventListener('keydown',key);previous?.focus();};},[]);
  const send=async()=>{
    if(!file || busy)return;setBusy(true);setError('');
    try{const form=new FormData();form.append('file',file);form.append('action',preview?'import':headers.length?'preview':'inspect');form.append('mapping',JSON.stringify(mapping));
      const response=await fetch('/api/v1/admin/control-administrativo/importar',{method:'POST',body:form});const result=await response.json();if(!response.ok)throw new Error(result.message);
      if(preview){onImported(result);onClose();}else if(headers.length)setPreview(result);else{setHeaders(result.headers);setMapping(result.mapping);}
    }catch(e:any){setError(e.message || 'No se pudo procesar el Excel.');}finally{setBusy(false);}
  };
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4"><section role="dialog" aria-modal="true" aria-labelledby="admin-excel-title" className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white p-6 text-slate-900 shadow-xl">
    <header className="flex items-center justify-between gap-4"><h2 id="admin-excel-title" className="text-xl font-semibold text-blue-950">Subir excel de control administrativo</h2><button ref={close} type="button" aria-label="Cerrar" onClick={onClose} className="cursor-pointer rounded px-3 py-1 text-2xl transition hover:bg-gray-100">×</button></header>
    <p className="my-4 text-sm">Cada fila corresponde a una orden. Revisa la correspondencia de columnas antes de importar. Las órdenes ausentes se conservan; los campos vacíos o «-» no borran datos. Las columnas adicionales se guardan en la ficha de la orden.</p>
    <label className="block text-sm font-medium">Excel (.xlsx o .xls, hasta 10 MB y 5.000 órdenes)<input type="file" accept=".xlsx,.xls" disabled={busy} onChange={e=>{setFile(e.target.files?.[0] || null);setHeaders([]);setMapping({});setPreview(null);setError('');}} className="my-3 block w-full cursor-pointer rounded border p-3 transition enabled:hover:bg-blue-50 disabled:cursor-default disabled:opacity-50" /></label>
    {headers.length>0 && <div className="grid gap-4 md:grid-cols-2">{headers.map(h=><div key={h}><p className="mb-1 text-sm font-medium">{h}</p><SearchableSelect label={'Columna: '+h} disabled={busy} required value={mapping[h] || ''} onChange={value=>{setMapping(m=>({...m,[h]:value}));setPreview(null);}} options={[...administrativeExcelFields.map(([value,label])=>({value,label})),{value:'extra',label:'Conservar como campo adicional'}]} /></div>)}</div>}
    {preview && <div className="mt-5"><p className="mb-2 font-medium">{preview.total} órdenes válidas. Vista previa de las primeras {preview.rows.length}.</p><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-blue-950 text-white"><tr>{['Orden','Factura','Nº cobro','Fecha teórica','Importe','Datos adicionales'].map(h=><th key={h} className="p-3 text-left">{h}</th>)}</tr></thead><tbody>{preview.rows.map((r:any)=><tr key={r.id_orden} className="border-b">{[r.id_orden,r.id_factura,r.numero_cobro,r.fecha_teorica_cobro,r.cobro_total,JSON.stringify(r.datos_importacion)].map((v,i)=><td key={i} className="p-3">{v ?? 'Conservar anterior'}</td>)}</tr>)}</tbody></table></div></div>}
    {error && <p role="alert" className="my-4 whitespace-pre-wrap rounded bg-red-50 p-3 text-red-700">{error}</p>}
    {busy && <p role="status" className="mt-3 text-sm">{preview?'Guardando. Si cierras el modal la importación continuará.':'Leyendo y validando el Excel…'}</p>}
    <footer className="mt-5 flex justify-end gap-3"><button type="button" onClick={onClose} className="cursor-pointer rounded border px-4 py-2 transition hover:bg-gray-100">Cerrar</button><button type="button" onClick={()=>void send()} disabled={!file || busy || headers.some(h=>!mapping[h])} className="cursor-pointer rounded bg-blue-950 px-4 py-2 text-white transition enabled:hover:bg-blue-900 disabled:cursor-default disabled:bg-gray-300">{busy?'Procesando…':preview?'Confirmar importación':headers.length?'Revisar órdenes':'Leer columnas'}</button></footer>
  </section></div>;
}
