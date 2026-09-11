'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import RecurringChargeForm, {reviewButton} from '../../RecurringChargeForm';
export default function Page() {
  const {id}=useParams();
  const [original,setOriginal]=useState<any>(null),[value,setValue]=useState<any>(null),[vat,setVat]=useState(true),[error,setError]=useState(''),[saving,setSaving]=useState(false),[saved,setSaved]=useState(false);
  useEffect(()=>{const controller=new AbortController();fetch(`/api/v1/direccion/cargos-recurrentes/${id}`,{cache:'no-store',signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.message);setOriginal(d);setValue(d);setVat(d.programacion.some((p:any)=>Number(p.base_imponible)<Number(p.total_iva)));}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>controller.abort();},[id]);
  async function save() {
    setSaving(true);setError('');setSaved(false);
    try {const r=await fetch(`/api/v1/direccion/cargos-recurrentes/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...value,expectedSchedule:original.programacion,expectedType:original.tipo_programacion,programacion:value.programacion.map((p:any)=>({...p,base_imponible:value.tipo_cargo==='nomina'?0:Math.round(Number(p.total_iva)/(vat?1.21:1)*100)/100}))})});const d=await r.json();if(!r.ok)throw new Error(d.message);setOriginal(d);setValue(d);setSaved(true);}catch(e:any){setError(e.message);}finally{setSaving(false);}
  }
  return <main className="p-6"><Link href="/dashboard/direccion/bancos/prevision-liquidez" className="cursor-pointer rounded p-2 text-blue-900 hover:bg-blue-50">Volver a previsión de liquidez</Link><section className="mt-4 space-y-4 rounded bg-white p-6"><h1 className="text-xl font-semibold">Cargo previsto {id}</h1>{error&&<p role="alert" className="text-red-700">{error}</p>}{value?<><p>{value.tipo_cargo==='nomina'?'Nómina':'Proveedor'} · {value.id_agente||value.id_proveedor} · {value.activo?'Activo':'Inactivo'}</p><RecurringChargeForm value={value} onChange={v=>{setValue(v);setSaved(false);}} payroll={value.tipo_cargo==='nomina'} vat={vat} onVatChange={v=>{setVat(v);setSaved(false);}}/><p>Los nuevos importes se aplican a la previsión. Los movimientos bancarios ya registrados conservan su importe.</p><button className={reviewButton} disabled={saving} onClick={save}>{saving?'Guardando…':'Guardar cambios'}</button>{saved&&<p role="status">Cargo previsto actualizado.</p>}</>:!error&&<p>Cargando…</p>}</section></main>;
}
