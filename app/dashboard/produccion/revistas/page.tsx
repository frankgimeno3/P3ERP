'use client';
import {magazineEdition} from '@/app/config/editorialMagazine';
import MagazineCalendar from './MagazineCalendar';
import {magazineEvents,magazineDate} from '@/app/config/magazineEvents';
import SortableTable from '@/app/components/SortableTable';

import { matchesTableFilter } from "@/app/lib/dateFilters";
import TableFilterInput from "@/app/components/TableFilterInput";
import TableFilters from '@/app/components/TableFilters';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import apiClient from '@/app/apiClient';
import DatePartsInput from '@/app/components/DatePartsInput';
import MiddleNav from '@/app/general_components/componentes_recurrentes/MiddleNav';

type Revista={ [key:string]:string;id_revista:string;revista:string;edicion:string;numero_publicacion:string;estado_publicacion:string;fecha_publicacion:string;deadline_materiales:string;fecha_recordatorio:string};
type Dates=Record<string,string>;
const pending='pendiente de publicar';
const emptyDates=():Dates=>Object.fromEntries(['fecha_publicacion',...magazineEvents.map(event=>event.key)].map(key=>[key,'']));
const dateValid=(value:string)=>magazineDate(value)!==null;
const labels:Record<string,string>={revista:'Revista',edicion:'Edición',numero_publicacion:'Número',estado_publicacion:'Estado',version_publicacion:'Formato',especial:'Especial',fecha_publicacion:'Fecha publicación',deadline_materiales:'Fecha límite material',fecha_recordatorio:'Fecha recordatorio'};

