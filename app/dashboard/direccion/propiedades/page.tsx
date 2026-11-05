'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import TableFilters from '@/app/components/TableFilters';
import SortableTable from '@/app/components/SortableTable';
import {PropertyService} from '@/app/service/PropertyService';
import PropertyModal from './PropertyModal';
import {button,input,propertyTypes,type Catalog,type Property} from './types';
import {groupParkings} from './PropertyGroups';
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

export default function PropertiesPage(){
 const [rows,setRows]=useState<Property[]>([]),[catalog,setCatalog]=useState<Catalog>({cargos:[],proveedores:[]}),[loading,setLoading]=useState(true),[error,setError]=useState(''),[selected,setSelected]=useState<string|null>(null);
 const [filters,setFilters]=useState({nombre:'',tipo:'',conjunto:'',identificador:'',direccion:'',cargos:'',estado:'true'}),request=useRef(0);
 const load=useCallback(async(signal?:AbortSignal)=>{
  const current=++request.current;
  try{const data=await PropertyService.list(signal);if(current===request.current&&!signal?.aborted){setRows(data.propiedades);setCatalog({cargos:data.cargos,proveedores:data.proveedores});setError('');}}
  catch(e:unknown){if(current===request.current&&!signal?.aborted)setError(e instanceof Error?e.message:'No se pudieron cargar las propiedades.');}
  finally{if(current===request.current&&!signal?.aborted)setLoading(false);}
 },[]);
 useEffect(()=>{const controller=new AbortController();void load(controller.signal);return()=>controller.abort();},[load]);
 const close=useCallback(()=>setSelected(null),[]);
 const shown=useMemo(()=>rows.filter(p=>normalize(p.nombre).includes(normalize(filters.nombre))&&(!filters.tipo||p.tipo===filters.tipo)&&normalize(p.conjunto||'').includes(normalize(filters.conjunto))&&normalize(`${p.identificador} ${p.referencia_catastral} ${p.plaza||''}`).includes(normalize(filters.identificador))&&normalize(`${p.direccion} ${p.direccion_catastral||''}`).includes(normalize(filters.direccion))&&(!filters.cargos||(filters.cargos==='si')===Boolean(p.cargos_vigentes))&&(!filters.estado||String(p.activo)===filters.estado)),[rows,filters]);
 const parkings=useMemo(()=>groupParkings(shown),[shown]);
 const change=(key:keyof typeof filters,value:string)=>setFilters(f=>({...f,[key]:value}));
 return <main className="min-h-screen bg-gray-100 px-6 py-8 text-slate-900 lg:px-12">
  <header className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">Propiedades</h1><p className="mt-2 text-sm text-slate-600">Parkings, vehículos y otros bienes de la empresa, con sus cargos e historial.</p></div><button type="button" className={`${button} bg-blue-950 text-white enabled:hover:bg-blue-900`} disabled={loading||!!error} onClick={()=>setSelected('new')}>Registrar propiedad</button></header>
  <div className="mb-6 grid gap-3 sm:grid-cols-3">{(Object.entries(propertyTypes) as [Property['tipo'],string][]).map(([tipo,label])=><div key={tipo} className="rounded-xl border bg-white px-5 py-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold">{rows.filter(p=>p.activo&&p.tipo===tipo).length}</p></div>)}</div>
  {error&&<p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}<button type="button" className={`${button} ml-3`} onClick={()=>void load()}>Reintentar</button></p>}
  <TableFilters>
   <label className="text-sm">Nombre<input value={filters.nombre} onChange={e=>change('nombre',e.target.value)} className={input}/></label>
   <label className="text-sm">Tipo<select value={filters.tipo} onChange={e=>change('tipo',e.target.value)} className={input}><option value="">Todos</option>{Object.entries(propertyTypes).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
   <label className="text-sm">Parking / conjunto<input value={filters.conjunto} onChange={e=>change('conjunto',e.target.value)} className={input}/></label>
   <label className="text-sm">Identificador / referencia catastral<input value={filters.identificador} onChange={e=>change('identificador',e.target.value)} className={input}/></label>
   <label className="text-sm">Dirección / ubicación<input value={filters.direccion} onChange={e=>change('direccion',e.target.value)} className={input}/></label>
   <label className="text-sm">Cargos vigentes<select value={filters.cargos} onChange={e=>change('cargos',e.target.value)} className={input}><option value="">Todos</option><option value="si">Con cargos</option><option value="no">Sin cargos</option></select></label>
   <label className="text-sm">Estado<select value={filters.estado} onChange={e=>change('estado',e.target.value)} className={input}><option value="">Todos</option><option value="true">Activas</option><option value="false">Archivadas</option></select></label>
  </TableFilters>
  {parkings.length>0&&<section aria-label="Plazas por parking" className="mb-6 grid gap-4 lg:grid-cols-3">{parkings.map(group=><article key={group.nombre} className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">{group.nombre}</h2><p className="mt-1 text-sm text-slate-500">{group.plazas.length} {group.plazas.length===1?'plaza':'plazas'}</p><div className="mt-3 flex flex-wrap gap-2">{group.plazas.map(p=><button type="button" key={p.id_propiedad} title={p.nombre} className={button} onClick={()=>setSelected(p.id_propiedad)}>{p.plaza||p.identificador||p.nombre}</button>)}</div></article>)}</section>}
  <p className="mb-2 text-sm text-slate-500">{shown.length} propiedades</p>
  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm"><SortableTable className="w-full text-left text-sm"><thead className="bg-blue-950 text-white"><tr>{['Nombre','Tipo','Identificador / referencia','Dirección','Cargos vigentes','Estado'].map(label=><th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody>{loading?<tr><td colSpan={6} className="p-8 text-center">Cargando…</td></tr>:!shown.length?<tr><td colSpan={6} className="p-8 text-center text-slate-500">No hay propiedades con estos filtros.</td></tr>:shown.map(p=><tr key={p.id_propiedad} tabIndex={0} aria-label={`Abrir ${p.nombre}`} onClick={()=>setSelected(p.id_propiedad)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(p.id_propiedad);}}} className="cursor-pointer border-t border-slate-100 transition hover:bg-blue-50 focus:bg-blue-50 focus:outline-blue-900"><td className="px-4 py-4 font-medium">{p.nombre}</td><td className="px-4 py-4">{propertyTypes[p.tipo]}</td><td className="px-4 py-4">{p.identificador||'—'}{p.referencia_catastral&&<span className="block text-xs text-slate-500">{p.referencia_catastral}</span>}</td><td className="px-4 py-4">{p.direccion||'—'}</td><td className="px-4 py-4">{p.cargos_vigentes?`${p.cargos_vigentes} asociados`:'Sin cargos'}</td><td className="px-4 py-4">{p.activo?'Activa':'Archivada'}</td></tr>)}</tbody></SortableTable></div>
  {selected&&<PropertyModal key={selected} id={selected} catalog={catalog} onClose={close} onChanged={()=>void load()} onCreated={setSelected}/>}
 </main>;
}
