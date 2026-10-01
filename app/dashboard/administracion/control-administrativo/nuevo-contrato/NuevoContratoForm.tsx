"use client";
import { Fragment, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MiddleNav from '@/app/general_components/componentes_recurrentes/MiddleNav';
import SearchableSelect from '@/app/components/SearchableSelect';
import DatePartsInput from '@/app/components/DatePartsInput';
import { CuentaService } from '@/app/service/CuentaService';
import { AgenteService } from '@/app/service/AgenteService';
import { ContactoService } from '@/app/service/ContactoService';
import ServicePickerModal from '@/app/components/ServicePickerModal';
import {ProposalLineRow,type Linea} from '@/app/components/ProposalServices';
import {serviceLineBase} from '@/app/config/serviceLine';
import apiClient from '@/app/apiClient';
import {addCalendarMonths} from '@/app/config/paymentDates';

const button='rounded px-4 py-2 transition enabled:cursor-pointer enabled:hover:bg-blue-100 disabled:opacity-50 disabled:cursor-default border';
const input='w-full rounded border p-2';
const steps=['Cuenta y contrato','Servicios','Órdenes de cobro','Revisión'];
const newPayment=(previous='',bank='Sabadell')=>({fecha_cobro:addCalendarMonths(previous,previous?1:2),importe_cobro:0,forma_cobro:'transferencia',banco_cobro:bank});

export default function NuevoContratoPage({commercial=false}:{commercial?:boolean}) {
  const router=useRouter(),[phase,setPhase]=useState(0),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [accounts,setAccounts]=useState<any[]>([]),[agents,setAgents]=useState<any[]>([]),[contacts,setContacts]=useState<any[]>([]);
  const [data,setData]=useState({id_cuenta_contrato:'',id_agente_contrato:'',id_contacto_contrato:'',nombre_contrato:'',fecha_firma_contrato:'',fecha_fin_contrato:'',comentarios_adicionales:'',es_intercambio:false,condiciones_intercambio:''});
  const [insertAt,setInsertAt]=useState<number|null>(null),[vat,setVat]=useState(21);
  const [lines,setLines]=useState<(Linea & {iva_porcentaje:number})[]>([]),[payments,setPayments]=useState([newPayment()]);
  const selectedAccount=accounts.find(account=>account.id_cuenta===data.id_cuenta_contrato);
  const defaultBank=/^(es|espana|españa|spain)$/i.test(String(selectedAccount?.pais_cuenta||selectedAccount?.pais_facturacion||'').trim())?'Santander':'Sabadell';
  useEffect(()=>{if(!data.id_cuenta_contrato)return;setPayments(rows=>rows.map((row,index)=>index===0?{...row,banco_cobro:defaultBank}:row));},[data.id_cuenta_contrato,defaultBank]);
  const bases=lines.map(line=>Math.round(serviceLineBase(line)*100)/100);
  const total=lines.reduce((sum,line,index)=>sum+Math.round(bases[index]*(1+Number(line.iva_porcentaje)/100)*100),0)/100;
  const paidTotal=payments.reduce((sum,payment)=>sum+Math.round(Number(payment.importe_cobro)*100),0)/100;
  useEffect(()=>{let active=true;Promise.all([CuentaService.getCuentas(),AgenteService.getAgentes(),ContactoService.getContactos()]).then(([a,b,c])=>{if(active){setAccounts(a);setAgents(b);setContacts(c);}}).catch(e=>{if(active)setError(e?.message || 'No se pudieron cargar las opciones.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
  const next=()=>{
    setError('');
    if(phase===0&&(!data.id_cuenta_contrato||!data.nombre_contrato.trim())){setError('Selecciona una cuenta e indica el nombre del contrato.');return;}
    if(phase===1&&(total<=0||lines.some(line=>!line.producto.trim()||Number(line.unidades)<=0||Number(line.precio_unitario)<0))){setError('Completa los servicios con importes válidos.');return;}
    if(phase===2&&data.es_intercambio&&!data.condiciones_intercambio.trim()){setError('Describe las condiciones del intercambio.');return;}
    if(phase===2&&!data.es_intercambio&&(Math.round(paidTotal*100)!==Math.round(total*100)||payments.some(payment=>!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(payment.fecha_cobro)||Number(payment.importe_cobro)<=0))){setError('Completa las fechas e importes: la suma de órdenes debe coincidir con el total.');return;}
    setPhase(phase+1);
  };
  const create=async()=>{setBusy(true);setError('');try{const response=await apiClient.post(commercial?'/api/v1/comercial/contratos/crear':'/api/v1/admin/control-administrativo/contratos',{...data,lineas:lines,cobros:data.es_intercambio?[]:payments});router.push(`/dashboard/comercial/contratos/${encodeURIComponent(response.data.id_contrato)}`);}catch(e:any){setError(e?.response?.data?.message||e?.message || 'No se pudo crear el contrato.');setBusy(false);}};
  return <div className="min-h-screen bg-gray-100 text-gray-700"><MiddleNav tituloprincipal="Nuevo contrato independiente"/><main className="mx-auto max-w-6xl space-y-5 p-6">
    <Link href={commercial?'/dashboard/comercial/contratos':'/dashboard/administracion/control-administrativo'} className="inline-block cursor-pointer text-blue-900 hover:underline">{commercial?'Volver a Contratos':'Volver a Órdenes'}</Link>
    <ol className="grid grid-cols-2 gap-2 md:grid-cols-4">{steps.map((step,index)=><li key={step} aria-current={phase===index?'step':undefined} className={`rounded p-3 ${phase===index?'bg-blue-950 text-white':'bg-white'}`}>{index+1}. {step}</li>)}</ol>
    {error&&<p role="alert" className="rounded bg-red-50 p-3 text-red-700">{error}</p>}
    <section className="space-y-4 rounded bg-white p-6">
      {phase===0&&<><h2 className="text-xl font-semibold">Cuenta y contrato</h2><div className="grid gap-4 md:grid-cols-2">
        <div><p>Cuenta *</p><SearchableSelect label="Cuenta" value={data.id_cuenta_contrato} required disabled={loading} options={accounts.map(account=>({value:account.id_cuenta,label:account.nombre_empresa+' · '+account.id_cuenta}))} onChange={value=>setData({...data,id_cuenta_contrato:value,id_contacto_contrato:'',id_agente_contrato:accounts.find(account=>account.id_cuenta===value)?.id_agente || ''})}/></div>
        <label>Nombre del contrato *<input value={data.nombre_contrato} onChange={e=>setData({...data,nombre_contrato:e.target.value})} className={input}/></label>
        <div><p>Agente</p><SearchableSelect label="Agente" value={data.id_agente_contrato} options={agents.map(agent=>({value:agent.id_agente,label:agent.nombre_completo_agente || agent.id_agente}))} onChange={value=>setData({...data,id_agente_contrato:value})}/></div>
        <div><p>Contacto</p><SearchableSelect label="Contacto" value={data.id_contacto_contrato} options={contacts.filter(contact=>contact.id_cuenta===data.id_cuenta_contrato).map(contact=>({value:contact.id_contacto,label:contact.nombre_completo_contacto || contact.id_contacto}))} onChange={value=>setData({...data,id_contacto_contrato:value})}/></div>
        <DatePartsInput label="Fecha de firma" value={data.fecha_firma_contrato} onChange={value=>setData({...data,fecha_firma_contrato:value})}/><DatePartsInput label="Fecha fin (opcional)" value={data.fecha_fin_contrato} onChange={value=>setData({...data,fecha_fin_contrato:value})}/>
        <label className="md:col-span-2">Comentarios<textarea className={input} value={data.comentarios_adicionales} onChange={e=>setData({...data,comentarios_adicionales:e.target.value})}/></label>
      </div></>}
      {phase===1&&<><h2 className="text-xl font-semibold">Servicios del contrato · EUR</h2><div className="overflow-x-auto rounded-lg"><table className="min-w-[900px] w-full text-xs"><thead className="bg-slate-700 text-white"><tr>{['','Servicio','Descripción','Especificaciones','Unidades','Precio unitario','Descuento','Total servicio','Acciones'].map((label,i)=><th key={i} className="p-2">{label}</th>)}</tr></thead><tbody><tr className="bg-slate-300"><td colSpan={9} className="p-3 text-center"><button type="button" onClick={()=>setInsertAt(0)} className="cursor-pointer rounded bg-blue-50 px-4 py-2 font-medium text-blue-950 hover:bg-blue-100">+ Agregar servicio aquí</button></td></tr>{lines.map((line,index)=><Fragment key={index}><ProposalLineRow linea={line} index={index} total={bases[index]} moneda="€" onPatch={patch=>setLines(rows=>rows.map((row,i)=>i===index?{...row,...patch}:row))} onRemove={()=>setLines(rows=>rows.filter((_,i)=>i!==index))}/><tr className="bg-slate-300"><td colSpan={9} className="p-3 text-center"><button type="button" onClick={()=>setInsertAt(index+1)} className="cursor-pointer rounded bg-blue-50 px-4 py-2 font-medium text-blue-950 hover:bg-blue-100">+ Agregar servicio aquí</button></td></tr></Fragment>)}</tbody></table></div><label className="block">IVA del contrato<select className="ml-3 cursor-pointer rounded border p-2 hover:border-blue-950" value={vat} onChange={e=>{const rate=Number(e.target.value);setVat(rate);setLines(rows=>rows.map(row=>({...row,iva_porcentaje:rate})));}}>{[0,4,10,21].map(rate=><option key={rate} value={rate}>{rate}%</option>)}</select></label>{insertAt!==null&&<ServicePickerModal onClose={()=>setInsertAt(null)} onConfirm={line=>{setLines(rows=>[...rows.slice(0,insertAt),{...line,iva_porcentaje:vat},...rows.slice(insertAt)]);setInsertAt(null);}}/>}</>}
      {phase===2&&<><label className="flex cursor-pointer gap-2 rounded p-3 hover:bg-blue-50"><input type="checkbox" className="cursor-pointer" checked={data.es_intercambio} onChange={e=>setData({...data,es_intercambio:e.target.checked})}/>Intercambio sin cobro monetario</label>{data.es_intercambio?<label className="block">Condiciones del intercambio<textarea className={input} value={data.condiciones_intercambio} onChange={e=>setData({...data,condiciones_intercambio:e.target.value})}/><span>Valor ofrecido: {total.toFixed(2)} EUR. Cobro monetario: 0 EUR. No se crean órdenes de cobro, recibos ni facturas automáticas.</span></label>:<><h2 className="text-lg font-semibold">Órdenes de cobro</h2>{payments.map((payment,index)=><div key={index} className="grid gap-3 rounded border p-3 text-xs md:grid-cols-4 [&_legend]:text-xs [&_input]:text-xs [&_select]:text-xs">
        <DatePartsInput label={`Fecha del cobro ${index+1}`} value={payment.fecha_cobro} onChange={value=>setPayments(payments.map((row,i)=>i===index?{...row,fecha_cobro:value}:row))}/>
        <label>Importe EUR<input type="number" step="0.01" min="0" className={input} value={payment.importe_cobro} onChange={e=>setPayments(payments.map((row,i)=>i===index?{...row,importe_cobro:Number(e.target.value)}:row))}/></label>
        <label>Forma de cobro<select className={`${input} cursor-pointer hover:border-blue-900`} value={payment.forma_cobro} onChange={e=>setPayments(payments.map((row,i)=>i===index?{...row,forma_cobro:e.target.value}:row))}>{['transferencia','recibo','tarjeta','efectivo','pagaré'].map(method=><option key={method}>{method}</option>)}</select></label>
        <label>Banco<select className={`${input} cursor-pointer hover:border-blue-900`} value={payment.banco_cobro} onChange={e=>setPayments(payments.map((row,i)=>i===index?{...row,banco_cobro:e.target.value}:row))}><option>Sabadell</option><option>Santander</option></select></label>
        <button type="button" className={button} disabled={payments.length===1} onClick={()=>setPayments(payments.filter((_,i)=>i!==index))}>Quitar cobro</button>
      </div>)}<button type="button" className={button} disabled={payments.length>=200} onClick={()=>setPayments([...payments,newPayment(payments.at(-1)?.fecha_cobro,defaultBank)])}>Añadir cobro</button><p>Órdenes: {paidTotal.toFixed(2)} EUR · Diferencia: {(total-paidTotal).toFixed(2)} EUR</p></>}</>}
      {phase===3&&<><h2 className="text-xl font-semibold">Revisión final</h2><p>{data.nombre_contrato} · {accounts.find(account=>account.id_cuenta===data.id_cuenta_contrato)?.nombre_empresa}</p>{data.es_intercambio?<p>Intercambio: {data.condiciones_intercambio}. Valor ofrecido: {total.toFixed(2)} EUR; sin cobros monetarios, recibos ni factura automática.</p>:<><p>{lines.length} servicios y {payments.length} órdenes de cobro. Moneda EUR.</p><ul>{payments.map((payment,index)=><li key={index}>Cobro {index+1}: {payment.importe_cobro.toFixed(2)} EUR · {payment.fecha_cobro} · {payment.forma_cobro} · {payment.banco_cobro}</li>)}</ul><p>{commercial ? "Se creará el contrato sin propuesta, con órdenes, recibos y contenidos de producción. La factura se creará por separado cuando lo solicites." : "Se creará el contrato sin propuesta ni factura asociada. Las órdenes quedarán en Control administrativo y los recibos y transferencias pendientes en previsiones."}</p></>}</>}
      <p className="font-semibold">Base: {bases.reduce((sum,value)=>sum+value,0).toFixed(2)} EUR · Total: {total.toFixed(2)} EUR</p>
      <div className="flex justify-between gap-3"><button type="button" className={button} disabled={phase===0||busy} onClick={()=>{setError('');setPhase(phase-1);}}>Anterior</button>{phase<3?<button type="button" className={button} disabled={loading||busy} onClick={next}>Continuar</button>:<button type="button" className={button} disabled={busy} onClick={create}>{busy?'Creando…':'Crear contrato'}</button>}</div>
    </section>
  </main></div>;
}