export default function RevistasProduccionPage(){
  const [rows,setRows]=useState<Revista[]>([]),[tab,setTab]=useState<'pendientes'|'calendario'>('pendientes');
  const [selectedMagazine,setSelectedMagazine]=useState('');
  const [selectedEdition,setSelectedEdition]=useState('');
  const [filters,setFilters]=useState<Record<string,string>>({}),[createOpen,setCreateOpen]=useState(false);
  const [saving,setSaving]=useState(false),[error,setError]=useState('');
  const [form,setForm]=useState<Record<string,string>>({revista:'',edicion:'',numero_publicacion:'',especial:'',version_publicacion:'digital',estado_publicacion:pending,...emptyDates()});
  const reload=async()=>setRows((await apiClient.get('/api/v1/produccion/revistas')).data);
  useEffect(()=>{reload().catch(reason=>setError(reason.response?.data?.message||reason.message));},[]);
  useEffect(()=>{if(!createOpen)return;const close=(event:KeyboardEvent)=>{if(event.key==='Escape'){setCreateOpen(false);}};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[createOpen]);
  const magazineRank=(name:string)=>/vidrio/i.test(name)?0:/ventanas/i.test(name)?1:/qui[eé]n/i.test(name)?2:3;
  const magazines=Array.from(new Set(rows.filter(row=>row.estado_publicacion!=='publicada').map(row=>row.revista))).sort((a,b)=>magazineRank(a)-magazineRank(b)||a.localeCompare(b,'es'));
  const activeMagazine=magazines.includes(selectedMagazine)?selectedMagazine:magazines[0];
  const hasEditions=tab==='pendientes'&&/vidrio|ventanas|qui[eé]n/i.test(activeMagazine||'');
  const editions=Array.from(new Set(rows.filter(row=>row.revista===activeMagazine).map(row=>magazineEdition(row)))).sort((a,b)=>a.localeCompare(b,'es'));
  if(/vidrio|ventanas/i.test(activeMagazine||'')){for(const edition of ['América Latina','Iberia','ESPECIALES'])if(!editions.includes(edition))editions.push(edition);}
  const activeEdition=editions.includes(selectedEdition)?selectedEdition:editions[0];
  const columns=tab==='pendientes'?['numero_publicacion','revista',...(!hasEditions?['edicion']:[]),'version_publicacion','especial','fecha_publicacion','estado_publicacion']:['numero_publicacion','revista','fecha_publicacion','deadline_materiales','fecha_recordatorio'];
  const visible=rows.filter(row=>(tab==='calendario'||row.estado_publicacion!=='publicada'&&row.revista===activeMagazine&&(!hasEditions||magazineEdition(row)===activeEdition))&&columns.every(column=>matchesTableFilter(String(row[column as keyof Revista]||'').toLocaleLowerCase('es'), (filters[column]||'').trim().toLocaleLowerCase('es'))));
  const create=async(event:React.FormEvent)=>{event.preventDefault();if(![form.fecha_publicacion,...magazineEvents.map(event=>form[event.key])].every(dateValid)){setError('Revisa las fechas.');return;}setSaving(true);setError('');try{await apiClient.post('/api/v1/produccion/revistas',{...form,publicacion:form.numero_publicacion});await reload();setCreateOpen(false);setForm({revista:'',edicion:'',numero_publicacion:'',estado_publicacion:pending,...emptyDates()});}catch(reason:any){setError(reason.response?.data?.detail||reason.response?.data?.message||reason.message);}finally{setSaving(false);}};
  const dateFields=(value:Dates,onChange:(patch:Dates)=>void)=><div className="grid gap-3 md:grid-cols-3">{[{key:"fecha_publicacion",label:"Fecha de publicación"},...magazineEvents].map(event=><DatePartsInput key={event.key} label={event.label} value={value[event.key]||""} onChange={next=>onChange({[event.key]:next})}/>)}</div>;
  return <main className="min-h-screen bg-gray-100 text-slate-900"><MiddleNav tituloprincipal="Revistas"/><div className="mx-auto max-w-6xl p-8">
    <header className="mb-5 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">Revistas</h1><button type="button" onClick={()=>setCreateOpen(true)} className="cursor-pointer rounded bg-blue-950 px-4 py-2 text-white hover:bg-blue-900">Agregar revista</button></header>
    {error&&<p role="alert" className="mb-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}
    <div className="mb-4 flex gap-2">{(['pendientes','calendario'] as const).map(value=><button key={value} type="button" onClick={()=>{setTab(value);setFilters({});}} className={`cursor-pointer rounded px-4 py-2 text-sm hover:bg-blue-100 ${tab===value?'bg-blue-950 text-white hover:bg-blue-900':'bg-white'}`}>{value==='pendientes'?'Pendientes':'Calendario'}</button>)}</div>
    {tab==='pendientes'&&<div role="tablist" aria-label="Revistas pendientes" className="mb-4 flex flex-wrap gap-2">{magazines.map(magazine=><button role="tab" aria-selected={activeMagazine===magazine} type="button" key={magazine} onClick={()=>{setSelectedMagazine(magazine);setSelectedEdition('');setFilters({});}} className={`cursor-pointer rounded px-4 py-2 text-sm transition ${activeMagazine===magazine?'bg-blue-950 text-white hover:bg-blue-900':'bg-white hover:bg-blue-100'}`}>{magazine||'Sin revista'}</button>)}</div>}
    {hasEditions&&<div role="tablist" aria-label="Ediciones" className="mb-4 flex flex-wrap gap-2">{editions.map(edition=><button key={edition} role="tab" aria-selected={edition===activeEdition} type="button" onClick={()=>{setSelectedEdition(edition);setFilters({});}} className={`cursor-pointer rounded px-3 py-1.5 text-sm ${edition===activeEdition?'bg-blue-100 text-blue-950 hover:bg-blue-200':'bg-white hover:bg-blue-50'}`}>{edition||'Sin edición'}</button>)}</div>}
    {tab==='calendario'?<MagazineCalendar rows={rows} onSaved={reload}/>:<><TableFilters><div className="contents">{columns.map(column=><label key={column} className="text-xs text-slate-600">{labels[column]}<TableFilterInput label={labels[column]} field={column} value={filters[column]||''} className="mt-1 w-full rounded border border-gray-100 bg-white px-2 py-1.5 text-xs" onChange={nextValue => setFilters(previous=>({...previous,[column]:nextValue}))} /></label>)}</div></TableFilters>
    <div className="overflow-x-auto rounded border border-gray-100 bg-white"><SortableTable className="w-full text-left text-sm"><thead className="bg-blue-950 text-white"><tr>{columns.map(column=><th key={column} className="p-3">{labels[column]}</th>)}<th className="p-3">Gestión</th></tr></thead><tbody>{visible.map(row=><tr key={row.id_publicacion||row.id_revista} className="border-t border-gray-100 hover:bg-blue-50">{columns.map(column=><td key={column} className="p-3">{row[column as keyof Revista]||'—'}</td>)}<td className="p-3">{<Link href={`/dashboard/produccion/revistas/${encodeURIComponent(row.id_publicacion||row.id_revista)}`} className="cursor-pointer text-blue-900 hover:underline">Abrir</Link>}</td></tr>)}</tbody></SortableTable>{!visible.length&&<p className="p-5 text-slate-500">No hay revistas con estos filtros.</p>}</div></>}
  </div>{createOpen&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><section role="dialog" aria-modal="true" aria-label="Agregar revista" className="relative w-full max-w-3xl rounded bg-white p-6 shadow-xl"><button type="button" aria-label="Cerrar" onClick={()=>{setCreateOpen(false);}} className="absolute right-3 top-2 cursor-pointer rounded px-2 text-2xl hover:bg-gray-100">×</button><h2 className="mb-5 text-xl font-semibold">Agregar revista</h2><form onSubmit={create} className="space-y-4"><div className="grid gap-3 md:grid-cols-3"><label className="text-sm">Revista<input required value={form.revista} onChange={event=>setForm({...form,revista:event.target.value})} className="mt-1 w-full rounded border p-2"/></label><label className="text-sm">Edición<input required value={form.edicion} onChange={event=>setForm({...form,edicion:event.target.value})} className="mt-1 w-full rounded border p-2"/></label><label className="text-sm">Número<input required type="number" min="1" step="1" value={form.numero_publicacion} onChange={event=>setForm({...form,numero_publicacion:event.target.value})} className="mt-1 w-full rounded border p-2"/></label><label className="text-sm">Formato<select value={form.version_publicacion} onChange={event=>setForm({...form,version_publicacion:event.target.value})} className="mt-1 w-full cursor-pointer rounded border p-2 hover:border-blue-900"><option value="digital">Digital</option><option value="impresa">Impresa</option><option value="digital e impresa">Digital e impresa</option></select></label><label className="text-sm">Especial (nombre, si corresponde)<input value={form.especial} onChange={event=>setForm({...form,especial:event.target.value})} className="mt-1 w-full rounded border p-2"/></label></div>{dateFields(form,patch=>setForm(previous=>({...previous,...patch})))}<button type="submit" disabled={saving} className="cursor-pointer rounded bg-blue-950 px-4 py-2 text-white hover:bg-blue-900 disabled:cursor-default disabled:opacity-50">{saving?'Guardando...':'Crear revista'}</button></form></section></div>}</main>;
}
