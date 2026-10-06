'use client';
import { matchesTableFilter } from "@/app/lib/dateFilters";
import TableFilters from '@/app/components/TableFilters';
import { useEffect, useState, type ReactNode } from 'react';
import DatePartsInput from '@/app/components/DatePartsInput';
import TableColumnFilter from '@/app/components/TableColumnFilter';

export const button='rounded border border-gray-300 bg-white px-4 py-2 text-sm text-blue-950 enabled:cursor-pointer enabled:hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50';
export const input='w-full rounded border border-gray-300 bg-white p-2 disabled:bg-gray-100';
export const money=(n:any)=>Number(n||0).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
export const date=(s:any)=>String(s||'').slice(0,10).split('-').reverse().join('/');
export const iso=(s:string)=>s.includes('/')?s.split('/').reverse().map((v,i)=>i?v.padStart(2,'0'):v).join('-'):s.slice(0,10);
export async function api(url:string,body?:any,method='POST') {
  const r=await fetch(url,body===undefined?{cache:'no-store'}:{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const d=await r.json();if(!r.ok)throw new Error(d.message||'No se pudo completar la operación.');return d;
}
export function CardTable({columns,rows}:{columns:{key:string;label:string;render?:(row:any)=>ReactNode}[];rows:any[]}) {
  const [filters,setFilters]=useState<Record<string,string>>({});
  const shown=rows.filter(row=>columns.every(c=>matchesTableFilter(row[c.key], filters[c.key]||'')));
  return <div className="overflow-x-auto rounded border border-gray-200"><TableFilters>{columns.map(c=><div key={c.key}><TableColumnFilter label={c.label} value={filters[c.key]||''} onChange={v=>setFilters(f=>({...f,[c.key]:v}))}/></div>)}</TableFilters><table className="w-full text-left text-sm"><thead className="bg-gray-50"><tr>{columns.map(c=><th key={c.key} className="p-3">{c.label}</th>)}</tr></thead><tbody>{shown.map((row,i)=><tr key={row.id||row.id_ticket||row.id_tarjeta||i} className="border-t">{columns.map(c=><td key={c.key} className="p-3">{c.render?c.render(row):row[c.key]}</td>)}</tr>)}{!shown.length&&<tr><td colSpan={columns.length} className="p-5 text-gray-500">No hay registros.</td></tr>}</tbody></table></div>;
}
export function ForecastItems({items}:{items:any[]}) {
  return <CardTable rows={items.map(i=>({...i,fecha:date(i.fecha),importe:money(i.importe)}))} columns={[{key:'tipo',label:'Tipo'},{key:'descripcion',label:'Concepto'},{key:'fecha',label:'Fecha'},{key:'importe',label:'Importe'}]}/>;
}
export function CardEditor({card,close,done}:{card?:any;close:()=>void;done:(card:any)=>void}) {
  const [form,setForm]=useState<any>(()=>({codigo:'',nombre:'',ultimos_digitos:'',banco:'Sabadell',tipo:'p3',estado:'activa',descripcion:'',periodicidad_meses:1,inicio_periodo:'',proximo_cierre:'',proxima_liquidacion:'',...card}));
  const [error,setError]=useState(''),[saving,setSaving]=useState(false);
  useEffect(()=>{const fn=(e:KeyboardEvent)=>{if(e.key==='Escape')close();};window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn);},[close]);
  const change=(key:string,value:any)=>setForm((f:any)=>({...f,[key]:value}));
  const save=async(e:React.FormEvent)=>{e.preventDefault();if(saving)return;setSaving(true);setError('');try{
    const body=Object.fromEntries(['codigo','nombre','ultimos_digitos','banco','tipo','estado','descripcion','periodicidad_meses'].map(k=>[k,form[k]]));
    for(const key of ['inicio_periodo','proximo_cierre','proxima_liquidacion']){body[key]=iso(form[key]);if(!body[key])throw new Error('Completa las tres fechas del calendario.');}
    if(card)body.expectedVersion=card.updated_at;
    done(await api(`/api/v1/admin/tarjetas${card?'/'+encodeURIComponent(card.id_tarjeta):''}`,body,card?'PUT':'POST'));
  }catch(e:any){setError(e.message);}finally{setSaving(false);}};
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4"><section role="dialog" aria-modal="true" aria-label="Datos de tarjeta" className="mx-auto my-6 max-w-3xl rounded bg-white p-6 text-slate-900"><header className="mb-5 flex justify-between"><h2 className="text-xl font-semibold">{card?'Editar tarjeta':'Nueva tarjeta'}</h2><button type="button" aria-label="Cerrar" onClick={close} className={`${button} text-xl`}>×</button></header><form onSubmit={save} className="space-y-4"><fieldset disabled={saving} className="grid gap-4 md:grid-cols-2">
    {['codigo','nombre','ultimos_digitos'].map((key,i)=><label key={key}>{['Código','Nombre','Últimos cuatro dígitos'][i]}<input required maxLength={key==='ultimos_digitos'?4:200} pattern={key==='ultimos_digitos'?'[0-9]{4}':undefined} className={input} value={form[key]} onChange={e=>change(key,e.target.value)}/></label>)}
    <label>Banco<select className={`${input} cursor-pointer hover:border-blue-950`} value={form.banco} onChange={e=>change('banco',e.target.value)}><option>Sabadell</option><option>Santander</option></select></label>
    <label>Tipo<select className={`${input} cursor-pointer hover:border-blue-950`} value={form.tipo} onChange={e=>change('tipo',e.target.value)}><option value="p3">P3</option><option value="personal">Personal</option></select></label>
    <label>Estado<select className={`${input} cursor-pointer hover:border-blue-950`} value={form.estado} onChange={e=>change('estado',e.target.value)}><option value="activa">Activa</option><option value="obsoleta">Obsoleta</option></select></label>
    <label>Cada cuántos meses se liquida<input required type="number" min="1" max="12" className={input} value={form.periodicidad_meses} onChange={e=>change('periodicidad_meses',Number(e.target.value))}/></label>
    {[['inicio_periodo','Inicio del período abierto'],['proximo_cierre','Próximo cierre'],['proxima_liquidacion','Próximo cargo en banco']].map(([key,label])=><DatePartsInput key={key} label={label} value={form[key]} onChange={v=>change(key,v)}/>)}
    <label className="md:col-span-2">Descripción<textarea className={input} value={form.descripcion} onChange={e=>change('descripcion',e.target.value)}/></label>
    </fieldset><p className="text-sm text-gray-600">El cierre incluye los consumos hasta ese día. La liquidación es la fecha prevista de salida del banco. Los ciclos siguientes conservan esos días; en meses más cortos se usa el último día.</p>{error&&<p role="alert" className="text-red-700">{error}</p>}<button disabled={saving} className={button}>{saving?'Guardando…':'Guardar tarjeta'}</button></form></section></div>;
}
