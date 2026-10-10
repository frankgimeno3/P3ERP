"use client";
import DateInputRow from "@/app/components/DateInputRow";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import MiddleNav from '@/app/general_components/componentes_recurrentes/MiddleNav';
import JuanPlannedList from '../../tesoreria/JuanPlannedList';
import InternalTransferPlans from '../../tesoreria/InternalTransferPlans';
export default function PrevisionLiquidezPage() {
 const now=new Date();
 const [view,setView]=useState<'ingresos'|'cargos'>('ingresos'),[date,setDate]=useState({d:String(now.getDate()),m:String(now.getMonth()+1),y:String(now.getFullYear())}),[values,setValues]=useState({Sabadell:0,Santander:0,total:0,avisos:[] as string[]}),[revision,setRevision]=useState(0),[error,setError]=useState(''),[calculating,setCalculating]=useState(true);
 useEffect(()=>{const refresh=()=>setRevision(n=>n+1);window.addEventListener('p3:forecast-changed',refresh);if(new URLSearchParams(window.location.search).get('vista')==='cargos')setView('cargos');return()=>window.removeEventListener('p3:forecast-changed',refresh);},[]);
 const fecha=`${date.d.padStart(2,'0')}/${date.m.padStart(2,'0')}/${date.y}`;
 useEffect(()=>{
  if(!date.d||!date.m||date.y.length!==4){setError('Completa la fecha.');setCalculating(false);return;}
  const controller=new AbortController();setError('');setCalculating(true);
  void fetch(`/api/v1/direccion/prevision-liquidez?fecha=${encodeURIComponent(fecha)}`,{signal:controller.signal,cache:'no-store'}).then(async r=>{const body=await r.json();if(!r.ok)throw Error(body.detail||body.message);if(!controller.signal.aborted)setValues(body);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setCalculating(false);});return()=>controller.abort();
 },[fecha,date.d,date.m,date.y,revision]);
 const money=(value:number)=>Number(value||0).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
 return <div className="min-h-screen bg-gray-100 text-slate-900"><MiddleNav tituloprincipal="Previsión liquidez"/><main className="p-6 lg:p-12"><section className="rounded-xl bg-white p-6 shadow">
  <h1 className="text-xl font-semibold text-blue-950">Previsión de liquidez</h1>
  <Link href="/dashboard/direccion/tesoreria/prevision-liquidez/vista-juan" className="mt-4 inline-block cursor-pointer rounded bg-blue-950 px-4 py-2 text-white transition hover:bg-blue-800">Vista Juan · Desglose por celda</Link>
  <p className="mt-3 text-sm">La tabla y Vista Juan muestran la misma previsión. Los cambios propios actualizan importes y totales al guardar; los cambios de otras pantallas se ven al recargar.</p>
  <div className="mt-6 grid gap-4 md:grid-cols-4"><div><p className="mb-2 text-sm font-medium">Mes de la previsión</p><DateInputRow className="flex gap-1">{(['d','m','y'] as const).map(key=><input key={key} aria-label={key==='d'?'dd':key==='m'?'mm':'yyyy'} maxLength={key==='y'?4:2} value={date[key]} onChange={e=>setDate({...date,[key]:e.target.value.replace(/\D/g,'')})} className="min-w-0 flex-1 rounded border border-slate-300 bg-white p-2" placeholder={key==='d'?'dd':key==='m'?'mm':'yyyy'}/>)}</DateInputRow><p className="mt-2 text-xs text-slate-600">Resumen al cierre del mes elegido.</p></div>{[['Banco Sabadell',values.Sabadell],['Banco Santander',values.Santander],['Total',values.total]].map(([label,value])=><div key={String(label)} className="rounded border border-blue-100 bg-blue-50 p-4"><p className="text-sm text-slate-600">{label}</p><p className="mt-2 text-xl font-semibold text-blue-950">{calculating||error?'—':money(Number(value))}</p></div>)}</div>
  {error&&<p role="alert" className="mt-4 text-red-700">{error}</p>}{!calculating&&!error&&values.avisos?.map(message=><p key={message} className="mt-3 rounded bg-amber-50 p-3 text-sm">{message}</p>)}
 </section><div className="mt-6 flex flex-wrap items-center gap-2 border-b border-slate-300 bg-white px-4 pt-2 shadow-sm">{(['ingresos','cargos'] as const).map(tab=><button key={tab} type="button" onClick={()=>setView(tab)} className={`cursor-pointer border-b-2 px-6 py-3 font-semibold transition hover:bg-blue-50 ${view===tab?'border-blue-950 text-blue-950':'border-transparent text-slate-600'}`}>Previsión de {tab}</button>)}<Link href="/dashboard/administracion/liquidaciones/tarjetas" className="mb-2 ml-auto cursor-pointer rounded bg-blue-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-900">Previsiones tarjetas</Link></div>
 <JuanPlannedList section={view==='ingresos'?'income':'payments'} revision={revision} year={Number(date.y)}/>
 <InternalTransferPlans revision={revision}/>
 </main></div>;
}
