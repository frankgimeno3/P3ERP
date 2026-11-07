'use client';
import {useState} from 'react';
import ContentIntakeModal from '../gestion/ContentIntakeModal';
export default function ManagementHeader({magazine}:{magazine:boolean}) {
 const [mode,setMode]=useState<boolean|null>(null);
 const button='cursor-pointer rounded bg-blue-950 px-5 py-3 text-white transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-950';
 return <><header className="mb-6 flex flex-wrap items-center justify-between gap-4"><h1 className="text-2xl font-semibold text-blue-950">{magazine?'Gestión de contenidos revista':'Otros contenidos pendientes publicar'}</h1><div className="flex flex-wrap items-center gap-3"><button type="button" onClick={()=>setMode(false)} className={button}>Agregar contenidos sin contrato</button><button type="button" onClick={()=>setMode(true)} className={button}>Agregar contenido asociado a contrato</button></div></header>{mode!==null&&<ContentIntakeModal contracted={mode} magazine={magazine} onClose={()=>setMode(null)}/>}</>;
}
