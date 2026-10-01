'use client';
import {useState} from 'react';
import {downloadDocumentPdf,type DocumentModel} from '@/app/lib/businessDocumentPdf';
export default function DownloadDocumentButton({model,filename}:{model:DocumentModel;filename:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 return <div><button type="button" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await downloadDocumentPdf(model,filename);}catch(e:any){setError(e.message||'No se pudo descargar el PDF.');}finally{setBusy(false);}}} className="rounded bg-blue-950 px-4 py-2 text-white enabled:cursor-pointer enabled:hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">{busy?'Preparando PDF…':'Descargar PDF'}</button>{error&&<p role="alert" className="mt-2 text-red-700">{error}</p>}</div>;
}
