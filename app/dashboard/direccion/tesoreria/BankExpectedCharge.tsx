'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import BankReviewWizard from './BankReviewWizard';
import { reviewButton } from './RecurringChargeForm';

export default function BankExpectedCharge({line,onSaved}:{line:any;onSaved:()=>void}) {
  const [charge,setCharge]=useState<any>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[starting,setStarting]=useState(false);
  const [selection,setSelection]=useState<{line:any;all:any[]}|null>(null);
  useEffect(()=>{
    const controller=new AbortController();setCharge(null);setError('');
    if(!line.id_cargo_recurrente){setLoading(false);return;}
    setLoading(true);
    fetch(`/api/v1/direccion/cargos-recurrentes/${line.id_cargo_recurrente}`,{cache:'no-store',signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.message||'No se pudo cargar el cargo previsto.');setCharge(d);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[line.id_cargo_recurrente,line.updated_at]);
  async function start(){
    setStarting(true);setError('');
    try{const r=await fetch('/api/v1/direccion/bancos',{cache:'no-store'});const all=await r.json();if(!r.ok||!Array.isArray(all))throw new Error(all.message||'No se pudieron cargar los movimientos.');const current=all.find((l:any)=>l.id_linea_banco===line.id_linea_banco);if(!current)throw new Error('Movimiento no encontrado.');setSelection({line:current,all});}
    catch(e:any){setError(e.message);}finally{setStarting(false);}
  }
  return <section className="mt-5 space-y-3 rounded-lg bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">Cargo previsto</h2>
    {line.id_cargo_recurrente?<><p>Este movimiento tiene asociado el cargo previsto {line.id_cargo_recurrente}.</p>{loading&&<p>Cargando cargo previsto…</p>}{charge&&<><p>{charge.tipo_cargo==='nomina'?'Nómina':'Proveedor'} · {charge.activo?'Activo':'Inactivo'}</p>{charge.programacion.map((r:any,i:number)=><p key={i}>{r.descripcion||'Cargo previsto'} · {Number(r.total_iva).toLocaleString('es-ES',{style:'currency',currency:'EUR'})} · {charge.tipo_programacion==='fechas'?`${r.dia}/${r.mes}/${r.anio||'Cada año'}`:`Cada ${r.cada} ${r.unidad}`}</p>)}</>}<Link className="inline-block cursor-pointer rounded p-2 text-blue-900 hover:bg-blue-50 hover:underline" href={`/dashboard/direccion/tesoreria/cargos-recurrentes/${line.id_cargo_recurrente}`}>Ver o modificar cargo previsto</Link></>:<><p>No hay ningún cargo previsto asociado.</p>{Number(line.importe)<0?<>{!line.id_proveedor&&!line.id_agente&&<p>Selecciona primero un proveedor o empleado en el asistente; después podrás asociar un cargo existente o crear uno.</p>}<button type="button" className={reviewButton} disabled={starting} onClick={start}>{starting?'Cargando…':'Asociar o crear cargo previsto'}</button></>:<p>Los ingresos no admiten cargos previstos.</p>}</>}
    {error&&<p role="alert" className="text-red-700">{error}</p>}
    {selection&&<BankReviewWizard lines={[selection.line]} all={selection.all} mode={selection.line.id_proveedor||selection.line.id_agente?'charge':'assign'} modal onClose={()=>setSelection(null)} onSaved={()=>{setSelection(null);onSaved();}}/>}
  </section>;
}
