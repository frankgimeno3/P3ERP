'use client';
import {useState} from 'react';
import Link from 'next/link';
import ContentIntakeModal from '../gestion/ContentIntakeModal';
export default function ManagementHeader({magazine}:{magazine:boolean}) {
 const [open,setOpen]=useState(false);
 return <><header className="mb-6 flex flex-wrap items-center justify-between gap-4"><h1 className="text-2xl font-semibold text-blue-950">{magazine?'Contenidos revista pendientes publicar':'Otros contenidos pendientes publicar'}</h1><div className="flex flex-wrap items-center gap-3"><Link href={`/dashboard/produccion/gestion-contenidos/${magazine?'otros':'revista'}`} className="cursor-pointer rounded border bg-white px-4 py-3 transition hover:bg-blue-50">{magazine?'Ver otro contenido':'Ver contenido revista'}</Link><button type="button" onClick={()=>setOpen(true)} className="cursor-pointer rounded bg-blue-950 px-5 py-3 text-white transition hover:bg-blue-800">Agregar contenidos</button></div></header>{open&&<ContentIntakeModal onClose={()=>setOpen(false)}/>}</>;
}
