'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import apiClient from '@/app/apiClient';
import {contentMagazineFormatLabel} from '@/app/lib/contentMagazineFormat';
import {articleMatchesMagazine} from '@/app/config/editorialMagazine';
import SortableTable from '@/app/components/SortableTable';
export default function MagazineArticles({magazine}:{magazine:any}){
 const [rows,setRows]=useState<any[]>([]),[error,setError]=useState('');
 useEffect(()=>{let active=true;apiClient.get('/api/v1/produccion/control-redaccion').then(r=>{if(active)setRows(r.data.filter((a:any)=>articleMatchesMagazine(a,magazine)));}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[magazine]);
 return <section className="mt-6 rounded border border-blue-200 bg-blue-50 p-4"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-blue-950">Artículos de esta revista</h2><Link href={'/dashboard/produccion/gestion-contenidos/revista/'+encodeURIComponent(magazine.id_revista)} className="cursor-pointer text-blue-900 hover:underline">Gestionar contenidos</Link></div>{error&&<p role="alert" className="text-red-700">{error}</p>}<div className="overflow-x-auto"><SortableTable className="w-full bg-white text-left text-sm"><thead className="bg-blue-950 text-white"><tr>{['Estado','Cuenta','Título','Formato','Páginas ocupadas'].map(label=><th key={label} className="p-3 font-light">{label}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.id} className="border-t"><td className="p-3">{row.estado}</td><td className="p-3">{row.empresa}</td><td className="p-3"><Link href={'/dashboard/produccion/repositorio/contenidos/'+encodeURIComponent(row.id_contenido)} className="cursor-pointer text-blue-900 hover:underline">{row.titulo}</Link></td><td className="p-3">{contentMagazineFormatLabel(row)}</td><td className="p-3">{row.paginas||'—'}</td></tr>)}</tbody></SortableTable>{!rows.length&&!error&&<p className="p-3 text-gray-500">Sin artículos previstos para este número.</p>}</div></section>;
}
