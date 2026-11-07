'use client';
import {useState} from 'react';
import ContentIntakeModal from '../gestion/ContentIntakeModal';
export default function ManagementHeader({magazine}:{magazine:boolean}) {
 const [mode,setMode]=useState<boolean|null>(null);
 return <><header className="mb-6 flex flex-wrap items-center justify-between gap-4"><h1 className="text-2xl font-semibold text-blue-950">{magazine?'Contenidos revista pendientes publicar':'Otros contenidos pendientes publicar'}</h1><div className="flex flex-wrap items-center gap-3"><button type="button" onClick={()=>setMode(false)} className="cursor-pointer rounded border bg-white px-4 py-3 transition hover:bg-blue-50">Agregar contenidos sin contrato</button><button type="button" onClick={()=>setMode(true)} className="cursor-pointer rounded bg-blue-950 px-5 py-3 text-white transition hover:bg-blue-800">Agregar contenido asociado a contrato</button></div></header>{mode!==null&&<ContentIntakeModal contracted={mode} magazine={magazine} onClose={()=>setMode(null)}/>}</>;
}
